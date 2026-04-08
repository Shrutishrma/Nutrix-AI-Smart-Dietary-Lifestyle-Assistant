import { Star, MapPin, Clock } from "lucide-react";

export const RestaurantCard = ({ restaurant, dishName }) => {
    if (!restaurant) return null;
    const { name, rating, review_count, distance_px, source, opening_hours, cuisine, items, business_status } = restaurant;
    // Fix 4: ONLY show "Open Now" if we have explicit OPERATIONAL status.
    const openStatus = business_status === "OPERATIONAL";

    return (
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 hover:border-slate-200 hover:bg-white transition-all group flex items-start gap-4 shadow-sm">
            <div className="w-12 h-12 bg-rose-50 rounded-[1rem] flex items-center justify-center shrink-0 border border-rose-100/50 group-hover:scale-110 transition-transform">
                <MapPin size={22} className="text-rose-400 drop-shadow-sm" />
            </div>
            <div className="flex-1 min-w-0">
                {/* Row 1: Name & Distance */}
                <div className="flex items-start justify-between mb-1.5">
                    <h4 className="text-sm font-black text-slate-800 tracking-tight leading-tight truncate mr-3 group-hover:text-rose-500 transition-colors">
                        {name}
                    </h4>
                    {distance_px || restaurant.distance !== null ? (
                        <span className="text-[10px] font-black uppercase text-rose-500 bg-rose-50 px-2 py-0.5 rounded-lg whitespace-nowrap border border-rose-100/50 tracking-wider">
                            {distance_px ? (distance_px.distance / 1000).toFixed(1) : (restaurant.distance ? restaurant.distance.toFixed(1) : "0.0")} km
                        </span>
                    ) : (
                        <span className="text-[10px] font-black uppercase text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-lg whitespace-nowrap border border-emerald-100/50 tracking-wider">
                            📍 Bangalore
                        </span>
                    )}
                </div>

                {/* Row 2: Metadata (Rating, Open Status) */}
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                    {rating > 0 && (
                        <div className="flex items-center gap-1">
                            <Star size={9} className="text-amber-400 fill-amber-400" />
                            <span className="text-[10px] font-black text-slate-700">{rating.toFixed(1)}</span>
                            {review_count > 0 && (
                                <span className="text-[10px] text-slate-400 font-medium">({review_count.toLocaleString()} reviews)</span>
                            )}
                        </div>
                    )}
                    {/* Show Open badge only when confirmed OPERATIONAL — never show "Closed" guess */}
                    {openStatus && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-[10px] font-black text-emerald-600">Open Now</span>
                        </div>
                    )}
                </div>

                {/* Row 3: Real opening hours from backend if available */}
                {opening_hours && (
                    <div className="flex items-center gap-1 mb-1.5">
                        <Clock size={9} className="text-slate-300" />
                        <span className="text-[10px] text-slate-400 font-medium">{opening_hours}</span>
                    </div>
                )}

                {/* Row 4: Source badge */}
                <div className="flex items-center gap-2 flex-wrap mb-2">
                    {source === "menu_intelligence" && (
                        <span className="text-[9px] font-black uppercase tracking-wider text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-100">
                            ✓ Menu Match
                        </span>
                    )}
                    {cuisine && (() => {
                        // Clean Geoapify raw category string like "building building.catering catering catering.cafe"
                        // into human-readable label
                        const cat = cuisine.toLowerCase();
                        let label = null;
                        if (cat.includes("fast_food")) label = "Fast Food";
                        else if (cat.includes("cafe") || cat.includes("coffee")) label = "Café";
                        else if (cat.includes("restaurant")) label = "Restaurant";
                        else if (cat.includes("bakery") || cat.includes("pastry")) label = "Bakery";
                        else if (cat.includes("supermarket") || cat.includes("grocery")) label = "Grocery";
                        else if (cat.includes("food_court")) label = "Food Court";
                        else if (!cat.includes("building") && !cat.includes("catering")) label = cuisine.split(",")[0];
                        return label ? (
                            <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-md">
                                {label}
                            </span>
                        ) : null;
                    })()}
                </div>

                {/* Row 4.5: Exact Dish Price (if matched from menu datset) */}
                {restaurant.exact_price > 0 && (
                    <div className="mb-3 flex items-center">
                        <span className="text-[11px] font-bold text-slate-700 bg-white border border-slate-200 px-2 py-1 rounded-lg shadow-sm">
                            <span className="text-slate-400 font-medium mr-1.5">{restaurant.exact_item || dishName}</span>
                            <span className="text-emerald-600">₹{restaurant.exact_price}</span>
                        </span>
                    </div>
                )}

                <div className="mt-3 flex gap-2">
                    <a
                        href={restaurant.google_url || "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center border border-blue-100 hover:bg-blue-600 hover:text-white transition-colors"
                    >
                        Find & Order
                    </a>
                </div>
            </div>
        </div>
    );
};
