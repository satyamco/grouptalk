"use client";

import { useState } from "react";
import { RemoteParticipant, LocalParticipant } from "livekit-client";
import { useIsSpeaking } from "@livekit/components-react";
import { MicOff, Shield, Crown, Trash2, UserMinus } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpeakerTileProps {
  participant: LocalParticipant | RemoteParticipant;
  isHost: boolean;
  isSelf: boolean;
  onKick?: (guestId: string) => void;
  onMute?: (participant: LocalParticipant | RemoteParticipant) => void;
  onDemote?: (guestId: string) => void;
}

export function SpeakerTile({
  participant,
  isHost,
  isSelf,
  onKick,
  onMute,
  onDemote,
}: SpeakerTileProps) {
  const [showOverlay, setShowOverlay] = useState(false);

  // Check if participant is currently speaking
  const isSpeaking = useIsSpeaking(participant);

  // Decode metadata
  let emoji = "🦁";
  let role = "speaker";
  try {
    if (participant.metadata) {
      const parsed = JSON.parse(participant.metadata);
      emoji = parsed.emoji || "🦁";
      role = parsed.role || "speaker";
    }
  } catch (error) {
    // Fallback
  }

  // Check if participant has microphone muted
  const isAudioEnabled = participant.isMicrophoneEnabled;

  return (
    <div
      onClick={() => {
        if (isHost && !isSelf) {
          setShowOverlay(!showOverlay);
        }
      }}
      onMouseLeave={() => setShowOverlay(false)}
      className="flex flex-col items-center justify-center p-1 sm:p-3 rounded-xl sm:rounded-2xl bg-transparent sm:bg-white/5 border-0 sm:border sm:border-white/5 relative group transition-all duration-300 hover:bg-white/5 cursor-pointer"
    >
      {/* Speaker Avatar Wrapper with Glow Sync */}
      <div
        className={cn(
          "relative flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full text-2xl sm:text-4xl select-none transition-all duration-300",
          role === "host" 
            ? "bg-gradient-to-tr from-amber-500/20 to-yellow-500/20 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]" 
            : "bg-gradient-to-tr from-violet-500/15 to-cyan-500/15 border-white/10",
          isSpeaking 
            ? (role === "host" ? "speaking-host-active scale-105" : "speaking-active scale-105") 
            : ""
        )}
      >
        {emoji}

        {/* Role Badge Overlays */}
        {role === "host" && (
          <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-amber-500 text-[8px] sm:text-[10px] text-black shadow-md border border-background" title="Host">
            👑
          </span>
        )}
        {role === "moderator" && (
          <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-cyan-500 text-[8px] sm:text-[10px] text-white shadow-md border border-background" title="Moderator">
            🛡️
          </span>
        )}

        {/* Muted Overlay Icon */}
        {!isAudioEnabled && (
          <span className="absolute -bottom-1 -right-1 flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-rose-500 text-white shadow-md border border-background">
            <MicOff className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
          </span>
        )}
      </div>

      {/* Participant Name & Role Badge */}
      <div className="mt-1 sm:mt-2.5 flex flex-col items-center gap-0.5 min-w-0 w-full">
        <span className="text-[10px] sm:text-xs font-bold text-foreground max-w-full truncate text-center leading-none">
          {participant.name} {isSelf && <span className="text-muted-foreground/60 font-semibold">(You)</span>}
        </span>
        {role === "moderator" && (
          <span className="text-[9px] font-black bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-1.5 py-0.5 rounded-full select-none mt-1 uppercase tracking-wider">
            Mod
          </span>
        )}
      </div>

      {/* Context Actions Overlay (Visible to host/mod, excluding themselves) */}
      {isHost && !isSelf && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "absolute inset-0 bg-zinc-950/95 rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 p-2 z-10",
            showOverlay
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none md:group-hover:opacity-100 md:group-hover:pointer-events-auto"
          )}
        >
          {onMute && isAudioEnabled && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMute(participant);
                setShowOverlay(false);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 active:scale-90 transition-all border border-white/5"
              title="Mute"
            >
              <MicOff className="h-4 w-4" />
            </button>
          )}
          {onDemote && role !== "host" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDemote(participant.identity);
                setShowOverlay(false);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 active:scale-90 transition-all border border-white/5"
              title="Demote to Listener"
            >
              <UserMinus className="h-4 w-4" />
            </button>
          )}
          {onKick && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onKick(participant.identity);
                setShowOverlay(false);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/20 hover:bg-rose-500/30 active:scale-90 transition-all"
              title="Remove Participant"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
