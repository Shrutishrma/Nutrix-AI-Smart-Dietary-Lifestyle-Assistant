import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Bookmark, Utensils, Heart, Share2, RefreshCw } from "lucide-react";

// ─── SVG Match Score Ring ─────────────────────────────────────────────────────
function MatchRing({ score }) {
  const r = 28;
  const circ = 2 * Math.PI * r; // 175.93
  const offset = circ - (score / 100) * circ;

  const ringColor = score >= 90 ? "#3D6B4F" : score >= 75 ? "#E8915A" : "#C9790A";

  return (
    <div style={{
      position: "absolute", top: 12, right: 12,
      background: "rgba(253,250,246,0.95)", borderRadius: "50%",
      padding: 3, backdropFilter: "blur(6px)",
      boxShadow: "0 2px 10px rgba(60,40,20,0.15)", zIndex: 2,
    }}>
      <div style={{ position: "relative", width: 66, height: 66 }}>
        <svg width="66" height="66" viewBox="0 0 66 66" style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
          <circle cx="33" cy="33" r={r} fill="none" stroke="#E0D4C4" strokeWidth="4" />
          <circle
            cx="33" cy="33" r={r} fill="none"
            stroke={ringColor} strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1.2s ease" }}
          />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 700, color: "#1C1813", lineHeight: 1 }}>{score}</span>
          <span style={{ fontSize: 7, color: "#9A8A78", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", marginTop: 1 }}>MATCH</span>
        </div>
      </div>
    </div>
  );
}

// ─── Macro bar ────────────────────────────────────────────────────────────────
function MacroBar({ label, value, unit, color, pct }) {
  const barRef = useRef(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (barRef.current) barRef.current.style.width = pct + "%";
    }, 500);
    return () => clearTimeout(timer);
  }, [pct]);

  return (
    <div style={{
      background: "rgba(255,253,249,0.75)", borderRadius: 14, padding: "10px 8px",
      border: "1px solid rgba(0,0,0,0.04)", textAlign: "center",
      transition: "all 0.2s",
    }}>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 700, color: "#1C1813", lineHeight: 1 }}>
        {value}{unit}
      </div>
      <div style={{ height: 3, borderRadius: 3, background: "rgba(200,178,130,0.4)", margin: "5px 0 4px", overflow: "hidden" }}>
        <div ref={barRef} style={{ height: "100%", borderRadius: 3, background: color, width: 0, transition: "width 1.1s ease" }} />
      </div>
      <div style={{ fontSize: 8.5, color: "#9A8A78", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600 }}>
        {label}
      </div>
    </div>
  );
}

// ─── Restaurant row ───────────────────────────────────────────────────────────
function RestaurantRow({ restaurant, dishName, liked, toggleLike }) {
  const name = restaurant.name || restaurant.res_name || "Restaurant";
  const { rating, business_status, price_label, exact_price, exact_item } = restaurant;
  const isOpen = business_status === "OPERATIONAL";

  // Build the same composite key used in useSavedItems
  const likeKey = (name || "") + (dishName ? "__" + dishName : "");
  const resLiked = Boolean(liked && liked[likeKey]);

  const handleHeartClick = (e) => {
    e.stopPropagation();
    if (toggleLike) toggleLike(restaurant, dishName);
  };

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 12px", borderRadius: 12,
      background: "rgba(255,253,249,0.75)", border: "1px solid rgba(0,0,0,0.04)",
      marginTop: 8, cursor: "pointer", transition: "all 0.2s",
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "#E8915A"; e.currentTarget.style.transform = "translateX(3px)"; e.currentTarget.style.boxShadow = "0 3px 12px rgba(232,145,90,0.1)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.04)"; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
    >
      {/* Icon */}
      <div style={{ width: 32, height: 32, borderRadius: 8, background: "#FAE8D8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#E8915A" }}>
        <Utensils size={16} />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 12.5, color: "#1C1813" }}>
          {name} <span style={{ color: "#7A6E62", fontWeight: 700 }}>{price_label ? `· ${price_label}` : ""}</span>
        </div>
        <div style={{ fontSize: 10, color: "#9A8A78", marginTop: 2, display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
          {rating > 0 && <span>★ {rating.toFixed(1)}</span>}
          {isOpen && <span style={{ color: "#3D6B4F", fontWeight: 600 }}>Open Now</span>}
          {exact_price > 0 && <span>{exact_item || dishName} · ₹{exact_price}</span>}
          {/* FIX 2: distance field */}
          {restaurant.distance != null && restaurant.distance > 0
            ? <span style={{ color: "#7A6E62" }}>📍 {restaurant.distance} km away</span>
            : <span style={{ color: "#7A6E62" }}>📍 Bangalore</span>}
        </div>
      </div>

      {/* Actions: heart + Zomato + Swiggy */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        {/* Heart button — connected to global liked state */}
        <button
          onClick={handleHeartClick}
          title={resLiked ? "Remove from favourites" : "Add to favourites"}
          style={{
            width: 28, height: 28, borderRadius: 7, flexShrink: 0,
            border: resLiked ? "1.5px solid #E23744" : "1.5px solid rgba(200,178,130,0.5)",
            background: resLiked ? "#FFF0F0" : "transparent",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            color: resLiked ? "#E23744" : "#9A8A78",
            transition: "all 0.2s",
          }}
        >
          <Heart size={13} fill={resLiked ? "currentColor" : "none"} strokeWidth={2} />
        </button>

        {/* Google Find & Order */}
        <a href={restaurant.google_url || "#"}
          target="_blank" rel="noopener noreferrer"
          style={{ padding: "4px 12px", borderRadius: 7, fontSize: 9.5, fontWeight: 800, background: "#E8F0FE", color: "#1A73E8", border: "none", cursor: "pointer", letterSpacing: "0.04em", textDecoration: "none", transition: "all 0.2s", whiteSpace: "nowrap" }}
          onMouseEnter={e => { e.currentTarget.style.background = "#1A73E8"; e.currentTarget.style.color = "white"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "#E8F0FE"; e.currentTarget.style.color = "#1A73E8"; }}
        >Find & Order</a>
      </div>
    </div>
  );
}

// ─── Main food card component ─────────────────────────────────────────────────
const cardDelays = [0.1, 0.25, 0.4, 0.55, 0.7];

export function NutrixFoodCard({ item, index, getDishImage, liked, bookmarked, toggleLike, toggleBookmark, onViewRecipe }) {
  const [nearbyOpen, setNearbyOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [copied, setCopied] = useState(false);
  const nearbyRef = useRef(null);

  const handleShare = () => {
    const dish = item.dish;
    const rest = item.restaurants?.[0]?.name;
    const text = `NutrixAI recommended ${dish} for me! ${rest ? `Try it at ${rest}, Bangalore.` : "Great for your health!"} Try NutrixAI for personalized food recommendations.`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const score = Math.min(99, Math.round(item.score || 80));
  const [imgSrc, setImgSrc] = useState(item.image || null);
  const [imgError, setImgError] = useState(false);
  const [isRegening, setIsRegening] = useState(false);
  const delay = cardDelays[index] || 0.1;

  const handleRegenImage = async (e) => {
    e.stopPropagation();
    setIsRegening(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/regen-image?dish=${encodeURIComponent(item.dish)}`, {
        method: "POST"
      }).then(r => r.json());
      if (res.url) {
        setImgSrc(res.url);
        setImgError(false);
      }
    } catch (err) {
      console.error("Regen image error:", err);
    } finally {
      setIsRegening(false);
    }
  };

  useEffect(() => {
    setImgSrc(item.image || null);
    setImgError(false);
  }, [item.image]);

  const nutrition = item.nutrition || {};
  const isHealthy = nutrition.calories > 0 && nutrition.calories < 400;
  const isHighProtein = (nutrition.protein || 0) > 12;
  const isProduce = item.food_category === "FRUIT" || item.food_category === "VEGETABLE";
  const isHomemade = item.food_category === "HOMEMADE";

  const macros = [
    { label: "Protein", value: Math.round(nutrition.protein || 0), unit: "g", color: "#E8915A", pct: Math.min(100, (nutrition.protein || 0) * 5) },
    { label: "Carbs", value: Math.round(nutrition.carbohydrates || 0), unit: "g", color: "#3D6B4F", pct: Math.min(100, (nutrition.carbohydrates || 0) * 1.6) },
    { label: "Fats", value: Math.round(nutrition.fats || 0), unit: "g", color: "#C9790A", pct: Math.min(100, (nutrition.fats || 0) * 4) },
    { label: "Fiber", value: Math.round(nutrition.fiber || 0), unit: "g", color: "#7B9E87", pct: Math.min(100, (nutrition.fiber || 0) * 10) },
  ];

  const tags = item.health_tags?.length > 0 ? item.health_tags.slice(0, 3) : ["Healthy Choice"];
  const tagStyles = [
    { background: "#D4EDE0", color: "#2E5540" },
    { background: "#D4EDE0", color: "#2E5540" },
    { background: "#FEF0D0", color: "#7A4A05" },
  ];

  const badge = item.place_type === "grocery" ? "GROCERY" : item.recipe ? "HOME RECIPE" : "NEARBY";
  const restaurants = item.restaurants || [];

  useEffect(() => {
    if (nearbyRef.current) {
      nearbyRef.current.style.maxHeight = nearbyOpen ? "800px" : "0px";
      nearbyRef.current.style.opacity = nearbyOpen ? "1" : "0";
    }
  }, [nearbyOpen]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay }}
      style={{
        background: "rgba(255,253,250,0.92)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRadius: 28,
        border: "1px solid rgba(0,0,0,0.04)",
        overflow: "hidden",
        marginBottom: 28,
        display: "grid",
        gridTemplateColumns: "300px 1fr",
        boxShadow: hovered
          ? "0 20px 60px rgba(40,25,10,0.09), 0 1px 0 rgba(255,255,255,0.95) inset"
          : "0 8px 40px rgba(40,25,10,0.06), 0 1px 0 rgba(255,255,255,0.95) inset",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        transition: "transform 0.3s, box-shadow 0.3s",
        minHeight: 320,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Left: image ─────────────────────────────────────────────────────── */}
      <div style={{ position: "relative", overflow: "hidden", minHeight: 320 }}>
        {/* Regen Image Button */}
        <button
          onClick={handleRegenImage}
          disabled={isRegening}
          title="Regenerate Image if incorrect"
          style={{
            position: "absolute", bottom: 12, right: 12, zIndex: 10,
            width: 36, height: 36, borderRadius: "50%",
            background: "rgba(255,255,255,0.8)", backdropFilter: "blur(4px)",
            border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            transition: "all 0.2s",
            color: isRegening ? "#E8915A" : "#1C1813"
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = "rotate(180deg)"; e.currentTarget.style.background = "white"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.background = "rgba(255,255,255,0.8)"; }}
        >
          <RefreshCw size={18} className={isRegening ? "animate-spin" : ""} />
        </button>

        {/* Dynamic Badges */}
        <div style={{
          position: "absolute", top: 12, right: 12, zIndex: 10,
          display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end"
        }}>
          {isHealthy && (
            <div style={{
              background: "#4CAF50", color: "#fff",
              padding: "4px 10px", borderRadius: 100, fontSize: "0.65rem",
              fontWeight: 800, letterSpacing: "0.03em",
              boxShadow: "0 4px 12px rgba(76, 175, 80, 0.3)"
            }}>
              🥗 LOW CAL
            </div>
          )}
          {isHighProtein && (
            <div style={{
              background: "#FF9800", color: "#fff",
              padding: "4px 10px", borderRadius: 100, fontSize: "0.65rem",
              fontWeight: 800, letterSpacing: "0.03em",
              boxShadow: "0 4px 12px rgba(255, 152, 0, 0.3)"
            }}>
              💪 PRO+
            </div>
          )}
        </div>

        {imgSrc && !imgError ? (
          <img
            src={imgSrc}
            alt={item.dish}
            style={{
              width: "100%", height: "100%", objectFit: "cover",
              position: "absolute", inset: 0,
              transition: "transform 0.5s ease",
              transform: hovered ? "scale(1.04)" : "scale(1)",
            }}
            onError={() => setImgError(true)}
          />
        ) : (
          <div style={{
            background: getDishColor(item.dish),
            display: "flex", flex: 1, height: "100%", width: "100%",
            alignItems: "center", justifyContent: "center",
            fontSize: "4rem", position: "absolute", inset: 0
          }}>
            {getDishEmoji(item.dish)}
          </div>
        )}
        {/* Overlay */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, transparent 55%, rgba(28,24,19,0.15)), linear-gradient(to top, rgba(28,24,19,0.5) 0%, transparent 45%)" }} />
        {/* Badge top-left */}
        <div style={{
          position: "absolute", top: 12, left: 12,
          padding: "4px 11px", borderRadius: 20,
          background: "rgba(253,250,246,0.92)", backdropFilter: "blur(4px)",
          fontSize: 10, fontWeight: 700, color: "#1C1813", letterSpacing: "0.04em", zIndex: 2,
        }}>
          {badge}
        </div>
        {/* Score ring */}
        <MatchRing score={score} />
      </div>

      {/* ── Right: content ──────────────────────────────────────────────────── */}
      <div style={{ padding: "20px 22px 18px", display: "flex", flexDirection: "column" }}>
        {/* Dish Name Header */}
        <div style={{ marginBottom: 12 }}>
          <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 700, color: "#1C1813", lineHeight: 1.1, margin: 0 }}>
            {item.dish}
          </h3>
          {item.description && (
            <div style={{ fontSize: 11.5, color: "#7A6E62", marginTop: 3, fontWeight: 500 }}>
              {item.description}
            </div>
          )}
        </div>

        {/* Tags */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 15 }}>
          {tags.map((tag, i) => (
            <span key={i} style={{
              padding: "4px 11px", borderRadius: 20, fontSize: 11, fontWeight: 600,
              ...tagStyles[i % tagStyles.length],
            }}>{tag}</span>
          ))}
          {nutrition.calories > 0 && (
            <span style={{ padding: "4px 11px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: "#FEF0D0", color: "#7A4A05" }}>
              {Math.round(nutrition.calories)} Cal
            </span>
          )}
          {(item.restaurants?.[0]?.business_status === "OPERATIONAL") && (
            <span style={{ padding: "4px 11px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: "#D4EDE0", color: "#3D6B4F" }}>Open Now</span>
          )}
        </div>

        {/* Macros grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 9, marginBottom: 16 }}>
          {macros.map((m) => (
            <MacroBar key={m.label} {...m} />
          ))}
        </div>

        {/* Nearby Restaurants Section */}
        {!isHomemade && (
          <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: 12, marginBottom: 16 }}>
            <span style={{ fontSize: 11, color: "#9A8A78", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 3 }}>
              {isProduce ? "Best Fresh Sources" : `Nearby Places (${restaurants.length})`}
            </span>
            
            {restaurants.length > 0 ? (
              <>
                {/* 1. Always Visible items (up to 2) */}
                {restaurants.slice(0, 2).map((r, i) => (
                  <RestaurantRow key={i} restaurant={r} dishName={item.dish} liked={liked} toggleLike={toggleLike} />
                ))}

                {/* 2. Collapsible items (from index 2 onwards) */}
                {restaurants.length > 2 && (
                  <>
                    <div ref={nearbyRef} style={{ overflow: "hidden", maxHeight: nearbyOpen ? "600px" : "0px", opacity: nearbyOpen ? 1 : 0, transition: "all 0.35s ease" }}>
                      {restaurants.slice(2).map((r, i) => (
                        <RestaurantRow key={i + 2} restaurant={r} dishName={item.dish} liked={liked} toggleLike={toggleLike} />
                      ))}
                    </div>
                    <button onClick={() => setNearbyOpen(!nearbyOpen)} style={{ background: "none", border: "none", color: "#E8915A", fontSize: 12, fontWeight: 700, padding: "8px 0 0", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>
                      {nearbyOpen ? "Show Less ▲" : `Show More (+${restaurants.length - 2}) ▼`}
                    </button>
                  </>
                )}
              </>
            ) : (
              <div style={{ padding: "10px 12px", borderRadius: 12, background: "rgba(232,145,90,0.05)", border: "1px dashed rgba(232,145,90,0.3)", color: "#7A6E62", fontSize: 11.5, lineHeight: 1.4 }}>
                {isProduce ? "Available at your local fruit market or grocery store." : "Check your local market for fresh ingredients."}
              </div>
            )}
          </div>
        )}

        {/* Footer: View Recipe + Bookmark */}
        <div style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: 9 }}>
          <button onClick={onViewRecipe} style={{
            flex: 1, padding: 11, borderRadius: 13,
            background: "#1C1813", color: "#FDFAF6",
            fontSize: 12.5, fontWeight: 700, border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            transition: "all 0.2s", fontFamily: "inherit",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = "#E8915A"; e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(232,145,90,0.35)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#1C1813"; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
          >
            View Recipe ›
          </button>
          <button onClick={() => toggleBookmark(item)} style={{
            width: 42, height: 42, borderRadius: 12,
            border: (bookmarked && bookmarked[item.dish]) ? "1.5px solid #E8915A" : "1.5px solid rgba(200,178,130,0.6)",
            background: (bookmarked && bookmarked[item.dish]) ? "#FAE8D8" : "rgba(255,249,238,0.75)",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            color: (bookmarked && bookmarked[item.dish]) ? "#E8915A" : "#7A6E62", transition: "all 0.2s",
          }}>
            <Bookmark size={18} fill={(bookmarked && bookmarked[item.dish]) ? "currentColor" : "none"} />
          </button>

          <button onClick={handleShare} style={{
            width: 42, height: 42, borderRadius: 12,
            border: "1.5px solid rgba(200,178,130,0.6)",
            background: copied ? "#D4EDE0" : "rgba(255,249,238,0.75)",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            color: copied ? "#3D6B4F" : "#7A6E62", transition: "all 0.2s",
          }} title="Share this recommendation">
            {copied ? <span style={{ fontSize: 10, fontWeight: 700 }}>Copied!</span> : <Share2 size={16} />}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// Emoji fallback — always relevant, never wrong
const getDishEmoji = (dish) => {
  const d = (dish || '').toLowerCase();
  if (d.includes('tea') || d.includes('coffee')) return '☕';
  if (d.includes('soup') || d.includes('rasam')) return '🍲';
  if (d.includes('rice') || d.includes('biryani')) return '🍚';
  if (d.includes('idli') || d.includes('dosa')) return '🫓';
  if (d.includes('fruit') || d.includes('bowl')) return '🍱';
  if (d.includes('water') || d.includes('juice')) return '🥤';
  if (d.includes('egg')) return '🥚';
  if (d.includes('chicken') || d.includes('fish')) return '🍗';
  if (d.includes('banana') || d.includes('mango')) return '🍌';
  return '🍽️';
};

// Color based on food type
const getDishColor = (dish) => {
  const d = (dish || '').toLowerCase();
  if (d.includes('tea') || d.includes('soup')) return '#8B4513';
  if (d.includes('rice') || d.includes('idli')) return '#F5F5DC';
  if (d.includes('fruit') || d.includes('juice')) return '#FF6B6B';
  if (d.includes('dal') || d.includes('khichdi')) return '#DAA520';
  return '#E8D5B7';
};
