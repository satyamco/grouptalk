"use client";

import { QUICK_REACTIONS } from "@/lib/constants";

interface EmojiReactionsProps {
  onReactionSelect: (emoji: string) => void;
}

export function EmojiReactions({ onReactionSelect }: EmojiReactionsProps) {
  return (
    <div className="flex gap-2 justify-center py-2 px-3 bg-white/3 border border-white/5 rounded-2xl backdrop-blur-md">
      {QUICK_REACTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onReactionSelect(emoji)}
          className="flex h-9 w-9 items-center justify-center text-xl rounded-xl hover:bg-white/10 hover:scale-110 active-bounce transition duration-200 outline-none"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
