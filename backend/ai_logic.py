import re
import json
import os

# Ollama removed — keyword map handles 95%+ of cases
OLLAMA_AVAILABLE = False

from condition_engine import normalize_condition, get_all_conditions

# More forgiving greeting regex — accepts punctuation and trailing text
GREETING_REGEX = r"^(hello|hi+|hey+|heelo|hola|greetings|good\s+morning|good\s+evening|good\s+afternoon|namaste|namaskar|sup|howdy)[!?.,:;\s]*$"
KEYWORD_MAP = {
    # Food cravings
    "recipe for":           "food_craving",
    "how to make":          "food_craving",
    "i want to eat":        "food_craving",
    "craving":              "food_craving",
    "something spicy":      "spicy_craving",
    "spicy food":           "spicy_craving",

    # Travel
    "on a train":           "travel_food",
    "travelling":           "travel_food",
    "traveling":            "travel_food",
    "on a flight":          "travel_food",
    "road trip":            "travel_food",
    "journey":              "travel_food",

    # Medical queries
    "medicine":             "medical_query",
    "tablet":               "medical_query",
    "drug":                 "medical_query",
    "prescription":         "medical_query",
    "doctor":               "medical_query",

    # Weather intents (add to existing)
    "what to eat":          "weather",
    "what should i eat":    "weather",
    "suggest something":    "weather",
    "food for today":       "weather",
    "hungry":               "weather",

    # Lactose
    "lactose intolerant":   "lactose_intolerance",
    "lactose intolerance":  "lactose_intolerance",
    "dairy intolerant":     "lactose_intolerance",
    "milk allergy":         "lactose_intolerance",

    # Multi-word first
    "stomach ache":     "stomach_ache",
    "stomach pain":     "stomach_ache",
    "stomach cramps":   "stomach_ache",
    "tummy ache":       "stomach_ache",
    "abdominal pain":   "stomach_ache",
    "loose motion":     "diarrhea",
    "blood pressure":   "hypertension",
    "high bp":          "hypertension",
    "high blood pressure": "hypertension",
    "kidney stone":     "kidney_stone",
    "kidney stones":    "kidney_stone",
    "sore throat":      "cold_cough",
    "acid reflux":      "acid_reflux",
    "not feeling well": "stomach_ache",
    "feeling sick":     "stomach_ache",
    "not feeling well": "stomach_ache",
    "feeling sick":     "stomach_ache",

    # Single-word
    "indigestion":  "stomach_ache",
    "bloating":     "stomach_ache",
    "gas":          "stomach_ache",
    "acidity":      "acid_reflux",
    "heartburn":    "acid_reflux",
    "constipation": "constipation",
    "diarrhea":     "diarrhea",
    "diarrhoea":    "diarrhea",
    "cough":        "cold_cough",
    "cold":         "cold_cough",
    "flu":          "cold_cough",
    "fever":        "fever",
    "temperature":  "fever",
    "chills":       "fever",
    "headache":     "headache",
    "migraine":     "headache",
    "diabetes":     "diabetes",
    "diabetic":     "diabetes",
    "cholesterol":  "cholesterol",
    "anemia":       "anaemia",
    "anaemia":      "anaemia",
    "dizziness":    "dizziness",
    "dizzy":        "dizziness",
    "jaundice":     "jaundice",
    "yellow pox":   "jaundice",
    "yellow skin":  "jaundice",
    "typhoid":      "typhoid",
    "pcos":         "pcos",
    "thyroid":      "thyroid",
    "dengue":       "dengue",
    "tonsillitis":  "tonsillitis",
    "chickenpox":   "chickenpox",
    "vomiting":     "stomach_ache",
    "nausea":       "stomach_ache",
    "weakness":     "fever",

    # Weather / browse / food discovery intent
    "weather":          "weather",
    "weather today":    "weather",
    "today's weather":  "weather",
    "food for weather": "weather",
    "what to eat today": "weather",
    "recommend food":   "weather",
    "food suggestions": "weather",
    "show food":        "weather",
    "food today":       "weather",
    "eat today":        "weather",
    "i am hungry":      "weather",
    "feeling hungry":   "weather",
    "mood":             "weather",
    "discover":         "weather",
    "none":             "weather",

    # Hindi
    "bukhar":       "fever",
    "khansi":       "cold_cough",
    "khaansi":      "cold_cough",
    "pait dard":    "stomach_ache",
    "pet dard":     "stomach_ache",
    "sir dard":     "headache",
    "sar dard":     "headache",
    "chakkar":      "dizziness",
    "dast":         "diarrhea",
    "kabz":         "constipation",
    "kabjiyat":     "constipation",
    "zukam":        "cold_cough",
    "sardard":      "headache",
    "thakan":       "fever",
}


# ─────────────────────────────────────────────
# FAST KEYWORD DETECTION
# ─────────────────────────────────────────────

def _keyword_detect(text: str) -> str | None:
    text_lower = text.lower().strip()
    found = []

    # Process longest keywords first to avoid partial matches
    sorted_keywords = sorted(KEYWORD_MAP.keys(), key=len, reverse=True)

    for keyword in sorted_keywords:
        if keyword in text_lower:
            condition = KEYWORD_MAP[keyword]
            if condition not in found:
                found.append(condition)
            text_lower = text_lower.replace(keyword, " ")

    if not found:
        # Try a quick fuzzy match on individual words if strict substring fails
        import difflib
        words = [w for w in text_lower.replace(",", "").replace(".", "").split() if len(w) > 3]
        for w in words:
            matches = difflib.get_close_matches(w, KEYWORD_MAP.keys(), n=1, cutoff=0.8)
            if matches:
                condition = KEYWORD_MAP[matches[0]]
                if condition not in found:
                    found.append(condition)

    return ", ".join(found) if found else None


# ─────────────────────────────────────────────
# MAIN CONDITION EXTRACTOR
# ─────────────────────────────────────────────

from gemini_service import GeminiService

# Initialize LLM service (Gemini with Groq fallback)
llm = GeminiService()

def extract_condition(text: str) -> str:
    text_clean = text.lower().strip()

    # Fast greeting exit
    if re.match(GREETING_REGEX, text_clean):
        return "greeting"

    # 1. Fast keyword path
    keyword_result = _keyword_detect(text_clean)
    
    if not keyword_result:
        # LLM fallback for synonyms/slang/typos
        prompt = f"""
        Extract the health condition or food intent from this user input: "{text}"
        Possible conditions: {", ".join(get_all_conditions())}
        Other intents: "weather", "food_craving", "medical_query".
        
        If it's a synonym (e.g., "yellow pox" -> "jaundice", "pet dard" -> "stomach_ache"), 
        return the standard condition name.
        
        Return ONLY the comma-separated condition names, or "unknown" if nothing matches.
        """
        try:
            res = llm.ask(prompt)
            if res and "unknown" not in res.lower():
                keyword_result = res.strip().lower()
        except Exception as e:
            print(f"LLM extraction error: {e}")

    if keyword_result:
        parts = [p.strip() for p in keyword_result.split(",") if p.strip()]
        known_conditions = get_all_conditions()
        allowed_intents = set(known_conditions) | {"weather", "mood", "general_tasty", "food_craving", "medical_query"}

        valid = []
        for p in parts:
            norm = normalize_condition(p)
            if norm in allowed_intents:
                valid.append(norm)

        if valid:
            # If we found specific conditions (like fever, headache), and also generic "weather"
            # we should remove "weather" to keep the context focused.
            if len(valid) > 1 and "weather" in valid:
                valid = [v for v in valid if v != "weather"]
            
            return ", ".join(sorted(set(valid)))

    # No keyword match and no LLM — return unknown
    # app.py will treat unknown as a browse/weather query
    return "unknown"


# ─────────────────────────────────────────────
# DIAGNOSTIC QUESTION
# ─────────────────────────────────────────────

def generate_diagnostic_question(_) -> str:
    return (
        "Could you describe your symptom a bit more? "
        "For example: stomach pain, fever, cold, headache, or something else?"
    )


# ─────────────────────────────────────────────
# REFINEMENT
# ─────────────────────────────────────────────

def refine_condition(original_input: str, user_answer: str) -> str:
    combined = f"{original_input} {user_answer}"
    return extract_condition(combined)
