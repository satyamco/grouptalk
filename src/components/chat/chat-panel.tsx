"use client";

import { useEffect, useRef, memo } from "react";
import { ChatMessage } from "@/types";
import { ChatMessageItem } from "./chat-message";
import { ChatInput } from "./chat-input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
}

export const ChatPanel = memo(function ChatPanel({
  messages,
  onSendMessage,
}: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message on update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-background/90 md:bg-white/3 border-t md:border-t-0 md:border-l border-white/5 p-4 md:w-80 lg:w-96">
      {/* Chat Title */}
      <div className="pb-3 border-b border-white/5 flex items-center justify-between">
        <span className="text-sm font-bold text-foreground">Room Chat</span>
        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded-full">
          Live Channel
        </span>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto py-4 space-y-3 min-h-[300px] max-h-[calc(100vh-320px)] md:max-h-none">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground italic text-center py-20">
            No messages yet. Say hello!
          </div>
        ) : (
          <div className="space-y-2.5">
            {messages.map((msg) => (
              <ChatMessageItem key={msg.id} message={msg} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Chat Input form */}
      <ChatInput onSendMessage={onSendMessage} />
    </div>
  );
});
