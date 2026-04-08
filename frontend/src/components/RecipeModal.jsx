import { X, Bookmark } from "lucide-react";
import { useState } from "react";

const PLACEHOLDER = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80";

export const RecipeModal = ({ recipeModal, setRecipeModal, getDishImage }) => {
  const [bookmarked, setBookmarked] = useState(false);
  if (!recipeModal) return null;

  const item = recipeModal;
  const imgSrc = getDishImage(item);
  const nutrition = item.nutrition || {};
  const macros = [
    { label: "Protein", value: Math.round(nutrition.protein || 0), unit: "g", color: "#E8915A", pct: Math.min(100, (nutrition.protein || 0) * 5) },
    { label: "Carbs",   value: Math.round(nutrition.carbohydrates || 0), unit: "g", color: "#3D6B4F", pct: Math.min(100, (nutrition.carbohydrates || 0) * 1.6) },
    { label: "Fats",    value: Math.round(nutrition.fats || 0), unit: "g", color: "#C9790A", pct: Math.min(100, (nutrition.fats || 0) * 4) },
    { label: "Fiber",   value: Math.round(nutrition.fiber || 0), unit: "g", color: "#7B9E87", pct: Math.min(100, (nutrition.fiber || 0) * 10) },
  ];

  const tags = item.health_tags?.length > 0 ? item.health_tags.slice(0, 3) : ["Healthy Choice"];
  const tagStyles = [
    { background: "#D4EDE0", color: "#2E5540" },
    { background: "#D4EDE0", color: "#2E5540" },
    { background: "#FEF0D0", color: "#7A4A05" },
  ];

  const ingredients = item.recipe?.ingredients || [];
  const steps = item.recipe?.instructions || item.recipe?.steps || [];

  return (
    <div
      onClick={() => setRecipeModal(null)}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(28,24,19,0.45)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        zIndex: 999,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "rgba(253,251,248,0.96)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderRadius: 26,
          border: "1px solid rgba(210,196,178,0.5)",
          width: 680, maxWidth: "95vw",
          maxHeight: "88vh", overflowY: "auto",
          boxShadow: "0 32px 80px rgba(0,0,0,0.18)",
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(200,178,130,0.4) transparent",
        }}
      >
        {/* Image strip */}
        <div style={{ position: "relative", height: 220, overflow: "hidden", borderRadius: "26px 26px 0 0" }}>
          <img
            src={imgSrc}
            alt={item.dish}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => { e.target.src = PLACEHOLDER; }}
          />
          {/* Gradient overlay */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(28,24,19,0.6) 0%, transparent 50%)" }} />

          {/* Recipe name bottom-left */}
          <div style={{ position: "absolute", bottom: 16, left: 22, right: 22 }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 700, color: "#FDFAF6", lineHeight: 1 }}>
              {item.dish}
            </div>
            {item.description && (
              <div style={{ fontSize: 12, color: "rgba(253,250,246,0.65)", marginTop: 3 }}>{item.description}</div>
            )}
          </div>

          {/* Bookmark btn top-right */}
          <button
            onClick={() => setBookmarked(!bookmarked)}
            style={{
              position: "absolute", top: 14, right: 56,
              width: 34, height: 34, borderRadius: "50%",
              background: "rgba(253,250,246,0.9)", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: bookmarked ? "#E8915A" : "#7A6E62", transition: "all 0.2s",
            }}
          >
            <Bookmark size={16} fill={bookmarked ? "currentColor" : "none"} />
          </button>

          {/* Close btn top-right */}
          <button
            onClick={() => setRecipeModal(null)}
            style={{
              position: "absolute", top: 14, right: 14,
              width: 34, height: 34, borderRadius: "50%",
              background: "rgba(253,250,246,0.9)", border: "none", cursor: "pointer",
              fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, color: "#1C1813", transition: "all 0.2s",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "22px 24px 28px" }}>
          {/* Tags */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
            {tags.map((tag, i) => (
              <span key={i} style={{
                padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                ...tagStyles[i % tagStyles.length],
              }}>{tag}</span>
            ))}
            {nutrition.calories > 0 && (
              <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: "#FEF0D0", color: "#7A4A05" }}>
                {Math.round(nutrition.calories)} Cal
              </span>
            )}
          </div>

          {/* Macros */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 22 }}>
            {macros.map((m) => (
              <div key={m.label} style={{
                background: "#F2E4C8", borderRadius: 12, padding: "10px 8px",
                border: "1px solid rgba(200,178,130,0.6)", textAlign: "center",
              }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 700, color: "#1C1813", lineHeight: 1 }}>
                  {m.value}{m.unit}
                </div>
                <div style={{ height: 3, borderRadius: 3, background: "rgba(200,178,130,0.4)", margin: "5px 0 4px", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 3, background: m.color, width: m.pct + "%" }} />
                </div>
                <div style={{ fontSize: 9, color: "#9A8A78", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600 }}>
                  {m.label}
                </div>
              </div>
            ))}
          </div>

          {/* Ingredients */}
          {ingredients.length > 0 && (
            <>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: "#1C1813", marginBottom: 12 }}>
                Ingredients
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 22 }}>
                {ingredients.map((ing, i) => {
                  const name = typeof ing === "string" ? ing : ing.name || ing;
                  const qty = typeof ing === "object" ? ing.qty || ing.quantity || "" : "";
                  return (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "9px 12px", borderRadius: 10,
                      background: "#F2E4C8", border: "1px solid rgba(200,178,130,0.5)", fontSize: 12.5,
                    }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#E8915A", flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, color: "#1C1813", flex: 1 }}>{name}</span>
                      {qty && <span style={{ marginLeft: "auto", color: "#9A8A78", fontSize: 11, flexShrink: 0 }}>{qty}</span>}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Steps */}
          {steps.length > 0 && (
            <>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: "#1C1813", marginBottom: 12 }}>
                Method
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {steps.map((step, i) => (
                  <div key={i} style={{
                    display: "flex", gap: 14, alignItems: "flex-start",
                    padding: "13px 14px", borderRadius: 12,
                    background: "#F2E4C8", border: "1px solid rgba(200,178,130,0.5)",
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                      background: "#E8915A", color: "white",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 800, fontFamily: "'Cormorant Garamond', serif",
                    }}>{i + 1}</div>
                    <div style={{ fontSize: 13, color: "#1C1813", lineHeight: 1.55, paddingTop: 4 }}>{step}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {steps.length === 0 && ingredients.length === 0 && (
            <p style={{ color: "#9A8A78", fontStyle: "italic", fontSize: 13 }}>Recipe details not available for this dish.</p>
          )}
        </div>
      </div>
    </div>
  );
};
