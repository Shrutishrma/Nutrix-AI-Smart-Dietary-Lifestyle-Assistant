/**
 * useSavedItems — localStorage-backed hook for heart (liked) and bookmark states.
 *
 * Keys stored:
 *   fp_liked      → { [placeKey]: { id, name, rating, business_status, isOpen, cuisine, price_label, dishName, date } }
 *   fp_bookmarked → { [dish]: { dish, image, restaurants, nutrition, health_tags, recipe, score, description, date } }
 */

import { useState, useCallback } from "react";

function load(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}");
  } catch {
    return {};
  }
}

function save(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

export function useSavedItems() {
  const [liked, setLiked] = useState(() => load("fp_liked"));
  const [bookmarked, setBookmarked] = useState(() => load("fp_bookmarked"));

  /**
   * toggleLike: used for restaurant/place hearts.
   * @param {object} restaurant - The restaurant object from the food card.
   * @param {string} dishName   - The dish name this restaurant is associated with.
   */
  const toggleLike = useCallback((restaurant, dishName) => {
    // Support legacy usage: toggleLike(item) where item is a food item
    // If the first arg has a .dish property it's a legacy food item call
    if (restaurant && restaurant.dish && !restaurant.name) {
      // Legacy: treat as food item toggle (just use dish key)
      setLiked(prev => {
        const next = { ...prev };
        const key = restaurant.dish;
        if (next[key]) {
          delete next[key];
        } else {
          next[key] = {
            name: restaurant.dish,
            id: key,
            date: new Date().toISOString(),
          };
        }
        save("fp_liked", next);
        return next;
      });
      return;
    }

    setLiked(prev => {
      const next = { ...prev };
      const resName = restaurant.name || restaurant.res_name || "Restaurant";
      // Use a composite key: name + dishName for uniqueness
      const key = (resName || "") + (dishName ? "__" + dishName : "");
      
      if (next[key]) {
        delete next[key];
      } else {
        next[key] = {
          id: key,
          name: resName,
          rating: restaurant.rating,
          business_status: restaurant.business_status,
          isOpen: restaurant.business_status === "OPERATIONAL",
          cuisine: restaurant.cuisine || restaurant.exact_item || dishName || "",
          price_label: restaurant.price_label,
          google_url: restaurant.google_url,
          dishName,
          date: new Date().toISOString(),
        };
      }
      save("fp_liked", next);
      return next;
    });
  }, []);

  /**
   * toggleBookmark: used for food card bookmark button.
   * @param {object} item - The full food item object.
   */
  const toggleBookmark = useCallback((item) => {
    setBookmarked(prev => {
      const next = { ...prev };
      if (next[item.dish]) {
        delete next[item.dish];
      } else {
        next[item.dish] = {
          dish: item.dish,
          image: item.image,
          why: item.why,
          food_category: item.food_category,
          place_type: item.place_type,
          recipe: item.recipe,
          restaurants: item.restaurants,
          health_tags: item.health_tags,
          nutrition: item.nutrition,
          score: item.score,
          description: item.description,
          date: new Date().toISOString(),
        };
      }
      save("fp_bookmarked", next);
      return next;
    });
  }, []);

  /**
   * isPlaceLiked: checks if a restaurant+dish combo is liked.
   */
  const isPlaceLiked = useCallback((restaurantName, dishName) => {
    const key = (restaurantName || "") + (dishName ? "__" + dishName : "");
    const currentLiked = load("fp_liked");
    return !!currentLiked[key];
  }, []);

  const removeLiked = useCallback((key) => {
    setLiked(prev => {
      const next = { ...prev };
      delete next[key];
      save("fp_liked", next);
      return next;
    });
  }, []);

  const removeBookmarked = useCallback((dish) => {
    setBookmarked(prev => {
      const next = { ...prev };
      delete next[dish];
      save("fp_bookmarked", next);
      return next;
    });
  }, []);

  return { liked, bookmarked, toggleLike, toggleBookmark, removeLiked, removeBookmarked, isPlaceLiked };
}
