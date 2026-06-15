"use client";

import { ChatMessage } from "@/types";

interface ChatMessageProps {
  message: ChatMessage;
}

export function ChatMessageItem({ message }: ChatMessageProps) {
  // Format short time (e.g. "14:45")
  const timeString = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/3 border border-white/3 hover:bg-white/5 transition duration-150">
      {/* Sender Emoji avatar */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 border border-white/10 text-lg select-none">
        {message.senderEmoji}
      </div>

      {/* Message content */}
      <div className="flex flex-col text-left min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-bold text-foreground truncate max-w-[120px]">
            {message.senderName}
          </span>
          <span className="text-[9px] text-muted-foreground font-semibold">
            {timeString}
          </span>
        </div>
        <p className="text-xs text-foreground/90 mt-1 leading-relaxed break-words whitespace-pre-wrap select-text">
          {message.message}
        </p>
      </div>
    </div>
  );
}
