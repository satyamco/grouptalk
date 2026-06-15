"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  onSendMessage: (text: string) => void;
}

export function ChatInput({ onSendMessage }: ChatInputProps) {
  const [text, setText] = useState("");

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    
    onSendMessage(text.trim());
    setText("");
  };

  return (
    <div className="space-y-2 pt-2 border-t border-white/5 bg-background/80 backdrop-blur-md">
      {/* Input box form */}
      <form onSubmit={handleSend} className="flex gap-2 items-center">
        <Input
          type="text"
          placeholder="Send a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          className="glass-input h-11 rounded-xl text-sm font-medium"
        />
        <Button
          type="submit"
          disabled={!text.trim()}
          size="icon"
          className="h-11 w-11 rounded-xl bg-gradient-to-tr from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white shadow-lg shadow-violet-500/20 active-bounce shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
