import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

// ─── Sparkle star SVG ────────────────────────────────────────────────────────
const Sparkle = ({ size = 12, color = "#E8915A", opacity = 0.55, style = {} }) => (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" style={{ display: "block", ...style }}>
        <path
            d={`M6 0L6.8 5.2L12 6L6.8 6.8L6 12L5.2 6.8L0 6L5.2 5.2Z`}
            fill={color}
            opacity={opacity}
        />
    </svg>
);

// ─── Illustrated pin SVG ─────────────────────────────────────────────────────
const PinIllustration = () => (
    <svg width="82" height="82" viewBox="0 0 82 82" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="41" cy="72" rx="16" ry="5" fill="rgba(200,140,60,0.15)" />
        <path d="M41 7C28.8 7 19 16.8 19 29C19 46.5 41 71 41 71C41 71 63 46.5 63 29C63 16.8 53.2 7 41 7Z" fill="#E8915A" />
        <path d="M41 7C28.8 7 19 16.8 19 29C19 35 21.5 41.5 26.5 47.5C26.5 47.5 41 7.5 41 7Z" fill="rgba(255,255,255,0.15)" />
        <path d="M41 7C28.8 7 19 16.8 19 29C19 46.5 41 71 41 71C41 71 63 46.5 63 29C63 16.8 53.2 7 41 7Z" stroke="#C45E3E" strokeWidth="2.5" />
        <circle cx="41" cy="29" r="11" fill="white" />
        <circle cx="41" cy="29" r="11" stroke="#C45E3E" strokeWidth="2" />
        <circle cx="41" cy="29" r="5" fill="#E8915A" />
        <rect x="5" y="28" width="14" height="6" rx="3" fill="rgba(61,107,79,0.18)" />
        <rect x="3" y="23" width="11" height="6" rx="3" fill="rgba(61,107,79,0.12)" />
        <rect x="63" y="24" width="15" height="6" rx="3" fill="rgba(201,121,10,0.2)" />
        <rect x="66" y="28" width="12" height="6" rx="3" fill="rgba(201,121,10,0.14)" />
    </svg>
);

// ─── Compass illustration for Change Location ─────────────────────────────────
const CompassIllustration = () => (
    <svg width="82" height="82" viewBox="0 0 82 82" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="41" cy="41" r="34" stroke="#3D6B4F" strokeWidth="2" strokeDasharray="6 4" opacity="0.25" />
        <circle cx="41" cy="41" r="24" fill="rgba(61,107,79,0.09)" stroke="#3D6B4F" strokeWidth="2" />
        <line x1="41" y1="14" x2="41" y2="22" stroke="#3D6B4F" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
        <line x1="41" y1="60" x2="41" y2="68" stroke="#3D6B4F" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
        <line x1="14" y1="41" x2="22" y2="41" stroke="#3D6B4F" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
        <line x1="60" y1="41" x2="68" y2="41" stroke="#3D6B4F" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
        <circle cx="41" cy="41" r="8" fill="#3D6B4F" />
        <circle cx="41" cy="41" r="4" fill="white" />
        <path d="M59 18C56.2 18 54 20.2 54 23C54 26.8 59 33 59 33C59 33 64 26.8 64 23C64 20.2 61.8 18 59 18Z" fill="#E8915A" stroke="#C45E3E" strokeWidth="1.5" />
        <circle cx="59" cy="23" r="2.5" fill="white" />
        <circle cx="59" cy="23" r="1.2" fill="#E8915A" />
    </svg>
);

// ─── Main component ────────────────────────────────────────────────────────────
export const LocationPrompt = ({ onAllow, onDismiss, mode = "enable", currentLocation = "", onManualConfirm }) => {
    const isChange = mode === "change";

    return (
        <div style={{
            position: "fixed", inset: 0, zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "20px",
        }}>
            {/* Backdrop */}
            <div
                onClick={isChange ? onDismiss : undefined}
                style={{
                    position: "absolute", inset: 0,
                    background: "rgba(28,24,19,0.35)",
                    backdropFilter: "blur(6px)",
                    WebkitBackdropFilter: "blur(6px)",
                }}
            />

            {/* Modal card */}
            <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 16 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                style={{
                    position: "relative", zIndex: 1,
                    background: "rgba(255,253,250,0.98)",
                    borderRadius: 32,
                    border: "1px solid rgba(0,0,0,0.05)",
                    boxShadow: "0 28px 70px rgba(40,25,10,0.18), 0 1px 0 rgba(255,255,255,0.9) inset",
                    width: "100%", maxWidth: 340,
                    overflow: "hidden",
                    fontFamily: "'Inter', sans-serif",
                }}
            >
                {isChange
                    ? <ChangeLocationContent currentLocation={currentLocation} onDismiss={onDismiss} onAllow={onAllow} onManualConfirm={onManualConfirm} />
                    : <EnableLocationContent onAllow={onAllow} onDismiss={onDismiss} onManualConfirm={onManualConfirm} />
                }
            </motion.div>
        </div>
    );
};

// ─── Enable Location content ───────────────────────────────────────────────────
function EnableLocationContent({ onAllow, onDismiss, onManualConfirm }) {
    const [showManual, setShowManual] = useState(false);
    const [manualText, setManualText] = useState("");
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        if (showManual) setTimeout(() => inputRef.current?.focus(), 100);
    }, [showManual]);

    const handleConfirm = async () => {
        const trimmed = manualText.trim();
        if (!trimmed) return;
        setLoading(true);
        await onManualConfirm(trimmed);
        setLoading(false);
    };

    return (
        <>
            {/* Illustration area */}
            <div style={{
                padding: "36px 28px 16px",
                background: "linear-gradient(180deg, rgba(255,232,208,0.85) 0%, rgba(255,253,250,0) 100%)",
                position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
                <div style={{ position: "absolute", top: 32, left: 46 }}><Sparkle size={14} color="#C9790A" opacity={0.6} /></div>
                <div style={{ position: "absolute", top: 48, right: 40 }}><Sparkle size={10} color="#E8915A" opacity={0.5} /></div>
                <div style={{ position: "absolute", bottom: 26, left: 36 }}><Sparkle size={11} color="#3D6B4F" opacity={0.45} /></div>
                <div style={{ position: "absolute", bottom: 34, right: 50 }}><Sparkle size={8} color="#C9790A" opacity={0.5} /></div>
                <div style={{
                    width: 148, height: 148, borderRadius: "50%",
                    background: "linear-gradient(135deg, rgba(232,145,90,0.14) 0%, rgba(201,121,10,0.07) 100%)",
                    border: "2px solid rgba(232,145,90,0.16)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    position: "relative", zIndex: 2,
                }}>
                    <PinIllustration />
                </div>
            </div>

            {/* Body */}
            <div style={{ padding: "4px 28px 28px", textAlign: "center" }}>
                <div style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: 32, fontWeight: 700, color: "#1C1813",
                    lineHeight: 1.1, marginBottom: 10,
                }}>
                    Find meals<br />near you
                </div>
                <p style={{ fontSize: 13, color: "#9A8A78", lineHeight: 1.65, marginBottom: 20 }}>
                    Share your location so NutrixAI can recommend comforting meals from restaurants right around the corner.
                </p>

                {/* Allow GPS button */}
                <button
                    onClick={onAllow}
                    style={{
                        width: "100%", padding: 14,
                        background: "linear-gradient(135deg, #E8915A 0%, #C45E3E 100%)",
                        color: "white", border: "none", borderRadius: 16,
                        fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 700,
                        cursor: "pointer", marginBottom: 10,
                        boxShadow: "0 6px 20px rgba(232,145,90,0.38)",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        transition: "all 0.2s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 8px 26px rgba(232,145,90,0.48)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(232,145,90,0.38)"; }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                    </svg>
                    Allow Location Access
                </button>

                {/* Divider */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div style={{ flex: 1, height: 1, background: "rgba(200,178,130,0.25)" }} />
                    <span style={{ fontSize: 9.5, color: "#9A8A78", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" }}>or</span>
                    <div style={{ flex: 1, height: 1, background: "rgba(200,178,130,0.25)" }} />
                </div>

                {/* Manual location button / input */}
                {!showManual ? (
                    <button
                        onClick={() => setShowManual(true)}
                        style={{
                            width: "100%", padding: "11px 14px",
                            background: "rgba(255,253,249,0.9)", border: "1px solid rgba(200,178,130,0.3)",
                            borderRadius: 14, fontFamily: "'Inter', sans-serif",
                            fontSize: 13, fontWeight: 600, color: "#7A6E62",
                            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                            transition: "all 0.2s", marginBottom: 10,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "#E8915A"; e.currentTarget.style.color = "#1C1813"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(200,178,130,0.3)"; e.currentTarget.style.color = "#7A6E62"; }}
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        Type my location
                    </button>
                ) : (
                    <div style={{ marginBottom: 10 }}>
                        <div style={{ position: "relative", marginBottom: 8 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9A8A78" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            <input
                                ref={inputRef}
                                type="text"
                                value={manualText}
                                onChange={e => setManualText(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && handleConfirm()}
                                placeholder="e.g. Indiranagar, Koramangala..."
                                style={{
                                    width: "100%", padding: "10px 14px 10px 36px",
                                    background: "rgba(255,253,249,0.95)", border: "1px solid rgba(200,178,130,0.3)",
                                    borderRadius: 12, fontSize: 13, color: "#1C1813",
                                    fontFamily: "'Inter', sans-serif", outline: "none", transition: "all 0.2s",
                                    boxSizing: "border-box",
                                }}
                                onFocus={e => { e.target.style.borderColor = "#E8915A"; e.target.style.boxShadow = "0 0 0 3px rgba(232,145,90,0.10)"; }}
                                onBlur={e => { e.target.style.borderColor = "rgba(200,178,130,0.3)"; e.target.style.boxShadow = "none"; }}
                            />
                        </div>
                        <button
                            onClick={handleConfirm}
                            disabled={!manualText.trim() || loading}
                            style={{
                                width: "100%", padding: "11px 14px",
                                background: manualText.trim() ? "#1C1813" : "rgba(200,178,130,0.3)", color: "white",
                                border: "none", borderRadius: 13,
                                fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700,
                                cursor: manualText.trim() ? "pointer" : "default", transition: "all 0.2s",
                            }}
                            onMouseEnter={e => { if (manualText.trim()) e.currentTarget.style.background = "#E8915A"; }}
                            onMouseLeave={e => { if (manualText.trim()) e.currentTarget.style.background = "#1C1813"; }}
                        >
                            {loading ? "Finding location…" : "Confirm Location"}
                        </button>
                    </div>
                )}

                {/* Dismiss */}
                <button
                    onClick={onDismiss}
                    style={{
                        width: "100%", padding: 8, background: "none", border: "none",
                        fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 600,
                        color: "#9A8A78", cursor: "pointer", transition: "color 0.2s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = "#7A6E62"}
                    onMouseLeave={e => e.currentTarget.style.color = "#9A8A78"}
                >
                    Maybe later
                </button>

                {/* Privacy note */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontSize: 10.5, color: "#C8B89A", marginTop: 8 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    Location is never stored or shared
                </div>
            </div>
        </>
    );
}

// ─── Change Location content ───────────────────────────────────────────────────
function ChangeLocationContent({ currentLocation, onDismiss, onAllow, onManualConfirm }) {
    const [manualText, setManualText] = useState("");
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);

    const SUGGESTIONS = ["Indiranagar", "Koramangala", "Whitefield", "HSR Layout", "Jayanagar"];

    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 300);
    }, []);

    const handleConfirm = async () => {
        const trimmed = manualText.trim();
        if (!trimmed) return;
        setLoading(true);
        await onManualConfirm(trimmed);
        setLoading(false);
    };

    return (
        <>
            {/* Illustration area */}
            <div style={{
                padding: "28px 28px 14px",
                background: "linear-gradient(180deg, rgba(208,232,218,0.45) 0%, rgba(255,253,250,0) 100%)",
                position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
                <div style={{ position: "absolute", top: 28, left: 44 }}><Sparkle size={13} color="#3D6B4F" opacity={0.5} /></div>
                <div style={{ position: "absolute", top: 40, right: 40 }}><Sparkle size={9} color="#C9790A" opacity={0.45} /></div>
                <div style={{ position: "absolute", bottom: 18, left: 34 }}><Sparkle size={10} color="#E8915A" opacity={0.4} /></div>
                <div style={{
                    width: 130, height: 130, borderRadius: "50%",
                    background: "linear-gradient(135deg, rgba(61,107,79,0.11) 0%, rgba(61,107,79,0.04) 100%)",
                    border: "2px solid rgba(61,107,79,0.14)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    position: "relative", zIndex: 2,
                }}>
                    <CompassIllustration />
                </div>

                {/* Close button */}
                <button
                    onClick={onDismiss}
                    style={{
                        position: "absolute", top: 14, right: 14,
                        width: 28, height: 28, borderRadius: "50%",
                        background: "rgba(255,253,249,0.9)", border: "1px solid rgba(0,0,0,0.07)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", color: "#9A8A78", fontSize: 15, lineHeight: 1,
                        zIndex: 3,
                    }}
                >×</button>
            </div>

            {/* Body */}
            <div style={{ padding: "4px 22px 22px" }}>
                <div style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: 26, fontWeight: 700, color: "#1C1813",
                    textAlign: "center", marginBottom: 4,
                }}>
                    Change Location
                </div>
                <p style={{ fontSize: 12, color: "#9A8A78", textAlign: "center", marginBottom: 14, lineHeight: 1.5 }}>
                    Search for restaurants anywhere — useful if ordering for someone else too!
                </p>

                {/* Current location chip */}
                {currentLocation && (
                    <div style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 14px", borderRadius: 14,
                        background: "rgba(61,107,79,0.07)", border: "1px solid rgba(61,107,79,0.16)",
                        marginBottom: 12,
                    }}>
                        <div style={{
                            width: 9, height: 9, borderRadius: "50%", background: "#3D6B4F", flexShrink: 0,
                            boxShadow: "0 0 0 3px rgba(61,107,79,0.15)",
                        }} />
                        <div>
                            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "#3D6B4F" }}>Current location</div>
                            <div style={{ fontSize: 12.5, fontWeight: 600, color: "#1C1813", marginTop: 1 }}>{currentLocation}</div>
                        </div>
                    </div>
                )}

                {/* GPS option */}
                <button
                    onClick={onAllow}
                    style={{
                        width: "100%", padding: "11px 10px", marginBottom: 10,
                        background: "rgba(255,253,249,0.9)", border: "1px solid rgba(200,178,130,0.3)",
                        borderRadius: 13, fontFamily: "'Inter', sans-serif",
                        fontSize: 12.5, fontWeight: 700, color: "#3D6B4F",
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        transition: "all 0.2s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(61,107,79,0.35)"; e.currentTarget.style.background = "rgba(61,107,79,0.06)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(200,178,130,0.3)"; e.currentTarget.style.background = "rgba(255,253,249,0.9)"; }}
                >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                    </svg>
                    Use my current location (GPS)
                </button>

                {/* Divider */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div style={{ flex: 1, height: 1, background: "rgba(200,178,130,0.25)" }} />
                    <span style={{ fontSize: 9, color: "#9A8A78", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                        or type a location
                    </span>
                    <div style={{ flex: 1, height: 1, background: "rgba(200,178,130,0.25)" }} />
                </div>

                {/* Search input */}
                <div style={{ position: "relative", marginBottom: 8 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9A8A78" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        ref={inputRef}
                        type="text"
                        value={manualText}
                        onChange={e => setManualText(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleConfirm()}
                        placeholder="e.g. Indiranagar, HSR Layout..."
                        style={{
                            width: "100%", padding: "10px 14px 10px 36px",
                            background: "rgba(255,253,249,0.95)", border: "1px solid rgba(200,178,130,0.3)",
                            borderRadius: 12, fontSize: 13, color: "#1C1813",
                            fontFamily: "'Inter', sans-serif", outline: "none", transition: "all 0.2s",
                            boxSizing: "border-box",
                        }}
                        onFocus={e => { e.target.style.borderColor = "#E8915A"; e.target.style.boxShadow = "0 0 0 3px rgba(232,145,90,0.10)"; }}
                        onBlur={e => { e.target.style.borderColor = "rgba(200,178,130,0.3)"; e.target.style.boxShadow = "none"; }}
                    />
                </div>

                {/* Suggestion chips */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                    {SUGGESTIONS.map((place) => (
                        <button
                            key={place}
                            onClick={() => setManualText(place)}
                            style={{
                                padding: "5px 12px", borderRadius: 20,
                                background: manualText === place ? "#FAE8D8" : "rgba(255,253,249,0.85)",
                                border: manualText === place ? "1.5px solid #E8915A" : "1px solid rgba(0,0,0,0.06)",
                                fontSize: 11.5, fontWeight: 600,
                                color: manualText === place ? "#E8915A" : "#7A6E62",
                                cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                            }}
                            onMouseEnter={e => { if (manualText !== place) { e.currentTarget.style.borderColor = "rgba(232,145,90,0.3)"; e.currentTarget.style.color = "#1C1813"; } }}
                            onMouseLeave={e => { if (manualText !== place) { e.currentTarget.style.borderColor = "rgba(0,0,0,0.06)"; e.currentTarget.style.color = "#7A6E62"; } }}
                        >
                            {place}
                        </button>
                    ))}
                </div>

                {/* Confirm button */}
                <button
                    onClick={handleConfirm}
                    disabled={!manualText.trim() || loading}
                    style={{
                        width: "100%", padding: "12px 14px",
                        background: manualText.trim() ? "#1C1813" : "rgba(200,178,130,0.3)",
                        color: "white", border: "none", borderRadius: 13,
                        fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700,
                        cursor: manualText.trim() ? "pointer" : "default", transition: "all 0.2s",
                    }}
                    onMouseEnter={e => { if (manualText.trim()) e.currentTarget.style.background = "#E8915A"; }}
                    onMouseLeave={e => { if (manualText.trim()) e.currentTarget.style.background = "#1C1813"; }}
                >
                    {loading ? "Finding location…" : "Search This Location →"}
                </button>
            </div>
        </>
    );
}
