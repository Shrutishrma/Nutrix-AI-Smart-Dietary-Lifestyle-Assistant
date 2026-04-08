import json
import random
import os

from condition_engine import normalize_condition, reload_synonyms
from recipe_service import get_recipe_by_name
from dish_engine import get_food_image, get_dish_metadata, get_curated_recipe


# ─────────────────────────────────────────────
# LOAD DATA SAFELY
# ─────────────────────────────────────────────

def _safe_load_json(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


HEALTH_DATA     = _safe_load_json("data/expanded_health_rules.json")
CURATED_RECIPES = _safe_load_json("data/curated_recipes.json")


# ─────────────────────────────────────────────
# RECIPE DETAILS
# Priority:
#  1. Inline curated in dish_engine (17 Indian dishes — always correct)
#  2. curated_recipes.json (local file)
#  3. TheMealDB API
#  4. Graceful fallback — NEVER returns empty steps
# ─────────────────────────────────────────────

def get_recipe_details(dish_name):
    if not dish_name:
        return None

    norm = dish_name.strip().lower()

    # 1. Inline curated (dish_engine.py)
    curated = get_curated_recipe(norm)
    if curated:
        recipe = curated.copy()
        if not recipe.get("image"):
            recipe["image"] = get_food_image(dish_name)
        return recipe

    # 2. Local JSON file
    for r in CURATED_RECIPES:
        if r.get("name", "").strip().lower() == norm:
            recipe = r.copy()
            if not recipe.get("image"):
                recipe["image"] = get_food_image(dish_name)
            return recipe

    # 3. TheMealDB API
    try:
        api_data = get_recipe_by_name(dish_name)
        if api_data and api_data.get("instructions"):
            return {
                "name":         api_data.get("name", dish_name.title()),
                "instructions": api_data.get("instructions") or [],
                "ingredients":  api_data.get("ingredients") or [],
                "image":        api_data.get("image") or get_food_image(dish_name),
                "category":     api_data.get("category"),
                "cuisine":      api_data.get("cuisine"),
                "source":       "TheMealDB",
            }
    except Exception as e:
        print(f"[health_engine] Recipe fetch error for '{dish_name}': {e}")

    # 4. Always return SOMETHING — no more "Recipe steps not available"
    return {
        "name": dish_name.title(),
        "instructions": [
            f"Prepare fresh {dish_name} using quality local ingredients.",
            "Use minimal oil, whole grains and seasonal vegetables for best nutrition.",
            "Season lightly with common spices like turmeric, cumin and coriander.",
            "Serve hot with a side of buttermilk or warm water with lemon.",
            "Best consumed fresh — avoid reheating multiple times to retain nutrients.",
        ],
        "ingredients": [],
        "image": get_food_image(dish_name),
        "source": "HealthPlateAI",
    }


# ─────────────────────────────────────────────
# ALLOWED DISHES
# ─────────────────────────────────────────────

def get_allowed_dishes(conditions_string, diet="all"):
    if not conditions_string:
        return []
    if conditions_string.lower() in ["unknown", "greeting"]:
        return []

    conditions = [c.strip() for c in conditions_string.split(",") if c.strip()]
    if not conditions:
        return []

    allowed_sets = []

    for cond in conditions:
        c_id = normalize_condition(cond)
        current_list = []

        for rule in HEALTH_DATA:
            rule_id   = rule.get("id", "").lower()
            rule_name = rule.get("condition", "").lower()
            synonyms  = [s.lower().strip() for s in rule.get("synonyms", [])]

            if c_id in ([rule_id, rule_name] + synonyms):
                data = rule.get("allowed_food", [])
                if isinstance(data, list):
                    current_list = data
                break

        if current_list:
            allowed_sets.append(set(current_list))

    if not allowed_sets:
        return []

    final_allowed = allowed_sets[0]
    for s in allowed_sets[1:]:
        final_allowed = final_allowed.intersection(s)

    # Fallback to union if intersection is empty
    if not final_allowed:
        union_all = set()
        for s in allowed_sets:
            union_all.update(s)
        final_allowed = union_all

    combined = [d.lower().strip() for d in final_allowed if d]
    
    # ── Dietary Filtering ──
    if diet.lower() == "vegetarian":
        non_veg = ["chicken", "fish", "egg", "meat", "mutton", "beef", "pork"]
        combined = [d for d in combined if not any(nv in d for nv in non_veg)]
    elif diet.lower() == "vegan":
        non_vegan = ["chicken", "fish", "egg", "meat", "mutton", "beef", "pork", 
                     "milk", "curd", "yogurt", "buttermilk", "ghee", "butter", "paneer", "lassi", "honey", "cheese"]
        combined = [d for d in combined if not any(nv in d for nv in non_vegan)]

    random.shuffle(combined)
    return combined[:12]


# ─────────────────────────────────────────────
# AVOIDED DISHES
# ─────────────────────────────────────────────

def get_avoided_dishes(condition_id):
    if not condition_id:
        return []
    cid = condition_id.lower().strip()
    for rule in HEALTH_DATA:
        if cid in [rule.get("id", "").lower(), rule.get("condition", "").lower()]:
            avoid = rule.get("avoid_food", [])
            return avoid if isinstance(avoid, list) else []
    return []


# ─────────────────────────────────────────────
# SAVE UNKNOWN CONDITIONS
# ─────────────────────────────────────────────

def save_pending_condition(condition, user_input):
    file_path = "data/pending_new_conditions.json"
    new_entry = {"condition": condition, "input": user_input}
    try:
        data = []
        if os.path.exists(file_path):
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        data.append(new_entry)
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4)
        return True
    except Exception as e:
        print(f"Error saving pending condition: {e}")
        return False

# ─────────────────────────────────────────────
# ADD GENERATED HEALTH RULE
# ─────────────────────────────────────────────

def add_new_health_rule(condition_name, rules_dict):
    global HEALTH_DATA
    safe_id = condition_name.lower().replace(" ", "_")
    
    new_rule = {
        "id": safe_id,
        "condition": condition_name.title(),
        "synonyms": [condition_name],
        "allowed_food": rules_dict.get("allowed_food", []),
        "avoid_food": rules_dict.get("avoid_food", []),
        "source": "ai_learned"
    }

    file_path = "data/expanded_health_rules.json"
    try:
        data = []
        if os.path.exists(file_path):
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        
        data.append(new_rule)
        
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4)
            
        # Update in memory
        HEALTH_DATA = data
        
        # Reload synonyms in condition_engine
        reload_synonyms()
        return safe_id
    except Exception as e:
        print(f"Error adding new health rule for '{condition_name}': {e}")
        return None
