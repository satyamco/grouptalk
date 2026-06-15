"use client";

import { ROOM_CATEGORIES, CATEGORY_META } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface RoomSearchProps {
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
}

export function RoomSearch({
  selectedCategory,
  onCategorySelect,
}: RoomSearchProps) {
  return (
    <div className="w-full overflow-x-auto pb-1 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 scrollbar-hide">
      <div className="flex gap-2 min-w-max">
        {/* "All" Category Pill */}
        <button
          type="button"
          onClick={() => onCategorySelect("all")}
          className={cn(
            "px-4 py-2 rounded-full border text-xs font-bold transition-all duration-200 active-bounce outline-none",
            selectedCategory === "all"
              ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105"
              : "bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10 hover:border-white/10"
          )}
        >
          🌐 All Rooms
        </button>

        {/* Individual Categories */}
        {ROOM_CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat;
          const meta = CATEGORY_META[cat];
          return (
            <button
              key={cat}
              type="button"
              onClick={() => onCategorySelect(cat)}
              className={cn(
                "px-4 py-2 rounded-full border text-xs font-bold transition-all duration-200 active-bounce outline-none flex items-center gap-1.5",
                isSelected
                  ? `bg-gradient-to-r ${meta.gradient} border-transparent text-white shadow-lg scale-105`
                  : "bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10 hover:border-white/10"
              )}
            >
              <span>{meta.icon}</span>
              <span>{cat}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
