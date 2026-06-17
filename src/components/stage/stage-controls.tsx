"use client";

import { Mic, MicOff, MessageSquare, Hand, LogOut, ShieldAlert, Award, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StageControlsProps {
  role: "host" | "moderator" | "speaker" | "listener";
  isMuted: boolean;
  onMuteToggle: () => void;
  hasHandRaised: boolean;
  onHandRaiseToggle: () => void;
  onChatToggle: () => void;
  unreadChatCount: number;
  pendingRequestsCount: number;
  onOpenRequests: () => void;
  onLeave: () => void;
  onEndRoom: () => void;
  isEndingRoom?: boolean;
  maxSeats?: number;
  onOpenCapacity?: () => void;
}

export function StageControls({
  role,
  isMuted,
  onMuteToggle,
  hasHandRaised,
  onHandRaiseToggle,
  onChatToggle,
  unreadChatCount,
  pendingRequestsCount,
  onOpenRequests,
  onLeave,
  onEndRoom,
  isEndingRoom = false,
  maxSeats = 8,
  onOpenCapacity,
}: StageControlsProps) {
  const isSpeaker = role === "host" || role === "moderator" || role === "speaker";
  const isHost = role === "host";

  return (
    <div className="w-full border-t border-white/5 bg-black/60 backdrop-blur-xl py-4 px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Left side actions (Mic / Raise Hand) */}
      <div className="flex items-center gap-2.5">
        {isSpeaker ? (
          /* Mic Toggle for Speakers */
          <Button
            onClick={onMuteToggle}
            className={cn(
              "h-11 px-4 rounded-xl font-bold flex items-center gap-2 transition-all duration-300 active-bounce shadow-md",
              isMuted
                ? "bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300"
                : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/15"
            )}
          >
            {isMuted ? <MicOff className="h-4.5 w-4.5" /> : <Mic className="h-4.5 w-4.5" />}
            <span className="hidden sm:inline">{isMuted ? "Unmute" : "Mute"}</span>
          </Button>
        ) : (
          /* Raise Hand Toggle for Listeners */
          <Button
            onClick={onHandRaiseToggle}
            className={cn(
              "h-11 px-4 rounded-xl font-bold flex items-center gap-2 transition-all duration-300 active-bounce shadow-md",
              hasHandRaised
                ? "bg-violet-600 hover:bg-violet-700 text-white shadow-violet-500/20"
                : "bg-white/5 hover:bg-white/10 border border-white/5 text-foreground"
            )}
          >
            <Hand className={cn("h-4.5 w-4.5", hasHandRaised ? "animate-bounce" : "")} />
            <span>{hasHandRaised ? "Hand Raised" : "Raise Hand"}</span>
          </Button>
        )}

        {/* Requests Management Trigger (Host/Mod only) */}
        {(role === "host" || role === "moderator") && (
          <Button
            onClick={onOpenRequests}
            variant="outline"
            className="h-11 px-4 rounded-xl border border-white/5 bg-white/5 text-foreground hover:bg-white/10 active-bounce relative"
          >
            <Award className="h-4.5 w-4.5" />
            <span className="hidden sm:inline">Requests</span>
            {pendingRequestsCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-black text-primary-foreground animate-[pulse_1.5s_infinite]">
                {pendingRequestsCount}
              </span>
            )}
          </Button>
        )}

        {/* Extend Capacity Button (Host only) */}
        {role === "host" && onOpenCapacity && (
          <Button
            onClick={onOpenCapacity}
            variant="outline"
            className="h-11 px-4 rounded-xl border border-white/5 bg-white/5 text-foreground hover:bg-white/10 active-bounce flex items-center gap-2"
          >
            <Users className="h-4.5 w-4.5 text-violet-400" />
            <span>Seats ({maxSeats})</span>
          </Button>
        )}
      </div>

      {/* Middle/Right: Chat and Leaving */}
      <div className="flex items-center gap-2.5 ml-auto">
        {/* Chat Toggle Button */}
        <Button
          onClick={onChatToggle}
          variant="outline"
          className="h-11 px-4 rounded-xl border border-white/5 bg-white/5 text-foreground hover:bg-white/10 active-bounce relative"
        >
          <MessageSquare className="h-4.5 w-4.5" />
          <span className="hidden sm:inline">Chat</span>
          {unreadChatCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500 text-[10px] font-black text-white">
              {unreadChatCount}
            </span>
          )}
        </Button>

        {/* Leave Room Button */}
        <Button
          onClick={onLeave}
          variant="ghost"
          className="h-11 px-4 rounded-xl hover:bg-white/5 hover:text-foreground text-muted-foreground active-bounce flex items-center gap-2"
        >
          <LogOut className="h-4.5 w-4.5 text-muted-foreground/80" />
          <span className="hidden sm:inline">Leave</span>
        </Button>

        {/* Host End Room (Destructive Action) */}
        {isHost && (
          <Button
            onClick={onEndRoom}
            disabled={isEndingRoom}
            className="h-11 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-lg shadow-rose-600/10 active-bounce flex items-center gap-2"
          >
            <ShieldAlert className="h-4.5 w-4.5" />
            <span>{isEndingRoom ? "Ending..." : "End Room"}</span>
          </Button>
        )}
      </div>
    </div>
  );
}
