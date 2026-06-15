"use client";

import { AVATAR_EMOJIS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EmojiPickerProps {
  selectedEmoji: string;
  onChange: (emoji: string) => void;
}

export function EmojiPicker({ selectedEmoji, onChange }: EmojiPickerProps) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-muted-foreground">
        Choose your Avatar
      </label>
      <div className="rounded-2xl border border-border/40 bg-card/30 p-2 sm:p-3 backdrop-blur-md">
        <ScrollArea className="h-40 w-full pr-2">
          <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 sm:gap-2 pb-1">
            {AVATAR_EMOJIS.map((emoji) => {
               const isSelected = emoji === selectedEmoji;
               return (
                 <button
                   key={emoji}
                   type="button"
                   onClick={() => onChange(emoji)}
                   className={cn(
                     "flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl text-xl sm:text-2xl transition-all duration-200 active-bounce outline-none",
                     isSelected
                       ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-110 ring-2 ring-primary"
                       : "bg-white/5 hover:bg-white/10 hover:scale-105"
                   )}
                 >
                   {emoji}
                 </button>
               );
             })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
