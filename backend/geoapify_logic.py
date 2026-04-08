import requests
import urllib.parse
import os
from dotenv import load_dotenv

load_dotenv()

# ---------------- CONFIGURATION ----------------

GEOAPIFY_API_KEY = os.getenv("GEOAPIFY_API_KEY")

if GEOAPIFY_API_KEY:
    print(f"Geoapify initialized.")
else:
    print("Geoapify API key not found. Running in offline mode.")

COORD_CACHE = {}

BLOCKED_VENUE_KEYWORDS = {
    "bar", "pub", "brewery", "brewing", "brew", "lounge",
    "nightclub", "hookah", "shisha", "restro bar", "restobar",
    "sports bar", "beer", "wine", "cocktail", "taproom",
    "bistro bar", "gastropub", "liquor", "tavern",
    "ale house", "microbrewery"
}


# -----------------------------------------------------
# SAFE API KEY CHECK
# -----------------------------------------------------

def _has_api_key():
    return bool(GEOAPIFY_API_KEY)


# -----------------------------------------------------
# BLOCKED VENUE FILTER
# -----------------------------------------------------

def is_blocked_venue(name):
    name_lower = name.lower()
    return any(keyword in name_lower for keyword in BLOCKED_VENUE_KEYWORDS)


# -----------------------------------------------------
# GEOCODING
# -----------------------------------------------------

def get_coordinates(location_name):
    norm_loc = location_name.lower().strip()

    if norm_loc in COORD_CACHE:
        return COORD_CACHE[norm_loc]

    if not _has_api_key():
        return None, None

    try:
        url = (
            f"https://api.geoapify.com/v1/geocode/search?"
            f"text={urllib.parse.quote(location_name)}"
            f"&apiKey={GEOAPIFY_API_KEY}"
        )

        resp = requests.get(url, timeout=8)

        if resp.status_code != 200:
            return None, None

        data = resp.json()
        features = data.get("features", [])

        if features:
            lon, lat = features[0]["geometry"]["coordinates"]
            COORD_CACHE[norm_loc] = (lat, lon)
            return lat, lon

    except Exception as e:
        print(f"Geocoding Error: {e}")

    return None, None


# -----------------------------------------------------
# DISH-SPECIFIC SEARCH
# -----------------------------------------------------


def _clean_address(props):
    """Return a short, clean address: neighbourhood + city only."""
    parts = []
    suburb   = props.get("suburb") or props.get("neighbourhood") or props.get("quarter")
    district = props.get("district") or props.get("county")
    city     = props.get("city") or props.get("town") or props.get("village")
    if suburb:
        parts.append(suburb.title())
    elif district:
        parts.append(district.title())
    if city:
        parts.append(city.title())
    if parts:
        return ", ".join(parts)
    # fallback to address_line2 if nothing cleaner
    return props.get("address_line2") or props.get("street") or ""


# ── Dish → Geoapify category mapping ──────────────────────────────────────
# Each dish type searches the right venue category so results are relevant.
DISH_CATEGORY_MAP = {
    # Cafes / tea shops — for beverages and light bites
    "tea":         "catering.cafe",
    "green tea":   "catering.cafe",
    "ginger tea":  "catering.cafe",
    "coffee":      "catering.cafe",
    "buttermilk":  "catering.cafe",
    "lassi":       "catering.cafe",
    "juice":       "catering.cafe",
    "smoothie":    "catering.cafe",
    "coconut water":"catering.cafe",
    "milkshake":   "catering.cafe",
    # Bakeries / fast food
    "sandwich":    "catering.fast_food,catering.cafe",
    "wrap":        "catering.fast_food",
    "bread":       "catering.bakery,catering.cafe",
    "cake":        "catering.bakery,catering.cafe",
    # South Indian — restaurants
    "idli":        "catering.restaurant,catering.fast_food",
    "dosa":        "catering.restaurant,catering.fast_food",
    "upma":        "catering.restaurant,catering.fast_food",
    "vada":        "catering.restaurant,catering.fast_food",
    "sambar":      "catering.restaurant",
    "rasam":       "catering.restaurant",
    "curd rice":   "catering.restaurant",
    # General healthy food
    "khichdi":     "catering.restaurant",
    "poha":        "catering.restaurant,catering.fast_food",
    "daliya":      "catering.restaurant,catering.cafe",
    "oatmeal":     "catering.cafe,catering.restaurant",
    "biryani":     "catering.restaurant",
    "soup":        "catering.restaurant,catering.cafe",
    "salad":       "catering.restaurant,catering.cafe",
    "ragi dosa":     "catering.restaurant,catering.fast_food",
    "moong dal":     "catering.restaurant",
    "dal chawal":    "catering.restaurant",
    "saag paneer":   "catering.restaurant",
    "bajra roti":    "catering.restaurant",
    "methi thepla":  "catering.restaurant,catering.fast_food",
    "jeera rice":    "catering.restaurant",
    "lauki soup":    "catering.restaurant,catering.cafe",
    "turmeric milk": "catering.cafe",
    "chana masala":  "catering.restaurant",
    "rajma masala":  "catering.restaurant",
}

def _get_dish_categories(dish: str) -> str:
    """Return Geoapify category string most relevant for this dish."""
    d = dish.lower().strip()
    # Exact match
    if d in DISH_CATEGORY_MAP:
        return DISH_CATEGORY_MAP[d]
    # Keyword match
    for keyword, cats in DISH_CATEGORY_MAP.items():
        if keyword in d:
            return cats
    # Default
    return "catering.restaurant,catering.cafe,catering.fast_food"


def _get_dish_keywords(dish: str) -> list:
    """Return search keyword variants for venue name matching."""
    d = dish.lower().strip()
    keywords = []
    # Tea → search for cafe / tea / chai
    if any(x in d for x in ["tea", "chai"]):
        keywords = ["tea", "cafe", "chai", "coffee", "brew", "cup"]
    elif any(x in d for x in ["idli", "dosa", "upma", "vada", "sambar"]):
        keywords = ["udupi", "south indian", "darshini", "tiffin", "breakfast", "idli", "dosa"]
    elif any(x in d for x in ["khichdi", "dal", "rice", "poha", "daliya"]):
        keywords = ["home", "tiffin", "meals", "lunch", "kitchen", "sagar", "darshini"]
    elif any(x in d for x in ["juice", "lassi", "buttermilk", "smoothie", "coconut"]):
        keywords = ["juice", "fresh", "cafe", "drinks", "beverages"]
    elif any(x in d for x in ["soup", "salad"]):
        keywords = ["healthy", "cafe", "kitchen", "bowl", "fresh"]
    return keywords


def fetch_nearby_restaurants(
    dish,
    location_name,
    categories=None,
    user_lat=None,
    user_lon=None
):
    """
    Search for restaurants near user serving this dish type.
    Uses dish-appropriate category (cafe for tea, restaurant for idli etc.)
    and tries multiple radius sizes to get enough results.
    """
    if not _has_api_key():
        return []

    try:
        lat = user_lat
        lon = user_lon
        if not (lat and lon):
            lat, lon = get_coordinates(location_name)
            if lat is None:
                return []

        dish_cats = categories or _get_dish_categories(dish)
        results = []

        # Try progressively larger radius until we have enough results
        for radius in [2000, 4000, 8000]:
            url = (
                f"https://api.geoapify.com/v2/places?"
                f"categories={dish_cats}"
                f"&filter=circle:{lon},{lat},{radius}"
                f"&bias=proximity:{lon},{lat}"
                f"&limit=30"
                f"&apiKey={GEOAPIFY_API_KEY}"
            )

            resp = requests.get(url, timeout=10)
            if resp.status_code != 200:
                continue

            data = resp.json()
            features = data.get("features", [])

            for feature in features:
                props = feature.get("properties", {})
                name = props.get("name")
                if not name:
                    continue
                name = str(name)
                if is_blocked_venue(name):
                    continue

                dist_m = props.get("distance", 0)
                dist_km = round(dist_m / 1000, 1) if dist_m else 0
                cats_str = " ".join(props.get("categories", []))
                # FIX C: distance-based pseudo-rating (closer = higher pseudo rating)
                # Geoapify doesn't provide real ratings, so use proximity as differentiator
                pseudo_rating = max(2.0, 5.0 - dist_km)

                results.append({
                    "name": name,
                    "name_norm": name.lower().strip(),
                    "rating": pseudo_rating,
                    "review_count": 0,
                    "distance": dist_km,
                    "source": "geoapify",
                    "business_status": "OPERATIONAL",
                    "photo": None,
                    "address": _clean_address(props),
                    "cuisine": cats_str,
                    "opening_hours": props.get("opening_hours"),
                })

            if len(results) >= 8:
                break

        results.sort(key=lambda x: x.get("distance", 999))
        return results

    except Exception as e:
        print(f"Geoapify Error: {e}")
        return []


# -----------------------------------------------------
# PRIMARY LOCATION-FIRST SEARCH
# -----------------------------------------------------

def fetch_all_nearby(lat, lon, radius=5000):
    if not _has_api_key():
        return []

    try:
        url = (
            f"https://api.geoapify.com/v2/places?"
            f"categories=catering.restaurant,catering.cafe,catering.fast_food"
            f"&filter=circle:{lon},{lat},{radius}"
            f"&bias=proximity:{lon},{lat}"
            f"&limit=100"
            f"&apiKey={GEOAPIFY_API_KEY}"
        )

        resp = requests.get(url, timeout=10)

        if resp.status_code != 200:
            return []

        data = resp.json()
        features = data.get("features", [])

        results = []

        for feature in features:
            props = feature.get("properties", {})
            name = props.get("name")

            if not name:
                continue
            name = str(name)

            if is_blocked_venue(name):
                continue

            dist_m = props.get("distance", 0)
            dist_km = round(dist_m / 1000, 1) if dist_m else 0

            if dist_km > (radius / 1000):
                continue

            categories = " ".join(props.get("categories", []))
            # FIX C: distance-based pseudo-rating (closer = higher pseudo rating)
            pseudo_rating = max(2.0, 5.0 - dist_km)

            results.append({
                "name": name,
                "name_norm": name.lower().strip(),
                "rating": pseudo_rating,
                "review_count": 0,
                "distance": dist_km,
                "source": "nearby",
                "business_status": "OPERATIONAL",
                "photo": None,
                "address": _clean_address(props),
                "cuisine": categories,
                "lat": props.get("lat"),
                "lon": props.get("lon")
            })

        results.sort(key=lambda x: x["distance"])
        return results

    except Exception as e:
        print(f"Geoapify Nearby Error: {e}")
        return []


# -----------------------------------------------------
# GROCERY / FRUIT SHOP SEARCH (for FRUIT/VEGETABLE items)
# -----------------------------------------------------

def fetch_nearby_grocery_stores(lat, lon, radius=3000):
    """
    Search for supermarkets, grocery stores, and fruit shops near the user.
    Used when the food item is classified as FRUIT or VEGETABLE.
    """
    if not _has_api_key():
        return []

    try:
        # Try commercial grocery categories first, then widen to food shops
        categories = "commercial.supermarket,commercial.food_and_drink,shop.grocery"
        results = []

        for r in [radius, radius * 2]:
            url = (
                f"https://api.geoapify.com/v2/places?"
                f"categories={categories}"
                f"&filter=circle:{lon},{lat},{r}"
                f"&bias=proximity:{lon},{lat}"
                f"&limit=20"
                f"&apiKey={GEOAPIFY_API_KEY}"
            )

            resp = requests.get(url, timeout=10)
            if resp.status_code != 200:
                continue

            data = resp.json()
            features = data.get("features", [])

            for feature in features:
                props = feature.get("properties", {})
                name = props.get("name")
                if not name:
                    continue
                if is_blocked_venue(name):
                    continue

                dist_m = props.get("distance", 0)
                dist_km = round(dist_m / 1000, 1) if dist_m else 0
                cats_str = " ".join(props.get("categories", []))
                pseudo_rating = max(2.0, 5.0 - dist_km)

                results.append({
                    "name": name,
                    "name_norm": name.lower().strip(),
                    "rating": pseudo_rating,
                    "review_count": 0,
                    "distance": dist_km,
                    "source": "grocery",
                    "business_status": "OPERATIONAL",
                    "photo": None,
                    "address": _clean_address(props),
                    "cuisine": "Grocery / Fruit Shop",
                    "opening_hours": props.get("opening_hours"),
                })

            if len(results) >= 4:
                break

        results.sort(key=lambda x: x.get("distance", 999))
        return results

    except Exception as e:
        print(f"Geoapify Grocery Error: {e}")
        return []