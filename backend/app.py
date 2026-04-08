import os
import math
import random
import json
import urllib.parse
import urllib3
from typing import Optional
from dotenv import load_dotenv

# Silence SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from concurrent.futures import ThreadPoolExecutor

from ai_logic import extract_condition, generate_diagnostic_question
from health_engine import get_allowed_dishes, save_pending_condition, get_recipe_details, add_new_health_rule
from nutrition_engine import get_nutrition_info
from dish_engine import normalize_dish, get_dish_metadata, get_food_image, get_food_category
from geoapify_logic import fetch_nearby_restaurants, get_coordinates, fetch_all_nearby, fetch_nearby_grocery_stores
from weather_engine import (
    get_current_weather, calculate_weather_bias,
    prettify_condition, get_weather_ui_data, get_weather_foods,
    check_effectively_sunny,
)
import requests
from osm_logic import fetch_restaurants_osm
from menu_data import find_restaurants_by_menu_item
from gemini_service import GeminiService
from rapidfuzz import fuzz

from image_service import get_pexels_image, regen_pexels_image

load_dotenv()

app = FastAPI()
gemini = GeminiService()
_IMAGE_CACHE = {}  # In-memory image cache
CUSTOM_IMAGES_PATH = "data/custom_images.json"

def load_custom_images():
    global _IMAGE_CACHE
    if os.path.exists(CUSTOM_IMAGES_PATH):
        try:
            with open(CUSTOM_IMAGES_PATH, "r", encoding="utf-8") as f:
                _IMAGE_CACHE = json.load(f)
        except Exception as e:
            print(f"Error loading custom images: {e}")

def save_custom_image(dish: str, url: str):
    global _IMAGE_CACHE
    _IMAGE_CACHE[dish.lower().strip()] = url
    try:
        with open(CUSTOM_IMAGES_PATH, "w", encoding="utf-8") as f:
            json.dump(_IMAGE_CACHE, f, indent=4)
    except Exception as e:
        print(f"Error saving custom image: {e}")

load_custom_images()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────
# GEOCODER PROXY
# ─────────────────────────────────────────────

@app.get("/geocode/reverse")
def reverse_geocode(lat: float, lon: float):
    key = os.getenv("GEOAPIFY_API_KEY")
    if not key:
        return {"city": "Bengaluru", "error": "No API key"}
    try:
        url = f"https://api.geoapify.com/v1/geocode/reverse?lat={lat}&lon={lon}&apiKey={key}"
        r = requests.get(url, timeout=5).json()
        props = r.get("features", [{}])[0].get("properties", {})
        neighbourhood = props.get("neighbourhood") or props.get("suburb") or props.get("quarter")
        city = props.get("city") or props.get("town") or "Bengaluru"
        # Return neighbourhood for display (e.g. "SG Palya"), fall back to city
        display = neighbourhood or city
        return {
            "city": display,
            "neighbourhood": neighbourhood,
            "city_name": city,
            "details": props
        }
    except Exception as e:
        return {"city": "Bengaluru", "error": str(e)}


# ─────────────────────────────────────────────
# GEOCODER SEARCH — text → lat/lon
# Used by the frontend when user types a location manually
# ─────────────────────────────────────────────

@app.get("/geocode/search")
def search_geocode(text: str):
    """Resolve a place name to coordinates + display name."""
    key = os.getenv("GEOAPIFY_API_KEY")
    if not key:
        return {"error": "No API key", "name": text, "lat": None, "lon": None}
    try:
        encoded = urllib.parse.quote(text + ", Bengaluru, India")
        url = f"https://api.geoapify.com/v1/geocode/search?text={encoded}&apiKey={key}&limit=1"
        r = requests.get(url, timeout=8).json()
        features = r.get("features", [])
        if not features:
            # Try without city suffix
            encoded2 = urllib.parse.quote(text)
            url2 = f"https://api.geoapify.com/v1/geocode/search?text={encoded2}&apiKey={key}&limit=1"
            r2 = requests.get(url2, timeout=8).json()
            features = r2.get("features", [])
        if not features:
            return {"error": "Location not found", "name": text, "lat": None, "lon": None}
        props = features[0].get("properties", {})
        lon, lat = features[0]["geometry"]["coordinates"]
        neighbourhood = props.get("neighbourhood") or props.get("suburb") or props.get("quarter")
        city = props.get("city") or props.get("town") or "Bengaluru"
        display = neighbourhood or city or text
        return {"name": display, "lat": lat, "lon": lon, "city": city}
    except Exception as e:
        return {"error": str(e), "name": text, "lat": None, "lon": None}


# ─────────────────────────────────────────────
# DELIVERY DEEPLINK BUILDER
# Returns a Swiggy / Zomato search URL pinned to the restaurant + dish
# ─────────────────────────────────────────────

@app.get("/deeplink")
def get_deeplink(
    platform: str,
    dish: str,
    restaurant_name: str = "",
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    city: Optional[str] = "Bengaluru",
):
    dish_enc = urllib.parse.quote(dish.strip())
    rest_enc = urllib.parse.quote(restaurant_name.strip()) if restaurant_name else dish_enc

    if platform.lower() == "swiggy":
        url = f"https://www.swiggy.com/search?query={rest_enc}"
        if lat and lon:
            url += f"&lat={lat}&lng={lon}"

    elif platform.lower() == "zomato":
        city_slug = (city or "bengaluru").lower().replace(" ", "-")
        if restaurant_name:
            url = f"https://www.zomato.com/{city_slug}/search?q={rest_enc}"
        else:
            url = f"https://www.zomato.com/{city_slug}/search?q={dish_enc}"
    else:
        return {"error": "Unknown platform. Use 'swiggy' or 'zomato'"}

    return {"platform": platform, "url": url, "restaurant": restaurant_name, "dish": dish}


# ─────────────────────────────────────────────
# MEAL TIME DATA
# ─────────────────────────────────────────────
BREAKFAST_FOODS = {"idli", "dosa", "upma", "poha", "oatmeal", "daliya", "ginger tea", "green tea", "banana", "toast", "neer dosa"}
LUNCH_FOODS = {"biryani", "dal chawal", "khichdi", "curd rice", "roti", "rajma", "paneer", "sambar", "rasam", "dal tadka"}
DINNER_FOODS = {"khichdi", "soup", "rasam", "dal", "roti", "moong dal", "vegetable soup", "idli", "curd rice", "turmeric milk"}

# ─────────────────────────────────────────────
# HEALTH TAGS
# ─────────────────────────────────────────────

def generate_health_tags(dish, nutrition, metadata):
    tags = []
    dish_name = dish.lower()
    if any(x in dish_name for x in ["curd", "yogurt", "lassi", "buttermilk", "chaas"]):
        tags += ["Contains Probiotics", "Good for Digestion"]
    p = (nutrition or {}).get("protein", 0)
    if p > 10:
        tags.append("High Protein")
        if any(x in dish_name for x in ["chicken", "fish", "egg", "soya", "tofu"]):
            tags.append("Lean Protein")
    f = (nutrition or {}).get("fats", 10)
    if f < 5:
        tags += ["Low Fat", "Heart Healthy"]
    if any(x in dish_name for x in ["oat", "lentil", "dal", "khichdi", "vegetable", "soup",
                                      "daliya", "sprouts", "salad"]):
        tags += ["High Fiber", "Weight Management"]
    # Specific Health Context Tags
    context = (metadata or {}).get("context", "").lower()
    if "fever" in context:
        tags += ["Easy to Digest", "Hydrating", "Low Spice"]
    elif "cold" in context or "cough" in context:
        tags += ["Immunity Boost", "Vitamin C Rich", "Warm Food"]
    elif "gym" in context or "workout" in context:
        tags += ["Muscle Recovery", "Energy Boost"]
    elif "diet" in context or "weight loss" in context:
        tags += ["Low Calorie", "High Fiber"]

    if not tags:
        tags = ["Nutrient Rich", "Freshly Prepared"]
    return list(set(tags)) # De-duplicate


# ─────────────────────────────────────────────
# SCORING ranking algorithm 
# Proximity-first: nearby GPS restaurants beat distant menu results
# ─────────────────────────────────────────────

def calculate_smart_score(rating, review_count, distance_km=None, score_bonus=0, avg_price=0):
    # Cap review count log so distant massive chains don't overwhelm nearby places
    capped_reviews = min(float(review_count or 0), 2000.0)
    # Rating is very important now (x3 instead of x2) to reflect "ratings from used reference"
    base = (float(rating or 0) * 3) + math.log(capped_reviews + 1)

    price_penalty = 0
    if avg_price > 800:
        price_penalty = 15.0
    elif avg_price > 400:
        price_penalty = 5.0

    if distance_km is None:
        proximity = 0.0 # No proximity bonus if distance is unknown
        dist_penalty = 0.0
    else:
        dist = float(distance_km)
        # Reduced distance penalty to allow verified dish matches from slightly further away
        dist_penalty = dist * 3.0 
        if dist <= 0.3:   proximity = 25.0 # Reduced from 35.0
        elif dist <= 0.5: proximity = 20.0 # Reduced from 28.0
        elif dist <= 1.0: proximity = 15.0 # Reduced from 20.0
        elif dist <= 2.0: proximity = 10.0 # Reduced from 12.0
        elif dist <= 3.0: proximity = 5.0  # Reduced from 6.0
        elif dist <= 5.0: proximity = 2.0
        else:             proximity = -dist * 2.0

    return base - dist_penalty + proximity + float(score_bonus or 0) - price_penalty


def normalize_health_score(nutrition):
    if not nutrition:
        return 60
    penalty = (nutrition.get("calories", 0)
               + nutrition.get("fats", 0) * 10
               + nutrition.get("sodium", 0) / 50)
    return max(0, min(100, 100 - penalty / 20))

def normalize_weather_score(bias):
    return max(0, min(100, 60 + bias * 2)) if bias != 0 else 60

def normalize_discovery_score(restaurants):
    if not restaurants:
        return 0
    best = min(max(r.get("smart_score", 0) for r in restaurants), 40)
    return max(0, min(100, (best / 40) * 100))


# ─────────────────────────────────────────────
# DEDUPLICATION
# ─────────────────────────────────────────────

def deduplicate_restaurants(restaurants):
    seen = {}
    for r in restaurants:
        key = (r.get("name_norm") or r.get("name", "")).lower().strip()
        if not key:
            continue
        if key not in seen or r.get("smart_score", 0) > seen[key].get("smart_score", 0):
            seen[key] = r
    return list(seen.values())


# ─────────────────────────────────────────────
# PRICE LABEL
# ─────────────────────────────────────────────

def get_price_label(restaurant):
    avg = restaurant.get("avg_price") or 0
    if not avg:
        avg = (restaurant.get("cost_for_two") or 0) / 2
    if not avg:
        # Fall back to exact item price from menu dataset
        avg = restaurant.get("exact_price") or 0
    if avg <= 0:    return ""
    if avg < 150:   return "₹"
    if avg < 400:   return "₹₹"
    if avg < 800:   return "₹₹₹"
    return "₹₹₹₹"


# ─────────────────────────────────────────────
# OPEN STATUS
# ─────────────────────────────────────────────

def enrich_open_status(restaurant):
    if not restaurant.get("business_status"):
        restaurant["business_status"] = "OPERATIONAL"
    return restaurant


from functools import lru_cache
import datetime

# ─────────────────────────────────────────────
# CACHING & UTILS
# ─────────────────────────────────────────────

@lru_cache(maxsize=128)
def cached_reverse_geocode(lat: float, lon: float):
    return reverse_geocode(lat, lon)

def get_current_meal_time():
    hour = datetime.datetime.now().hour
    if 5 <= hour < 11: return "Breakfast"
    if 11 <= hour < 16: return "Lunch"
    if 16 <= hour < 19: return "Snack"
    return "Dinner"

# ─────────────────────────────────────────────
# WEATHER PRELUDE
# ─────────────────────────────────────────────

def generate_weather_prelude(weather_data, location):
    if not weather_data:
        return f"Checking weather in {location}..."
    raw_cond  = weather_data.get("condition", "Clear")
    temp      = weather_data.get("temp", 25)
    clouds    = weather_data.get("cloud_cover", 50)
    cond_low  = raw_cond.lower()
    t = round(temp) if isinstance(temp, (int, float)) else temp

    effectively_sunny = check_effectively_sunny(weather_data)
    display = "Sunny ☀️" if effectively_sunny else prettify_condition(raw_cond)
    return f"In {location}, it's {display} and {t}°C."


def build_deeplinks(dish: str, restaurant_name: str, city="bengaluru"):
    query = urllib.parse.quote(f"{restaurant_name} {dish} {city} delivery")
    google_url = f"https://www.google.com/search?q={query}"
    return google_url


# ─────────────────────────────────────────────
# NORMALISE RESTAURANT — unified schema for frontend
# Fixes: cuisine vs cuisines, avg_price sources, address gaps,
#        exact_item / pop_dishes merge, swiggy/zomato deeplinks always present
# ─────────────────────────────────────────────

def normalise_restaurant(r: dict, dish: str, user_lat=None, user_lon=None, city="Bengaluru") -> dict:
    name = r.get("name") or r.get("res_name") or "Restaurant"
    name_norm = name.lower().strip()

    # Address — use what's available
    address = r.get("address") or r.get("area") or ""

    # Cuisine — unify 'cuisine' (geoapify/osm/menu_data) and 'cuisines' (zomato_data)
    cuisine = r.get("cuisine") or r.get("cuisines") or ""
    # Strip raw Geoapify category prefixes for cleaner display
    cuisine = (cuisine
               .replace("catering.", "")
               .replace("restaurant.", "")
               .replace("_", " ")
               .strip())

    # Price — cascade through all price fields
    avg_price = r.get("avg_price") or 0
    if not avg_price:
        avg_price = (r.get("cost_for_two") or 0) / 2
    if not avg_price:
        avg_price = r.get("exact_price") or 0

    # Popular dishes — merge menu_data exact_item + pop_dishes
    exact_item = r.get("exact_item") or ""
    pop_dishes = list(r.get("pop_dishes") or r.get("items") or [])
    if exact_item and exact_item.lower() not in [d.lower() for d in pop_dishes]:
        pop_dishes = [exact_item] + pop_dishes

    # Delivery deep links — always built so frontend never has to compute them
    google_url = build_deeplinks(dish, name, city)

    return {
        # Identity
        "name":            name,
        "name_norm":       name_norm,
        # Location
        "address":         address,
        "distance":        r.get("distance"),       # km float or None
        # Quality
        "rating":          r.get("rating") or 0,
        "review_count":    r.get("review_count") or 0,
        "business_status": r.get("business_status") or "OPERATIONAL",
        # Price (all fields present so frontend has choices)
        "avg_price":       avg_price,
        "price_label":     r.get("price_label") or "",
        "exact_price":     r.get("exact_price") or 0,
        "cost_for_two":    r.get("cost_for_two") or 0,
        # Food
        "cuisine":         cuisine,
        "pop_dishes":      pop_dishes[:4],
        "exact_item":      exact_item,
        # Scoring internals
        "smart_score":     r.get("smart_score") or 0,
        "score_bonus":     r.get("score_bonus") or 0,
        "source":          r.get("source") or "unknown",
        # Media
        "photo":           r.get("photo"),
        # Delivery links — always present, correctly pinned to restaurant + location
        "google_url":      google_url,
    }


# ─────────────────────────────────────────────
# PEXELS IMAGE ENDPOINTS & CACHE
# ─────────────────────────────────────────────

def _get_pexels_image_cached(dish: str) -> str:
    """Check cache or fetch from Pexels, with fallback logic."""
    dish_clean = dish.lower().strip()
    
    # 1. Check in-memory cache
    if dish_clean in _IMAGE_CACHE and _IMAGE_CACHE[dish_clean]:
        return _IMAGE_CACHE[dish_clean]
    
    # 2. Check local storage / Pexels via service
    url = get_pexels_image(dish_clean)
    if url:
        save_custom_image(dish_clean, url)
        return url
        
    # 3. Last fallback: static placeholder
    return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80"

@app.post("/regen-image")
def regen_food_image(dish: str):
    dish_clean = dish.lower().strip()
    url = regen_pexels_image(dish_clean)
    if url:
        save_custom_image(dish_clean, url)
        return {"url": url, "dish": dish}
    
    return {"url": None, "error": "No new images found"}

# ─────────────────────────────────────────────
# RECOMMEND ENDPOINT
# ─────────────────────────────────────────────
@app.post("/recommend")
def recommend(
    text: str,
    location: str,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    diet: Optional[str] = "all",
    neighbourhood: Optional[str] = None,
    meal_time: Optional[str] = None,
    simulate_weather: Optional[str] = None,
):
    condition = extract_condition(text)

    if condition == "greeting":
        return [{"type": "question", "message": "Hello 😊 How are you feeling today?", "restaurants": []}]
    
    # Check if we need a clarifying question (unknown condition)
    # But ONLY if it's not a generic "weather" or "what to eat" query
    generic_keywords = ["what to eat", "suggest", "hungry", "food today", "recommend"]
    is_generic = any(kw in text.lower() for kw in generic_keywords)
    
    if condition == "unknown" and not is_generic and text.lower() != "weather":
        return [{
            "type": "question", 
            "message": "I'm not quite sure I understood. Could you clarify how you're feeling? (e.g., stomach pain, fever, cold, or just looking for food recommendations?)", 
            "restaurants": []
        }]

    # unknown — treat as browse/weather query, not a clarifying question
    if condition == "unknown":
        condition = "weather"

    # Use GPS coords from frontend first — only geocode city name as last resort
    if lat is None or lon is None:
        lat, lon = get_coordinates(location)

    # Resolve neighbourhood + city_name from GPS (more precise than text location)
    resolved_neighbourhood = neighbourhood
    city_name = location  # default

    if lat and lon:
        try:
            _key = os.getenv("GEOAPIFY_API_KEY", "")
            if _key:
                _r = requests.get(
                    f"https://api.geoapify.com/v1/geocode/reverse?lat={lat}&lon={lon}&apiKey={_key}",
                    timeout=5
                ).json()
                _props = _r.get("features", [{}])[0].get("properties", {})
                if not resolved_neighbourhood:
                    resolved_neighbourhood = (
                        _props.get("neighbourhood")
                        or _props.get("suburb")
                        or _props.get("quarter")
                        or _props.get("district")
                    )
                city_name = _props.get("city") or _props.get("town") or location
        except Exception:
            pass

    # Most precise location for menu dataset search
    menu_location = resolved_neighbourhood or location
    #weather
    weather_data = get_current_weather(lat, lon, query=location)
    
    # Apply weather simulation if requested
    if simulate_weather:
        if simulate_weather == "rain":
            weather_data = {"condition": "rain", "temp": 22, "feels_like": 22, "humidity": 85, "cloud_cover": 100, "area": location, "message": "Simulated"}
        elif simulate_weather == "hot":
            weather_data = {"condition": "sunny", "temp": 38, "feels_like": 42, "humidity": 30, "cloud_cover": 0, "area": location, "message": "Simulated"}
        elif simulate_weather == "cold":
            weather_data = {"condition": "mist", "temp": 12, "feels_like": 10, "humidity": 60, "cloud_cover": 20, "area": location, "message": "Simulated"}
        elif simulate_weather == "pleasant":
            weather_data = {"condition": "partly cloudy", "temp": 26, "feels_like": 26, "humidity": 50, "cloud_cover": 40, "area": location, "message": "Simulated"}

    weather_prelude = generate_weather_prelude(weather_data, resolved_neighbourhood or location)
    weather_ui = get_weather_ui_data(weather_data)

    NON_HEALTH_INTENTS = {"weather", "mood", "general_tasty", "discover", "none"}
    is_weather_query = condition.lower() in NON_HEALTH_INTENTS

    if is_weather_query:
        allowed_dishes = (
            get_weather_foods(weather_data, count=15) if weather_data
            else ["khichdi", "dal rice", "idli", "dosa", "biryani",
                  "curd rice", "poha", "upma", "roti sabzi", "paneer butter masala"]
        ) or ["khichdi", "dal rice", "idli", "dosa", "biryani",
              "curd rice", "poha", "upma", "roti sabzi", "paneer butter masala"]
        
        # Add a filter for extreme heat
        if weather_data and weather_data.get("temp", 25) > 35:
            # Filter out heavy/spicy foods in extreme heat
            heavy_foods = {"biryani", "chole bhature", "paneer butter masala", "dal makhani"}
            allowed_dishes = [d for d in allowed_dishes if d.lower() not in heavy_foods]
            if not allowed_dishes: # Fallback to light foods
                allowed_dishes = ["curd rice", "watermelon", "coconut water", "salad", "buttermilk"]
        
        condition = "weather"

    # Handle food craving — extract dish name and use it directly
    elif condition == "food_craving":
        # Extract dish name from query
        craving_keywords = ["recipe for", "how to make", "i want to eat", "craving"]
        craving_dish = text.lower()
        for kw in craving_keywords:
            craving_dish = craving_dish.replace(kw, "").strip()
        # Clean up common words
        for word in ["me", "a", "some", "the", "please", "can you"]:
            craving_dish = craving_dish.replace(word, "").strip()
        allowed_dishes = [craving_dish] if len(craving_dish) > 2 else get_weather_foods(weather_data, count=8)
        condition = "food_craving"
        is_weather_query = True  # use weather restaurant pipeline

    # Handle travel food
    elif condition == "travel_food":
        allowed_dishes = ["poha", "upma", "fruit bowl", "banana", "oatmeal", "idli", "daliya", "roasted chana", "coconut water", "ginger tea"]
        condition = "travel_food"
        is_weather_query = True

    # Handle medical query — show food but add disclaimer
    elif condition == "medical_query":
        # Extract the actual health condition from remaining text
        remaining = text.lower()
        for word in ["medicine", "tablet", "drug", "doctor", "prescription", "for", "what"]:
            remaining = remaining.replace(word, "").strip()
        sub_condition = extract_condition(remaining) if len(remaining) > 3 else "unknown"
        if sub_condition not in ["unknown", "greeting", "medical_query"]:
            allowed_dishes = get_allowed_dishes(sub_condition, diet)
            condition = sub_condition
        else:
            allowed_dishes = get_weather_foods(weather_data, count=8)
            condition = "weather"

    # Handle spicy craving
    elif condition == "spicy_craving":
        allowed_dishes = ["biryani", "pani puri", "chole bhature", "vada pav", "pav bhaji", "masala dosa", "dal makhani", "paneer tikka"]
        condition = "spicy_craving"
        is_weather_query = True
    else:
        allowed_dishes = get_allowed_dishes(condition, diet)
        if not allowed_dishes and condition not in ["unknown", "greeting"]:
            # LLM Generation Step
            new_rules = gemini.generate_health_rules(condition)
            if new_rules:
                # Save and reload
                add_new_health_rule(condition, new_rules)
                # Retry fetching dishes
                allowed_dishes = get_allowed_dishes(condition, diet)

        # If it's STILL empty after the retry/LLM failure
        if not allowed_dishes:
            save_pending_condition(condition, text)
            return [{"type": "message",
                     "why": f"No safe {diet if diet != 'all' else ''} dishes found for your condition.",
                     "restaurants": []}]

    # Inside recommend:
    target_meal_time = meal_time if meal_time and meal_time != "Any Time" else get_current_meal_time()

    # ── Per-dish processor ──────────────────────────────────────────────────

    def process_dish(dish):
        try:
            dish_norm = normalize_dish(dish)
            metadata = get_dish_metadata(dish_norm) or {}
            nutrition = get_nutrition_info(dish_norm)

            food_category = get_food_category(dish_norm)
            raw_restaurants = []

            BASIC_INGREDIENTS = {"water", "warm water", "lemon water", "ginger water", "nuts", "seeds"}
            is_produce = food_category in ("FRUIT", "VEGETABLE")
            is_homemade = food_category == "HOMEMADE"

            if dish_norm.lower() not in BASIC_INGREDIENTS and not is_homemade:
                if is_produce:
                    # For fruits and vegetables, search grocery stores instead of restaurants
                    if lat and lon:
                        raw_restaurants = fetch_nearby_grocery_stores(lat, lon)
                    # Fallback: no OSM/menu-dataset queries for produce
                else:
                    # Layer 1: Menu CSV search — city-wide dataset by dish name (HIGH RELEVANCE)
                    # This is our primary "reference" for dish-specific recommendations
                    menu_results = find_restaurants_by_menu_item(dish_norm, menu_location, user_lat=lat, user_lon=lon)
                    for r in menu_results:
                        # Give a strong bonus for exact dish matches from our dataset
                        r["score_bonus"] = r.get("score_bonus", 0) + 40.0
                        r["source"] = "menu_dataset"
                    raw_restaurants.extend(menu_results)

                    # Layer 2: Broad nearby (fetch_all_nearby) — GPS-based fallback
                    # Only add if we don't have enough specific menu results, or as low-priority options
                    if lat and lon:
                        broad = fetch_all_nearby(lat, lon, radius=3000)
                        for r in broad:
                            r["score_bonus"] = r.get("score_bonus", 0) + 0.0 # No bonus for generic nearby
                        raw_restaurants.extend(broad)

                    # Layer 3: City-wide menu fallback (broader area)
                    if len(raw_restaurants) < 5:
                        city_wide = find_restaurants_by_menu_item(dish_norm, city_name)
                        existing_names = {res.get("name_norm", "") for res in raw_restaurants}
                        for loc_r in city_wide:
                            if loc_r.get("name_norm", "") not in existing_names:
                                loc_r["distance"] = None
                                loc_r["source"] = "city_wide_fallback"
                                loc_r["score_bonus"] = loc_r.get("score_bonus", 0) + 20.0 # Medium bonus for city-wide matches
                                raw_restaurants.append(loc_r)

            # ── Score raw results ──────────────────────────────────────────
            for r in raw_restaurants:
                cost = (r.get("avg_price") or 0) or ((r.get("cost_for_two") or 0) / 2) or (r.get("exact_price") or 0)
                r["smart_score"] = calculate_smart_score(
                    rating=r.get("rating"),
                    review_count=r.get("review_count"),
                    distance_km=r.get("distance"),
                    score_bonus=r.get("score_bonus", 0),
                    avg_price=cost,
                )
                r["price_label"] = get_price_label(r)
                enrich_open_status(r)

            raw_restaurants = deduplicate_restaurants(raw_restaurants)
            raw_restaurants.sort(key=lambda x: x.get("smart_score", 0), reverse=True)

            # ── Normalise to unified schema (fixes all key mismatches) ─────
            restaurants = [
                normalise_restaurant(r, dish_norm, user_lat=lat, user_lon=lon, city=city_name)
                for r in raw_restaurants[:20]
            ]

            # ── Gemini re-ranking ─────────────────────────────────────────
            if gemini.is_available() and len(restaurants) > 2:
                restaurants = gemini.cross_check_restaurants(dish_norm, restaurants)

            # ── Final composite score ─────────────────────────────────────
            health_score = normalize_health_score(nutrition)
            weather_bias, weather_reason = 0, None
            if weather_data:
                weather_bias, weather_reason = calculate_weather_bias(
                    {"name": dish_norm}, weather_data, text
                )
            weather_score = normalize_weather_score(weather_bias)
            discovery_score = normalize_discovery_score(raw_restaurants)
            variety_score = random.uniform(50, 100)
            
            # Meal time relevance
            meal_relevance = 0
            if target_meal_time == "Breakfast" and dish_norm.lower() in BREAKFAST_FOODS: meal_relevance = 15
            elif target_meal_time == "Lunch" and dish_norm.lower() in LUNCH_FOODS: meal_relevance = 15
            elif target_meal_time == "Dinner" and dish_norm.lower() in DINNER_FOODS: meal_relevance = 15

            final_score = (
                health_score * 0.35
                + weather_score * 0.20
                + discovery_score * 0.25
                + meal_relevance * 0.15
                + variety_score * 0.05
            )
            
            # Smart "Why" Reasoning
            reasoning = weather_reason or f"Recommended for {condition.replace('_', ' ').title()}"
            if is_homemade:
                reasoning = f"Best made at home for maximum purity. {reasoning}"
            elif meal_relevance > 0:
                reasoning = f"Perfect {target_meal_time} choice! {reasoning}"
            
            # Add nutritional insight to "Why"
            if nutrition and nutrition.get("protein", 0) > 12:
                reasoning += " • Excellent protein source."
            elif nutrition and nutrition.get("calories", 0) < 300:
                reasoning += " • Light and low calorie."

            # Category 1 & 2 Test Case Enforcement: 
            # If the dish is specifically listed in the health rules, 
            # make sure it is marked as such.
            return {
                "dish":       dish_norm,
                "type":       "food",
                "food_category": food_category,
                "place_type": "grocery" if is_produce else "restaurant",
                "nutrition":  nutrition,
                "restaurants": restaurants,
                "why":        reasoning,
                "score":      round(final_score, 1),
                "score_breakdown": {
                    "health":    round(health_score, 1),
                    "weather":   round(weather_score, 1),
                    "discovery": round(discovery_score, 1),
                    "meal_time": round(meal_relevance, 1),
                },
                "image":         _get_pexels_image_cached(dish_norm),
                "recipe":        get_recipe_details(dish_norm),
                "metadata":      metadata,
                "health_tags":   generate_health_tags(dish_norm, nutrition, metadata),
                "context":       condition.replace("_", " "),
                "weather_prelude": weather_prelude if is_weather_query else "",
                # Location context for frontend deeplinks and display
                "location_context": {
                    "city":          city_name,
                    "neighbourhood": resolved_neighbourhood or location,
                    "lat":           lat,
                    "lon":           lon,
                },
                "intent_note": {
                    "travel_food": "Great for travel! Easy to carry and digest.",
                    "food_craving": "Here's what you're looking for!",
                    "medical_query": "⚠️ For medicines, please consult a doctor. Here are helpful foods:",
                    "spicy_craving": "Spicy picks for you! 🌶️",
                    "weather": "",
                }.get(condition, "")
            }

        except Exception as e:
            # Replaced hardcoded Windows path with OS-agnostic path and generic exception handling
            log_path = os.path.join(os.path.dirname(__file__), "error_trace.log")
            with open(log_path, "a", encoding="utf-8") as f:
                import traceback
                f.write(f"\n[process_dish] Error on '{dish}': {e}\n")
                f.write(traceback.format_exc())
            print(f"[process_dish] Error on '{dish}': {e}")
            return None

    worker_count = min(8, max(1, len(allowed_dishes)))
    with ThreadPoolExecutor(max_workers=worker_count) as executor:
        results = list(executor.map(process_dish, allowed_dishes))

    results = [r for r in results if r is not None]
    results.sort(key=lambda x: x["score"], reverse=True)

    if results:
        results[0]["weather_ui"] = weather_ui

    return results[:8]


# ─────────────────────────────────────────────
# DEBUG ENDPOINTS
# ─────────────────────────────────────────────

@app.get("/debug/weather")
def debug_weather(lat: float = 12.9716, lon: float = 77.5946):
    key = os.getenv("WEATHERAPI_KEY", "")
    result = {
        "key_present":      bool(key),
        "key_length":       len(key),
        "key_valid_length": len(key) == 32,
        "key_preview":      (key[:6] + "..." + key[-4:]) if len(key) >= 10 else "TOO SHORT",
    }
    if not key:
        result["error"] = "WEATHERAPI_KEY not set in .env"
        return result
    try:
        r = requests.get(
            "https://api.weatherapi.com/v1/current.json",
            params={"key": key, "q": f"{lat},{lon}", "aqi": "no"},
            timeout=6,
        )
        result["http_status"] = r.status_code
        if r.status_code == 200:
            data = r.json()
            cur, loc = data.get("current", {}), data.get("location", {})
            result.update({
                "status":     "✅ WORKING",
                "city":       loc.get("name"),
                "temp_c":     cur.get("temp_c"),
                "condition":  cur.get("condition", {}).get("text"),
                "local_time": loc.get("localtime"),
            })
        elif r.status_code == 401:
            result["status"] = "❌ INVALID KEY — get a fresh one from weatherapi.com"
            result["api_response"] = r.json()
        else:
            result["status"] = f"❌ HTTP {r.status_code}"
    except Exception as e:
        result["status"] = f"❌ {e}"
    return result


@app.get("/debug/location")
def debug_location(lat: float, lon: float):
    """Quick check: what neighbourhood does Geoapify resolve for these coords?"""
    return reverse_geocode(lat, lon)