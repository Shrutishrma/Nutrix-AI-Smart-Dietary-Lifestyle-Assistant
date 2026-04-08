---

# 🥗 Nutrix AI: Smart Dietary & Lifestyle Assistant

**Nutrix AI** 
It is a health-tech platform that acts as a clinical dietitian. It analyzes user symptoms using a high-speed NLP layer and Large Language Models (LLMs) to recommend scientifically backed Indian dishes, then uses geospatial data to find them at nearby restaurants or grocery stores.

## 🚀 Advanced Features

* **Performance-Optimized NLP:** Utilizes a custom keyword-matching engine that handles 95%+ of queries instantly, with LLM fallbacks (Groq & Gemini) for complex medical slang and synonyms.
* **Weather-Adaptive Discovery:** Features a **Weather Simulation** engine that adjusts recommendations based on local temperature and climate (e.g., warming foods for rain, cooling for heat).
* **Geospatial Intelligence:** Integrates Geoapify for proximity-based venue discovery, utilizing a custom "pseudo-rating" algorithm to prioritize the closest high-quality vendors.
* **Proprietary Smart Scoring:** Ranks dishes using a multi-factor algorithm that balances health appropriateness (35%), weather bias (20%), discovery/availability (25%), and meal-time relevance (15%).
* **Deep Nutritional Insights:** Provides full macro-nutrient breakdowns (Calories, Protein, Carbs, Fats, Fiber) for classic Indian staples.

## 🛠️ Tech Stack

### **Backend**
* **Framework:** Python (FastAPI).
* **AI Models:** Groq (Llama-3.3-70b) and Google Gemini 1.5 Flash.
* **APIs:** Geoapify (Geospatial), WeatherAPI, TheMealDB.

### **Frontend**
* **Library:** React 18+ (Vite) styled with Tailwind CSS.
* **Interaction:** Framer Motion for animations and Lucide-React for intuitive UI icons.

## 📂 Repository Structure

```text
Nutrix-AI/
├── backend/
│   ├── app.py                # FastAPI core and Scoring Engine
│   ├── ai_logic.py           # NLP and Intent Classification
│   ├── health_engine.py      # Dietary rule logic & Recipe retrieval
│   ├── geoapify_logic.py     # Venue discovery and Geocoding
│   ├── groq_service.py       # Primary LLM provider
│   ├── gemini_service.py     # Fallback LLM provider
│   └── data/                 # Nutrition CSVs and Health JSON rules
└── frontend/
    ├── src/
    │   ├── App.jsx           # Main UI controller & Weather simulation
    │   └── components/       # UI fragments (FoodCards, Modals)
```
