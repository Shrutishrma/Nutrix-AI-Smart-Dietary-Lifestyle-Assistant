import { useState } from "react";
import { TrendingUp, ChevronUp, ChevronDown } from "lucide-react";
import { RestaurantCard } from "./RestaurantCard";

export const RestaurantSection = ({ restaurants, dishName }) => {
    const [expanded, setExpanded] = useState(false);
    if (!restaurants || restaurants.length === 0) return null;

    const visibleCount = expanded ? restaurants.length : 3;
    const hasMore = restaurants.length > 3;

    return (
        <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <TrendingUp size={12} className="text-rose-400" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        Nearby Places ({restaurants.length})
                    </span>
                </div>
                {hasMore && (
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="flex items-center gap-1 text-[10px] font-black text-rose-500 uppercase tracking-wider hover:text-rose-700 transition-colors"
                    >
                        {expanded ? (
                            <><ChevronUp size={12} /> Show Less</>
                        ) : (
                            <><ChevronDown size={12} /> +{restaurants.length - 3} More</>
                        )}
                    </button>
                )}
            </div>
            <div className="space-y-2.5">
                {restaurants.slice(0, visibleCount).map((r, ri) => (
                    <RestaurantCard key={ri} restaurant={r} dishName={dishName} />
                ))}
            </div>
        </div>
    );
};
