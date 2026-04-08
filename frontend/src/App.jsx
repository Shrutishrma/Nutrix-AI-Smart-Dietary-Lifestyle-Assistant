import { useState, useEffect, useRef } from "react";
import {
  Star, MapPin, Cloud, CloudRain, Sun, Thermometer,
  ChevronRight, Utensils, Zap, Wind, Send, MessageSquare,
  Menu, RefreshCcw, Navigation, Clock, TrendingUp, X,
  ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Droplets,
  Mic, MicOff, Heart, Bookmark, ShoppingCart, Bot, Leaf, ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { LocationPrompt } from "./components/LocationPrompt";
import { RecipeModal } from "./components/RecipeModal";
import { SavedItemsPage } from "./components/SavedItemsPage";
import { useSavedItems } from "./components/useSavedItems";
import { NutrixFoodCard } from "./components/NutrixFoodCard";

// ─── Weather food image imports ───────────────────────────────────────────────
import biryaniHero from './assets/images/biryani_hero.png';
import thaliHero from './assets/images/thali_hero.png';
import khichdi from './assets/images/khichdi.png';
import logoImg from './assets/images/logo.png';

const weatherImageMap = {
  rain: khichdi,        // Rainy day → warm khichdi
  rainy: khichdi,
  hot: biryaniHero,     // Hot sunny → biryani
  heat: biryaniHero,
  sunny: thaliHero,     // Sunny → balanced Indian thali
  cloudy: biryaniHero,  // Cloudy → biryani
  overcast: biryaniHero,
  cold: khichdi,        // Cold → warming khichdi
  misty: khichdi,
  pleasant: thaliHero,  // Pleasant default → Indian thali
  default: thaliHero,
};

// ─── Dish image map ───────────────────────────────────────────────────────────
// Images are now served locally from /foods/ directory, downloaded via Pexels.
const DISH_IMAGES = {
  "idli": "/foods/idli.jpg",
  "dosa": "/foods/dosa.jpg",
  "khichdi": "/foods/khichdi.jpg",
  "biryani": "/foods/biryani.jpg",
  "dal": "/foods/dal.jpg",
  "paneer butter masala": "/foods/paneer_butter_masala.jpg",
  "roti": "/foods/roti.jpg",
  "masala chai": "/foods/masala_chai.jpg",
  "coffee": "/foods/coffee.jpg",
  "fruit bowl": "/foods/fruit_bowl.jpg",
  "vegetable soup": "/foods/vegetable_soup.jpg",
  "samosa": "/foods/samosa.jpg",
  "poha": "/foods/poha.jpg",
  "upma": "/foods/upma.jpg",
  "curd rice": "/foods/curd_rice.jpg",
  "oats": "/foods/oats.jpg",
  "boiled egg": "/foods/boiled_egg.jpg",
};

const PLACEHOLDER = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80";

const getDishImage = (item) => {
  const key = (item?.dish || "").toLowerCase().trim();
  
  // 1. Check explicit mapping
  if (DISH_IMAGES[key]) return DISH_IMAGES[key];
  
  // 2. Check if backend provided a local path or URL
  if (item?.image) return item.image;
  
  // 3. Fallback to placeholder
  return PLACEHOLDER;
};

// ─── Weather headline map ─────────────────────────────────────────────────────
const weatherHeadlines = {
  rain: "Rainy day outside?\nWarm your soul with comfort food.",
  rainy: "Rainy day outside?\nWarm your soul with comfort food.",
  hot: "Scorching outside?\nBeat the heat the Indian way.",
  sunny: "Sunny day, great appetite?\nDiscover the best food for you.",
  cloudy: "Cloudy skies today?\nA hearty Indian meal hits the spot.",
  overcast: "Cloudy skies today?\nA hearty Indian meal hits the spot.",
  cold: "Cool air outside?\nSomething hot and nourishing awaits.",
  misty: "Misty morning vibes?\nCozy up with something wholesome.",
  pleasant: "What are you\ncraving today?",
  default: "What are you\ncraving today?",
};

// ─── ADD 3: Weather reasoning line map ──────────────────────────────────────
const weatherReasoningMap = {
  "hot_sunny": "Showing cooling foods to beat the heat 🥤",
  "rainy": "Showing warm comfort foods for rainy weather ☔",
  "cold_winter": "Showing warming foods for cold weather 🍲",
  "cloudy_gloomy": "Showing hearty foods for cloudy skies ⛅",
  "humid_sticky": "Showing light foods for humid weather 💨",
  "pleasant_mild": "Showing balanced foods for pleasant weather 🌤️",
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [text, setText] = useState("");
  const BACKEND_URL = "http://127.0.0.1:8000";
  const [location, setLocation] = useState("");
  const [coords, setCoords] = useState(null);
  const [results, setResults] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [weather, setWeather] = useState({ temp: null, condition: "clear" });
  const [weatherUi, setWeatherUi] = useState({
    mode: "Pleasant • Healthy Mode",
    hook: "Great weather for a balanced meal",
    icon: "cloud",
    bg_type: "pleasant",
  });
  const [weatherPrelude, setWeatherPrelude] = useState("");
  const [loading, setLoading] = useState(false);
  const [recipeModal, setRecipeModal] = useState(null);
  const [diet, setDiet] = useState("all");
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [page, setPage] = useState("home");
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [locationDismissed, setLocationDismissed] = useState(false);
  const [showAllResults, setShowAllResults] = useState(false);
  const [lastQuery, setLastQuery] = useState("weather");
  const [mealTime, setMealTime] = useState("Any Time");
  const [recentSearches, setRecentSearches] = useState(() => JSON.parse(localStorage.getItem("recent_searches") || "[]"));
  const chatEndRef = useRef(null);
  const transcriptRef = useRef("");
  const hasAutoTriggered = useRef(false);

  const { liked, bookmarked, toggleLike, toggleBookmark, removeLiked, removeBookmarked } = useSavedItems();

  const getGreeting = () => {
    const nowIST = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata", hour: "numeric", hour12: false });
    const h = parseInt(nowIST, 10);
    if (h >= 5 && h < 12) return "Good Morning";
    if (h >= 12 && h < 17) return "Good Afternoon";
    if (h >= 17 && h < 21) return "Good Evening";
    return "Good Night";
  };
  const [greeting, setGreeting] = useState(getGreeting);
  const [context, setContext] = useState(null);

  useEffect(() => {
    setGreeting(getGreeting());
    const timer = setInterval(() => setGreeting(getGreeting()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  // ── 10-minute weather refresh ─────────────────────────────────────────────
  const weatherIntervalRef = useRef(null);

  useEffect(() => {
    if (!navigator.geolocation) { setLocation("Bengaluru"); return; }
    try {
      const saved = JSON.parse(localStorage.getItem("fp_location") || "null");
      if (saved?.name && saved?.lat && saved?.lon) {
        setLocation(saved.name);
        setCoords({ lat: saved.lat, lon: saved.lon });
        loadInitialWeather(saved.name, saved.lat, saved.lon);

        // FIX 1: re-fetch weather every 10 minutes
        weatherIntervalRef.current = setInterval(() => {
          loadInitialWeather(saved.name, saved.lat, saved.lon);
        }, 10 * 60 * 1000);

        return;
      }
    } catch { }
    setShowLocationPrompt(true);
  }, []);

  // Clear interval on unmount
  useEffect(() => {
    return () => { if (weatherIntervalRef.current) clearInterval(weatherIntervalRef.current); };
  }, []);

  useEffect(() => {
    if (location && coords) {
      if (lastQuery === "weather") {
        loadInitialWeather(location, coords.lat, coords.lon);
      } else {
        handleSend(lastQuery);
      }
    }
  }, [diet]);

  // ADD 1: Re-fetch when meal time changes
  useEffect(() => {
    if (location && coords && (results.length > 0 || lastQuery !== "weather")) {
      if (lastQuery === "weather") {
        loadInitialWeather(location, coords.lat, coords.lon);
      } else {
        handleSend(lastQuery);
      }
    }
  }, [mealTime]);

  const requestLocation = () => {
    navigator.geolocation.getCurrentPosition(
      async ({ coords: pos }) => {
        const { latitude, longitude } = pos;
        setCoords({ lat: latitude, lon: longitude });
        setShowLocationPrompt(false);
        try {
          const geo = await fetch(`${BACKEND_URL}/geocode/reverse?lat=${latitude}&lon=${longitude}`).then((r) => r.json());
          const displayName = geo.city || geo.neighbourhood || "Bengaluru";
          setLocation(displayName);
          localStorage.setItem("fp_location", JSON.stringify({ name: displayName, lat: latitude, lon: longitude }));
          loadInitialWeather(displayName, latitude, longitude);
        } catch {
          setLocation("Bengaluru");
          loadInitialWeather("Bengaluru", 12.9716, 77.5946);
        }
      },
      (err) => {
        // GPS denied or unavailable — keep the prompt open so user can type their location
        // Only dismiss if user explicitly clicked Maybe Later
        console.warn("GPS error:", err.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Called when user types a location name manually and clicks Confirm
  const handleManualLocation = async (typedText) => {
    try {
      const res = await fetch(`${BACKEND_URL}/geocode/search?text=${encodeURIComponent(typedText)}`).then(r => r.json());
      if (res.lat && res.lon) {
        const displayName = res.name || typedText;
        setLocation(displayName);
        setCoords({ lat: res.lat, lon: res.lon });
        localStorage.setItem("fp_location", JSON.stringify({ name: displayName, lat: res.lat, lon: res.lon }));
        setShowLocationPrompt(false);
        loadInitialWeather(displayName, res.lat, res.lon);
      } else {
        // Location text not resolved — fall back to text-only (no GPS coords)
        setLocation(typedText);
        setCoords(null);
        localStorage.setItem("fp_location", JSON.stringify({ name: typedText, lat: null, lon: null }));
        setShowLocationPrompt(false);
        loadInitialWeather(typedText, 12.9716, 77.5946);
      }
    } catch {
      setLocation(typedText);
      setCoords(null);
      setShowLocationPrompt(false);
      loadInitialWeather(typedText, 12.9716, 77.5946);
    }
  };

  const handleChangeLocation = () => {
    localStorage.removeItem("fp_location");
    setLocation("");
    setCoords(null);
    setLocationDismissed(false);
    setShowLocationPrompt(true);
    hasAutoTriggered.current = false;
    setChatHistory([]);
    setResults([]);
  };

  const loadInitialWeather = async (city, lat, lon) => {
    // Attempt to load from cache first for immediate UI update
    const cacheKey = `initial_weather_${city}_${diet}_${mealTime}`;
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        // Only use cache if it's less than 30 mins old
        if (Date.now() - parsed.timestamp < 30 * 60 * 1000) {
          console.log("[Nutrix] Using cached initial weather data");
          applyWeatherFromResponse(parsed.data);
          const foodItems = parsed.data.filter((i) => i.type === "food");
          if (foodItems.length > 0) {
            setResults(foodItems);
            // We still continue to fetch fresh data in background
          }
        }
      } catch (e) {
        console.warn("Cache parse error:", e);
      }
    }

    setLoading(true);
    setLastQuery("weather");
    try {
      let url = `${BACKEND_URL}/recommend?text=weather&location=${encodeURIComponent(city)}&lat=${lat}&lon=${lon}&diet=${diet}`;
      if (mealTime && mealTime !== "Any Time") url += `&meal_time=${mealTime}`;
      if (simulatedWeather) url += `&simulate_weather=${simulatedWeather}`;

      const res = await fetch(url, { method: "POST" });
      const data = await res.json();
      
      // Save to cache
      localStorage.setItem(cacheKey, JSON.stringify({
        timestamp: Date.now(),
        data: data
      }));

      console.log("[Nutrix] /recommend response dishes:", data.filter(i => i.type === "food").map(i => i.dish));
      applyWeatherFromResponse(data);

      const top = data.find((i) => i.weather_prelude || i.weather_ui);
      const prelude = top?.weather_prelude || "";
      const modeLabel = top?.weather_ui?.mode || "Pleasant • Healthy Mode";

      const greeting = prelude
        ? `${prelude}`
        : `In ${city}: ${modeLabel}. Here are recommendations for this weather.`;

      // FIX 3: set food results from THIS call (don't need autoTriggerQuery)
      const foodItems = data.filter((i) => i.type === "food");
      if (foodItems.length > 0) {
        setResults(foodItems);
        const names = foodItems
          .map((f) => f.dish.charAt(0).toUpperCase() + f.dish.slice(1))
          .slice(0, 3)
          .join(", ");
        const extra = foodItems.length > 3 ? ` and ${foodItems.length - 3} more` : "";
        // ADD 3: Use bg_type from API to show a contextual reasoning line in chat
        const bgType = top?.weather_ui?.bg_type || "pleasant_mild";
        const reasoningLine = weatherReasoningMap[bgType] || "Showing foods matched to your current weather 🌿";
        setChatHistory([
          { type: "system", text: greeting },
          { type: "system", text: reasoningLine },
          { type: "system", text: `Showing ${foodItems.length} picks: ${names}${extra}. Type a symptom to refine.` }
        ]);
      } else if (!hasAutoTriggered.current) {
        // No results yet — trigger secondary query
        autoTriggerQuery(greeting, city, lat, lon);
      }

      const withCtx = [...data].reverse().find((i) => i.context);
      if (withCtx) setContext(withCtx.context);
    } catch (e) {
      console.error("Weather load error:", e);
    } finally {
      setLoading(false);
    }
  };

  const autoTriggerQuery = async (greetingMsg, city, lat, lon) => {
    if (hasAutoTriggered.current) return;
    hasAutoTriggered.current = true;

    setChatHistory([{ type: "system", text: greetingMsg }]);
    setLoading(true);
    setShowAllResults(false);

    try {
      let url = `${BACKEND_URL}/recommend?text=weather&location=${encodeURIComponent(city || "Bengaluru")}&diet=${diet}`;
      if (lat && lon) url += `&lat=${lat}&lon=${lon}`;
      if (mealTime && mealTime !== "Any Time") url += `&meal_time=${mealTime}`;
      console.log("[Nutrix] autoTriggerQuery calling /recommend:", url);
      const res = await fetch(url, { method: "POST" });
      const data = await res.json();
      applyWeatherFromResponse(data);

      const foodItems = data.filter((i) => i.type === "food");
      if (foodItems.length > 0) {
        setResults(foodItems);
        const names = foodItems
          .map((f) => f.dish.charAt(0).toUpperCase() + f.dish.slice(1))
          .slice(0, 3)
          .join(", ");
        const extra = foodItems.length > 3 ? ` and ${foodItems.length - 3} more` : "";
        setChatHistory((prev) => [
          ...prev,
          { type: "system", text: `Showing ${foodItems.length} recommendations: ${names}${extra}. Tell me how you feel to refine these further.` },
        ]);
      }
      // FIX 3: NO hardcoded fallback — if API returns nothing, show empty state cleanly

      const withCtx = [...data].reverse().find((i) => i.context);
      if (withCtx) setContext(withCtx.context);
    } catch (e) {
      console.error("Auto-trigger error:", e);
    } finally {
      setLoading(false);
    }
  };

  const applyWeatherFromResponse = (data) => {
    const top = data.find((i) => i.weather_prelude || i.weather_ui);
    if (!top) return;
    if (top.weather_prelude) setWeatherPrelude(top.weather_prelude);
    if (top.weather_ui) setWeatherUi(top.weather_ui);

    const prelude = top.weather_prelude || "";
    const degreeSign = "\u00b0";
    const tempMatch =
      prelude.match(new RegExp("(\\d+)\\s*" + degreeSign + "C", "i")) ||
      prelude.match(new RegExp("(\\d+)\\s*" + degreeSign, "i")) ||
      prelude.match(/(\d+)\s*degrees/i);

    const tempFromUi =
      typeof top.weather_ui?.temp === "number" ? top.weather_ui.temp :
        typeof top.weather_ui?.temperature === "number" ? top.weather_ui.temperature :
          null;

    const parsedTemp = tempMatch
      ? parseInt(tempMatch[1])
      : tempFromUi !== null
        ? Math.round(tempFromUi)
        : null;

    setWeather({
      temp: parsedTemp,
      condition: top.weather_ui?.bg_type || "pleasant",
    });
  };

  useEffect(() => {
    if (chatHistory.length > 2) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory]);

  const handleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { setVoiceError("Voice not supported in this browser. Use Chrome or Edge."); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onstart = () => { setIsListening(true); setVoiceError(""); };
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map((r) => r[0].transcript).join("");
      setText(transcript);
      transcriptRef.current = transcript;
    };
    recognition.onend = () => {
      setIsListening(false);
      if (transcriptRef.current.trim()) { handleSend(transcriptRef.current.trim()); transcriptRef.current = ""; }
    };
    recognition.onerror = (event) => {
      setIsListening(false);
      if (event.error === "no-speech") setVoiceError("No speech detected. Try again.");
      else if (event.error === "not-allowed") setVoiceError("Microphone access denied.");
      else setVoiceError("Voice error: " + event.error);
    };
    recognition.start();
  };

  const saveRecentSearch = (query) => {
    if (query === "weather") return;
    const updated = [query, ...recentSearches.filter(q => q !== query)].slice(0, 3);
    setRecentSearches(updated);
    localStorage.setItem("recent_searches", JSON.stringify(updated));
  };

  const handleSend = async (manualText) => {
    const query = manualText || text;
    if (!query) return;
    setLoading(true);
    setLastQuery(query);
    setShowAllResults(false);
    saveRecentSearch(query);
    setChatHistory((prev) => [...prev, { type: "user", text: query }]);
    setText("");
    try {
      let url = `${BACKEND_URL}/recommend?text=${encodeURIComponent(query)}&location=${encodeURIComponent(location || "Bengaluru")}&diet=${diet}`;
      if (coords) url += `&lat=${coords.lat}&lon=${coords.lon}`;
      if (context) url += `&previous_context=${encodeURIComponent(context)}`;
      if (mealTime && mealTime !== "Any Time") url += `&meal_time=${mealTime}`;
      
      // ADD: simulated weather param
      if (simulatedWeather) url += `&simulate_weather=${simulatedWeather}`;
      
      const res = await fetch(url, { method: "POST" });
      const data = await res.json();
      applyWeatherFromResponse(data);
      const sysMsgs = data.filter((i) => i.type === "question" || i.type === "message");
      sysMsgs.forEach((msg) => {
        setChatHistory((prev) => [...prev, { 
          type: "system", 
          text: msg.message || msg.why || "I found some recommendations for you.",
          note_type: msg.note_type 
        }]);
      });
      const foodItems = data.filter((i) => i.type === "food");
      if (foodItems.length > 0) {
        setResults(foodItems);
        // Clean up condition name (e.g. cold_cough -> cold & cough)
        const rawCond = foodItems[0]?.context || "your condition";
        const cond = rawCond.replace(/_/g, " ").replace(/, /g, " & ");
        
        const names = foodItems
          .map((f) => f.dish.charAt(0).toUpperCase() + f.dish.slice(1))
          .slice(0, 3)
          .join(", ");
        const preludeText = foodItems[0]?.weather_prelude || "";
        const extra = foodItems.length > 3 ? ` and ${foodItems.length - 3} more` : "";
        
        let reply;
        if (rawCond === "weather") {
          reply = preludeText
            ? `${preludeText} Here are ${foodItems.length} recommendations for this weather: ${names}${extra}.`
            : `Found ${foodItems.length} safe options for today: ${names}${extra}.`;
        } else {
          // For health conditions, focus on the condition
          reply = `Found ${foodItems.length} safe options for ${cond}: ${names}${extra}.`;
        }
        setChatHistory((prev) => [...prev, { type: "system", text: reply }]);
      }
      const withCtx = [...data].reverse().find((i) => i.context);
      if (withCtx) setContext(withCtx.context);
    } catch (err) {
      console.error(err);
      setChatHistory((prev) => [...prev, { type: "system", text: "Couldn't reach the server. Make sure the backend is running on port 8000." }]);
    } finally {
      setLoading(false);
    }
  };

  const weatherCondition = weatherUi.bg_type || "pleasant";
  const heroImage = weatherImageMap[weatherCondition?.toLowerCase()] ?? thaliHero;
  const heroHeadline = (weatherHeadlines[weatherCondition] || weatherHeadlines.default);

  const [simulatedWeather, setSimulatedWeather] = useState(null);
  const [showWeatherFilter, setShowWeatherFilter] = useState(false);

  const simulateWeather = (type) => {
    setSimulatedWeather(type);
    setShowWeatherFilter(false);
    
    // Update local state for immediate UI change
    const simulatedData = {
      rain: { bg_type: "rain", mode: "Monsoon Mode ☔", icon: "cloud-rain" },
      hot: { bg_type: "hot", mode: "Summer Mode ☀️", icon: "sun" },
      cold: { bg_type: "cold", mode: "Winter Mode ❄️", icon: "wind" },
      pleasant: { bg_type: "pleasant", mode: "Spring Mode 🌤️", icon: "cloud" }
    }[type];

    if (simulatedData) {
      setWeatherUi(prev => ({ ...prev, ...simulatedData }));
      setWeather(prev => ({ ...prev, condition: simulatedData.bg_type }));
      
      // Trigger new recommendation with simulated weather
      handleSend("weather"); 
    }
  };

  const getWeatherLabel = (bg) => {
    switch (bg) {
      case "rain": return "Rainy";
      case "cold": return "Cold";
      case "heat": case "hot": return "Hot";
      case "cloudy": return "Cloudy";
      case "sunny": return "Sunny";
      default: return "Pleasant";
    }
  };

  const getWeatherLucideIcon = (bg, size = 14) => {
    switch (bg) {
      case "rain": return <CloudRain size={size} />;
      case "cold": return <Wind size={size} />;
      case "heat": case "hot": return <Sun size={size} />;
      case "cloudy": return <Cloud size={size} />;
      case "sunny": return <Sun size={size} />;
      default: return <Cloud size={size} />;
    }
  };

  const savesCount = Object.keys(liked).length + Object.keys(bookmarked).length;

  const meshBg = {
    backgroundColor: "#F2E4C8",
    backgroundImage: `
      radial-gradient(circle at 78%  6%,  rgba(210,145,40,0.50)  0%, transparent 38%),
      radial-gradient(circle at 12% 12%, rgba(240,195,90,0.30)  0%, transparent 35%),
      radial-gradient(circle at 20% 52%, rgba(235,185,70,0.18)  0%, transparent 30%),
      radial-gradient(circle at 60% 98%, rgba(185,140,55,0.28)  0%, transparent 45%)
    `,
    backgroundRepeat: "no-repeat",
    backgroundAttachment: "fixed",
    minHeight: "100vh",
  };

  // ── Saves page ────────────────────────────────────────────────────────────────
  if (page === "saves") {
    return (
      <div style={meshBg}>
        <SavedItemsPage
          liked={liked}
          bookmarked={bookmarked}
          removeLiked={removeLiked}
          removeBookmarked={removeBookmarked}
          onBack={() => setPage("home")}
          savesCount={savesCount}
          location={location}
          weather={weather}
          weatherUi={weatherUi}
          getWeatherLucideIcon={getWeatherLucideIcon}
          getWeatherLabel={getWeatherLabel}
          handleChangeLocation={handleChangeLocation}
          setPage={setPage}
          getDishImage={getDishImage}
          setRecipeModal={setRecipeModal}
        />
      </div>
    );
  }

  // ── About page ───────────────────────────────────────────────────────────────
  if (page === "about") {
    return (
      <div style={meshBg} className="font-sans">
        <nav style={{ height: 62, position: "sticky", top: 0, zIndex: 100, background: "rgba(242,228,200,0.88)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", borderBottom: "1px solid rgba(200,178,130,0.45)", display: "flex", alignItems: "center", padding: "0 32px" }}>
          <a href="#" onClick={(e) => { e.preventDefault(); setPage("home"); }} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", marginRight: 32 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #E8915A, #C45E3E)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(232,145,90,0.35)" }}>
              <Leaf size={18} stroke="white" strokeWidth={2} />
            </div>
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, fontSize: 20, color: "#1C1813", lineHeight: 1 }}>Nutrix <span style={{ color: "#C9790A" }}>AI</span></div>
              <div style={{ fontSize: 9, color: "#9A8A78", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 2 }}>Your Smart Nutritionist</div>
            </div>
          </a>
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={() => setPage("home")} style={{ padding: "6px 18px", borderRadius: 22, fontSize: 14, fontWeight: 600, color: "#7A6E62", background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Discover</button>
            <button onClick={() => setPage("about")} style={{ padding: "6px 18px", borderRadius: 22, fontSize: 14, fontWeight: 600, color: "#E8915A", background: "#FAE8D8", border: "none", cursor: "pointer", fontFamily: "inherit" }}>About</button>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setPage("saves")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 16px", borderRadius: 22, background: "#3D6B4F", color: "#FDFAF6", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit" }}>
              My Saves {savesCount > 0 && <span style={{ width: 18, height: 18, background: "#E8915A", borderRadius: "50%", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "white" }}>{savesCount}</span>}
            </button>
          </div>
        </nav>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 40px 80px", position: "relative" }}>
          {/* Back Button */}
          <button
            onClick={() => setPage("home")}
            style={{
              position: "absolute", left: 40, top: 0,
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 16px", borderRadius: 20,
              background: "rgba(255,253,249,0.8)", border: "1px solid rgba(200,178,130,0.3)",
              color: "#7A6E62", fontSize: 13, fontWeight: 700, cursor: "pointer",
              transition: "all 0.2s", fontFamily: "inherit"
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#FAE8D8"; e.currentTarget.style.color = "#1C1813"; e.currentTarget.style.transform = "translateX(-4px)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,253,249,0.8)"; e.currentTarget.style.color = "#7A6E62"; e.currentTarget.style.transform = "none"; }}
          >
            <ArrowLeft size={16} />
            Back to Discover
          </button>

          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 56, fontWeight: 700, color: "#1C1813", lineHeight: 1.05, marginBottom: 24, marginTop: 40 }}>
            About Nutrix<span style={{ color: "#C9790A" }}>AI</span>
          </div>
          <p style={{ fontSize: 17, color: "#7A6E62", lineHeight: 1.8, marginBottom: 32, maxWidth: 680 }}>
            NutrixAI is your climate-intelligent nutrition companion. We analyse real-time weather data and your personal symptoms to recommend the most nourishing, locally available meals — perfectly matched to how your body feels right now.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 48 }}>
            {[
              { title: "Weather-Aware", desc: "Recommendations adapt live to temperature, humidity, and conditions outdoors." },
              { title: "Symptom Intelligence", desc: "Tell us how you feel. We match foods to help your body heal and thrive." },
              { title: "Local Kitchens", desc: "We find the nearest restaurants and delivery options for every dish we recommend." },
              { title: "Nutritional Precision", desc: "Every suggestion comes with macros, calories, and ingredient transparency." },
            ].map((f, i) => (
              <div key={i} style={{ background: "rgba(255,253,250,0.92)", backdropFilter: "blur(20px)", borderRadius: 22, padding: "24px 22px", border: "1px solid rgba(0,0,0,0.04)", boxShadow: "0 4px 20px rgba(40,25,10,0.05)" }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: "#1C1813", marginBottom: 8 }}>{f.title}</div>
                <p style={{ fontSize: 13, color: "#7A6E62", lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
          <button onClick={() => setPage("home")} style={{ padding: "12px 28px", borderRadius: 24, background: "#3D6B4F", color: "white", fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer" }}>
            Start Discovering →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={meshBg} className="font-sans">

      {/* ── LOCATION PROMPT ───────────────────────────────────────────────────── */}
      {showLocationPrompt && !locationDismissed && (
        <LocationPrompt
          onAllow={requestLocation}
          onDismiss={() => {
            setShowLocationPrompt(false);
            setLocationDismissed(true);
            if (!location) {
              setLocation("Bengaluru");
              setCoords({ lat: 12.9716, lon: 77.5946 });
              loadInitialWeather("Bengaluru", 12.9716, 77.5946);
            }
          }}
          mode={location ? "change" : "enable"}
          currentLocation={
            location
              ? `${location}${weather.temp !== null ? ` · ${weather.temp}°C` : ""} ${getWeatherLabel(weatherUi.bg_type)}`
              : ""
          }
          onManualConfirm={handleManualLocation}
        />
      )}

      {/* ── NAVBAR ──────────────────────────────────────────────────────────── */}
      <nav style={{
        height: 62, position: "sticky", top: 0, zIndex: 100,
        background: "rgba(242,228,200,0.88)",
        backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)",
        borderBottom: "1px solid rgba(200,178,130,0.45)",
        display: "flex", alignItems: "center", padding: "0 32px", gap: 0,
      }}>
        <a href="#" onClick={(e) => { e.preventDefault(); setPage("home"); }} style={{ display: "flex", alignItems: "center", gap: 11, textDecoration: "none", marginRight: 32 }}>
          <div style={{ width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img src={logoImg} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 800, fontSize: 22, color: "#1C1813", lineHeight: 1.05 }}>
              Nutrix <span style={{ color: "#E8915A" }}>AI</span>
            </div>
            <div style={{ fontSize: 9, color: "#9A8A78", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 2 }}>
              Your Smart Nutritionist
            </div>
          </div>
        </a>

        {/* Global Navigation - Segmented Control */}
        <div style={{ display: "flex", alignItems: "center", gap: 2, background: "rgba(200,178,130,0.12)", padding: "4px 5px", borderRadius: 24, position: "relative" }}>
          {["home", "about"].map((p) => {
            const isActive = page === p;
            const label = p === "home" ? "Discover" : "About";
            return (
              <button
                key={p}
                onClick={() => setPage(p)}
                style={{
                  padding: "6px 16px", borderRadius: 20, fontSize: 13.5, fontWeight: 600,
                  color: isActive ? "#1C1813" : "#7A6E62",
                  background: "transparent", border: "none", cursor: "pointer",
                  fontFamily: "inherit", position: "relative", zIndex: 1,
                  transition: "color 0.15s"
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-nav-pill"
                    style={{
                      position: "absolute", inset: 0,
                      background: "rgba(255,255,255,0.95)", borderRadius: 20,
                      boxShadow: "0 2px 8px rgba(40,25,10,0.07), 0 1px 0 rgba(255,255,255,0.9)",
                      zIndex: -1
                    }}
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  />
                )}
                {label}
              </button>
            )
          })}
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "4px 4px 4px 14px", borderRadius: 24,
            background: "rgba(255,249,238,0.75)",
            border: "1px solid rgba(200,178,130,0.5)",
            fontSize: 12.5, color: "#1C1813", whiteSpace: "nowrap"
          }}>
            <MapPin size={13} style={{ color: "#E8915A", flexShrink: 0 }} />
            <span style={{ fontWeight: 600, color: "#1C1813" }}>{location || "Locating…"}</span>
            {location && (
              <button onClick={handleChangeLocation} style={{ background: "none", border: "none", fontSize: 10, color: "#E8915A", fontWeight: 800, letterSpacing: "0.04em", cursor: "pointer", marginRight: 4, padding: 0, fontFamily: "inherit" }}>
                CHANGE
              </button>
            )}

            {/* Weather Tag - Clickable to show simulation filters */}
            <div 
              onClick={() => setShowWeatherFilter(!showWeatherFilter)}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "5px 12px", borderRadius: 18,
                background: "linear-gradient(135deg, rgba(232,145,90,0.08) 0%, rgba(201,121,10,0.04) 100%)",
                border: "1px solid rgba(232,145,90,0.13)",
                color: "#C9790A", marginLeft: "auto", cursor: "pointer",
                position: "relative"
              }}
            >
              {getWeatherLucideIcon(weatherUi.bg_type, 14)}
              <span style={{ fontWeight: 800, color: "#1C1813", fontSize: 13, marginLeft: 1 }}>
                {weather.temp !== null ? `${weather.temp}°C` : "25°C"}
              </span>
              <span style={{ fontSize: 11, fontWeight: 500, color: "#7A6E62", marginLeft: 1 }}>
                {weatherUi.mode ? weatherUi.mode.split("•")[0].trim().split(" ")[0] : getWeatherLabel(weatherUi.bg_type)}
              </span>
              <ChevronDown size={12} style={{ transform: showWeatherFilter ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />

              {/* Weather Simulation Dropdown */}
              <AnimatePresence>
                {showWeatherFilter && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    style={{
                      position: "absolute", top: "calc(100% + 10px)", right: 0,
                      background: "white", borderRadius: 16, boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                      border: "1px solid rgba(200,178,130,0.3)", padding: "8px", zIndex: 1000,
                      minWidth: 160, display: "flex", flexDirection: "column", gap: 4
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    <div style={{ fontSize: 10, fontWeight: 800, color: "#9A8A78", padding: "4px 8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Simulate Weather</div>
                    {[
                      { type: "pleasant", label: "Pleasant", icon: <Cloud size={14} /> },
                      { type: "hot", label: "Hot & Sunny", icon: <Sun size={14} /> },
                      { type: "rain", label: "Rainy Day", icon: <CloudRain size={14} /> },
                      { type: "cold", label: "Cold/Misty", icon: <Wind size={14} /> }
                    ].map(w => (
                      <button 
                        key={w.type}
                        onClick={() => simulateWeather(w.type)}
                        style={{
                          display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
                          borderRadius: 10, border: "none", background: simulatedWeather === w.type ? "rgba(232,145,90,0.1)" : "transparent",
                          color: simulatedWeather === w.type ? "#E8915A" : "#1C1813",
                          fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "left"
                        }}
                      >
                        {w.icon}
                        {w.label}
                      </button>
                    ))}
                    {simulatedWeather && (
                      <button 
                        onClick={() => { setSimulatedWeather(null); setShowWeatherFilter(false); loadInitialWeather(location, coords.lat, coords.lon); }}
                        style={{
                          marginTop: 4, padding: "8px 12px", borderRadius: 10, border: "none",
                          background: "#FAE8D8", color: "#C45E3E", fontSize: 11, fontWeight: 800,
                          cursor: "pointer", textTransform: "uppercase"
                        }}
                      >
                        Reset to Local
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <button onClick={() => setPage("saves")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 16px", borderRadius: 22, background: "#3D6B4F", color: "#FDFAF6", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", transition: "all 0.2s", fontFamily: "inherit" }}
            onMouseEnter={e => { e.currentTarget.style.background = "#2E5540"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#3D6B4F"; e.currentTarget.style.transform = "none"; }}
          >
            My Saves
            {savesCount > 0 && (
              <span style={{ width: 18, height: 18, background: "#E8915A", borderRadius: "50%", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "white" }}>
                {savesCount}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <div style={{ padding: "44px 40px 0", maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 40, gap: 32, position: "relative" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 13px", borderRadius: 20, background: "rgba(34,165,90,0.10)", border: "1px solid rgba(34,165,90,0.25)", color: "#1a8a48", fontSize: 10.5, fontWeight: 600, letterSpacing: "0.04em" }}>
                <span style={{ width: 7, height: 7, background: "#22A55A", borderRadius: "50%", flexShrink: 0, display: "inline-block" }} />
                Real-Time Analysis
                <span style={{ background: "#22A55A", color: "white", fontSize: 9, fontWeight: 800, padding: "1px 6px", borderRadius: 6, letterSpacing: "0.06em", marginLeft: 2 }}>LIVE</span>
              </span>
            </div>

            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 58, fontWeight: 600, color: "#1C1813", lineHeight: 1.1, maxWidth: 560, letterSpacing: "-0.01em", whiteSpace: "pre-line" }}>
              {heroHeadline}
            </div>

            <p style={{ fontSize: 16.5, color: "#3A2E22", marginTop: 14, lineHeight: 1.55, maxWidth: 490, fontWeight: 500 }}>
              Tell us how you feel or describe a symptom, and we’ll match you with the best local food for your body and weather.
            </p>

            {/* FIX 1: Only Any Diet + Vegetarian — Non-Veg removed (no non-veg data) */}
            <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
              {["Any Diet", "Vegetarian"].map((d) => {
                const dietKey = d === "Any Diet" ? "all" : "vegetarian";
                const isActive = diet === dietKey;
                return (
                  <button key={d} onClick={() => setDiet(dietKey)} style={{ padding: "7px 15px", borderRadius: 22, fontSize: 12.5, fontWeight: 600, border: isActive ? "1.5px solid #3D6B4F" : "1.5px solid rgba(200,178,130,0.6)", background: isActive ? "#3D6B4F" : "rgba(255,249,238,0.75)", color: isActive ? "white" : "#7A6E62", cursor: "pointer", transition: "all 0.2s", fontFamily: "inherit" }}>
                    {d}
                  </button>
                );
              })}
            </div>

            {/* ADD 1: Meal Time filter row */}
            <div style={{ display: "flex", gap: 7, marginTop: 10, flexWrap: "wrap" }}>
              {["Any Time", "Breakfast", "Lunch", "Dinner"].map((t) => {
                const isActive = mealTime === t;
                return (
                  <button key={t} onClick={() => setMealTime(t)} style={{ padding: "5px 13px", borderRadius: 20, fontSize: 11.5, fontWeight: 600, border: isActive ? "1.5px solid #C9790A" : "1.5px solid rgba(200,178,130,0.5)", background: isActive ? "rgba(201,121,10,0.12)" : "rgba(255,249,238,0.75)", color: isActive ? "#C9790A" : "#7A6E62", cursor: "pointer", transition: "all 0.2s", fontFamily: "inherit" }}>
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ flexShrink: 0, width: 480, height: 480, position: "relative" }}>
            <img src={heroImage} alt="Hero food" style={{ width: "100%", height: "100%", objectFit: "contain", filter: "drop-shadow(0 24px 48px rgba(40,25,10,0.22)) drop-shadow(0 8px 16px rgba(40,25,10,0.14))" }} />
          </div>
        </div>
      </div>

      {/* ── MAIN LAYOUT ──────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 40px 72px", display: "grid", gridTemplateColumns: "400px 1fr", gap: 32 }}>

        {/* LEFT: Chat */}
        <div style={{ position: "sticky", top: 78, height: "fit-content" }}>
          <div style={{ background: "rgba(255,251,245,0.78)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderRadius: 28, overflow: "hidden", boxShadow: "0 8px 40px rgba(40,25,10,0.08), 0 1px 0 rgba(255,255,255,0.9) inset", border: "1px solid rgba(0,0,0,0.05)" }}>
            {/* Header */}
            <div style={{ padding: "18px 20px", background: "rgba(255,249,238,0.65)", borderBottom: "1px solid rgba(200,178,130,0.22)", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: "linear-gradient(135deg, #E8915A, #C45E3E)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(232,145,90,0.4)", flexShrink: 0 }}>
                <Bot size={22} stroke="white" strokeWidth={1.8} />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: "#1C1813", fontSize: 15 }}>Food Genius</div>
                <div style={{ fontSize: 9.5, color: "#E8915A", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 2 }}>Neural Engine</div>
              </div>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 7, height: 7, background: "#22A55A", borderRadius: "50%", display: "inline-block" }} />
                <span style={{ fontSize: 11, color: "#22A55A", fontWeight: 700 }}>LIVE</span>
                <button onClick={() => { setChatHistory([]); setContext(null); setResults([]); }} style={{ marginLeft: 8, background: "none", border: "none", cursor: "pointer", color: "#9A8A78", display: "flex", alignItems: "center" }} title="Reset">
                  <RefreshCcw size={14} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div style={{ padding: "14px 16px", height: 264, overflowY: "auto", display: "flex", flexDirection: "column", gap: 9 }}>
              {chatHistory.length === 0 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#9A8A78", fontSize: 12.5, textAlign: "center", fontStyle: "italic" }}>
                  Tell me how you feel or describe a craving…
                </div>
              )}
              {chatHistory.map((msg, i) => {
                const isDisclaimer = msg.note_type === "disclaimer";
                const isSystem = msg.type === "system";
                const isUser = msg.type === "user";

                let bg = "rgba(255,253,249,0.90)";
                let border = "1px solid rgba(200,178,130,0.18)";
                let color = "#1C1813";

                if (isUser) {
                  bg = "rgba(232,145,90,0.15)";
                  border = "1px solid rgba(232,145,90,0.12)";
                } else if (isDisclaimer) {
                  bg = "rgba(254,244,232,0.95)";
                  border = "1px solid rgba(232,145,90,0.4)";
                  color = "#C45E3E";
                }

                return (
                  <div key={i} style={{ 
                    padding: "10px 13px", 
                    borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px", 
                    background: bg, 
                    border: border, 
                    alignSelf: isUser ? "flex-end" : "flex-start", 
                    maxWidth: "90%", 
                    fontSize: 12.5, 
                    lineHeight: 1.55, 
                    color: color,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 6
                  }}>
                    {isDisclaimer && <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 2, color: "#C45E3E" }} />}
                    <span>{msg.text}</span>
                  </div>
                )
              })}
              {loading && (
                <div style={{ padding: "10px 13px", borderRadius: "16px 16px 16px 4px", background: "rgba(255,253,249,0.90)", border: "1px solid rgba(200,178,130,0.18)", alignSelf: "flex-start", display: "flex", gap: 5 }}>
                  {[0, 0.2, 0.4].map((d, idx) => (
                    <span key={idx} style={{ width: 7, height: 7, background: "#E8915A", borderRadius: "50%", display: "inline-block" }} />
                  ))}
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div style={{ padding: "12px 16px 16px", borderTop: "1px solid rgba(200,178,130,0.22)", display: "flex", alignItems: "center", gap: 7 }}>
              <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder="Describe your symptoms..."
                style={{ flex: 1, background: "rgba(255,253,249,0.95)", border: "1px solid rgba(200,178,130,0.30)", borderRadius: 14, padding: "9px 13px", color: "#1C1813", fontSize: 12.5, fontFamily: "Inter, sans-serif", outline: "none", transition: "all 0.2s" }}
                onFocus={e => { e.target.style.borderColor = "#E8915A"; e.target.style.background = "white"; e.target.style.boxShadow = "0 0 0 3px rgba(232,145,90,0.10)"; }}
                onBlur={e => { e.target.style.borderColor = "rgba(200,178,130,0.30)"; e.target.style.background = "rgba(255,253,249,0.95)"; e.target.style.boxShadow = "none"; }}
              />
              <button onClick={handleVoiceInput} style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid rgba(200,178,130,0.30)", background: isListening ? "#E8915A" : "rgba(255,251,245,0.9)", color: isListening ? "white" : "#7A6E62", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>
                <Mic size={16} />
              </button>
              <button onClick={() => handleSend()} style={{ width: 36, height: 36, borderRadius: 10, border: "none", background: "linear-gradient(135deg, #E8915A, #C45E3E)", color: "white", boxShadow: "0 3px 10px rgba(232,145,90,0.4)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 15, transition: "all 0.2s" }}>
                <Send size={15} />
              </button>
            </div>
          </div>

          {/* FIX 2: bottom chips removed */}
        </div>

        {/* RIGHT: Food Feed */}
        <div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 32 }}>
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 44, fontWeight: 700, color: "#1C1813", lineHeight: 1 }}>Today's Selection</div>
              <div style={{ fontSize: 11, color: "#9A8A78", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 3 }}>Optimised for your local climate</div>
            </div>
            {results.length > 5 && !showAllResults && (
              <button 
                onClick={(e) => { e.preventDefault(); setShowAllResults(true); }} 
                style={{ fontSize: 13, color: "#E8915A", fontWeight: 700, textDecoration: "none", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
              >
                See All ({results.length}) →
              </button>
            )}
          </div>

          {results.length === 0 && (
            <div style={{ borderRadius: 28, border: "2px dashed rgba(200,178,130,0.4)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 60, textAlign: "center", minHeight: 430, background: "rgba(255,253,250,0.5)" }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: "#FAE8D8", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                <Utensils size={28} style={{ color: "#E8915A" }} className={loading ? "animate-pulse" : ""} />
              </div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 600, color: "#9A8A78", marginBottom: 8, transition: "all 0.3s" }}>
                {loading ? "Reviewing local menus…" : 
                 (lastQuery && lastQuery !== "weather") ? "No recommendations found" : "Waiting for your query…"}
              </div>
              <p style={{ fontSize: 13, color: "#9A8A78", maxWidth: 330, lineHeight: 1.5, opacity: 0.85 }}>
                {loading ? "Matching current weather and coordinates with our local Indian food matrix to find the best recommendations." : 
                 (lastQuery && lastQuery !== "weather") ? `We couldn't find items that match your request for "${lastQuery}" on a ${diet === "vegetarian" ? "Vegetarian" : "Any Diet"} plan.` : 
                 "Describe a symptom or what you are craving to generate your personalised nutrition plan."}
              </p>
            </div>
          )}

          {(showAllResults ? results : results.slice(0, 5)).map((item, index) => (
            <NutrixFoodCard key={index} item={item} index={index} getDishImage={getDishImage} liked={liked} bookmarked={bookmarked} toggleLike={toggleLike} toggleBookmark={toggleBookmark} onViewRecipe={() => setRecipeModal(item)} />
          ))}
          
          {results.length > 5 && !showAllResults && (
            <button 
              onClick={() => setShowAllResults(true)} 
              style={{ width: "100%", padding: "16px", borderRadius: 22, background: "rgba(232,145,90,0.12)", color: "#E8915A", fontSize: 14, fontWeight: 700, border: "1.5px dashed rgba(232,145,90,0.4)", cursor: "pointer", transition: "all 0.2s", marginTop: 12 }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(232,145,90,0.18)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(232,145,90,0.12)"; }}
            >
              Show {results.length - 5} more items
            </button>
          )}
        </div>
      </div>

      {/* Recipe Modal */}
      <RecipeModal recipeModal={recipeModal} setRecipeModal={setRecipeModal} getDishImage={getDishImage} />
    </div>
  );
}
