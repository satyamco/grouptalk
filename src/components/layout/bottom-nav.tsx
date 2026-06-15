"use client";

import { Compass, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  activeTab: "discover";
  onCreateClick?: () => void;
  onProfileClick: () => void;
  profileEmoji: string;
}

export function BottomNav({ activeTab, onCreateClick, onProfileClick, profileEmoji }: BottomNavProps) {
  return (
    <nav className="fixed bottom-6 left-1/2 z-40 h-16 w-11/12 max-w-sm -translate-x-1/2 rounded-full border border-white/10 bg-black/60 shadow-2xl backdrop-blur-lg px-6 flex items-center justify-between sm:hidden">
      {/* Discover / Browse Button */}
      <button
        type="button"
        className={cn(
          "flex flex-col items-center gap-1 text-[10px] font-bold transition-all duration-200 outline-none active-bounce",
          activeTab === "discover"
            ? "text-primary scale-105"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Compass className="h-5 w-5" />
        <span>Discover</span>
      </button>

      {/* Floating Center Create Room Button */}
      <button
        type="button"
        onClick={onCreateClick}
        className="flex h-12 w-12 -translate-y-4 items-center justify-center rounded-full bg-gradient-to-tr from-violet-600 to-cyan-600 text-white shadow-lg shadow-violet-500/30 transition-all duration-200 hover:scale-110 active-bounce outline-none ring-4 ring-background/60"
        title="Create Room"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Profile Button */}
      <button
        type="button"
        onClick={onProfileClick}
        className={cn(
          "flex flex-col items-center gap-1 text-[10px] font-bold transition-all duration-200 outline-none active-bounce text-muted-foreground hover:text-foreground"
        )}
      >
        <span className="text-xl leading-none select-none">{profileEmoji}</span>
        <span>Profile</span>
      </button>
    </nav>
  );
}
