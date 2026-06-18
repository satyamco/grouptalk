"use client";

import { useState, memo } from "react";
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
  isCompact?: boolean;
}

export const SpeakerTile = memo(function SpeakerTile({
  participant,
  isHost,
  isSelf,
  onKick,
  onMute,
  onDemote,
  isCompact = false,
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
      className={cn(
        "flex flex-col items-center justify-center relative group transition-all duration-300 hover:bg-white/5 cursor-pointer border-white/5",
        isCompact
          ? "p-1 rounded-lg sm:rounded-xl bg-transparent sm:bg-white/3 border-0 sm:border"
          : "p-1 sm:p-3 rounded-xl sm:rounded-2xl bg-transparent sm:bg-white/5 border-0 sm:border"
      )}
    >
      {/* Speaker Avatar Wrapper with Glow Sync */}
      <div
        className={cn(
          "relative flex items-center justify-center rounded-full select-none transition-all duration-300",
          isCompact
            ? "h-9 w-9 sm:h-12 sm:w-12 text-lg sm:text-2xl"
            : "h-12 w-12 sm:h-16 sm:w-16 text-2xl sm:text-4xl",
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
          <span 
            className={cn(
              "absolute -top-1 -right-1 flex items-center justify-center rounded-full bg-amber-500 text-black shadow-md border border-background",
              isCompact ? "h-3.5 w-3.5 sm:h-4 w-4 text-[6px] sm:text-[8px]" : "h-4.5 w-4.5 sm:h-5 sm:w-5 text-[8px] sm:text-[10px]"
            )} 
            title="Host"
          >
            👑
          </span>
        )}
        {role === "moderator" && (
          <span 
            className={cn(
              "absolute -top-1 -right-1 flex items-center justify-center rounded-full bg-cyan-500 text-white shadow-md border border-background",
              isCompact ? "h-3.5 w-3.5 sm:h-4 w-4 text-[6px] sm:text-[8px]" : "h-4.5 w-4.5 sm:h-5 sm:w-5 text-[8px] sm:text-[10px]"
            )} 
            title="Moderator"
          >
            🛡️
          </span>
        )}

        {/* Muted Overlay Icon */}
        {!isAudioEnabled && (
          <span 
            className={cn(
              "absolute -bottom-1 -right-1 flex items-center justify-center rounded-full bg-rose-500 text-white shadow-md border border-background",
              isCompact ? "h-4 w-4 sm:h-5 sm:w-5" : "h-5 w-5 sm:h-6 sm:w-6"
            )}
          >
            <MicOff className={cn(isCompact ? "h-2 w-2 sm:h-2.5 sm:w-2.5" : "h-2.5 w-2.5 sm:h-3 sm:w-3")} />
          </span>
        )}
      </div>

      {/* Participant Name & Role Badge */}
      <div className={cn("flex flex-col items-center gap-0.5 min-w-0 w-full", isCompact ? "mt-0.5 sm:mt-1.5" : "mt-1 sm:mt-2.5")}>
        <span className={cn("font-bold text-foreground max-w-full truncate text-center leading-none", isCompact ? "text-[8px] sm:text-[10px]" : "text-[10px] sm:text-xs")}>
          {participant.name} {isSelf && <span className="text-muted-foreground/60 font-semibold">(You)</span>}
        </span>
        {role === "moderator" && (
          <span className={cn("font-black bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full select-none uppercase tracking-wider", isCompact ? "text-[7px] sm:text-[8px] px-1.5 py-0.5 mt-0.5" : "text-[9px] px-1.5 py-0.5 mt-1")}>
            Mod
          </span>
        )}
      </div>

      {/* Context Actions Overlay (Visible to host/mod, excluding themselves) */}
      {isHost && !isSelf && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "absolute inset-0 bg-zinc-950/95 transition-all duration-200 flex items-center justify-center gap-2 z-10",
            isCompact ? "rounded-xl p-1" : "rounded-2xl p-2",
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
              className={cn(
                "flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 active:scale-90 transition-all border border-white/5",
                isCompact ? "h-6 w-6" : "h-8 w-8"
              )}
              title="Mute"
            >
              <MicOff className={cn(isCompact ? "h-3 w-3" : "h-4 w-4")} />
            </button>
          )}
          {onDemote && role !== "host" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDemote(participant.identity);
                setShowOverlay(false);
              }}
              className={cn(
                "flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 active:scale-90 transition-all border border-white/5",
                isCompact ? "h-6 w-6" : "h-8 w-8"
              )}
              title="Demote to Listener"
            >
              <UserMinus className={cn(isCompact ? "h-3 w-3" : "h-4 w-4")} />
            </button>
          )}
          {onKick && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onKick(participant.identity);
                setShowOverlay(false);
              }}
              className={cn(
                "flex items-center justify-center rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/20 hover:bg-rose-500/30 active:scale-90 transition-all",
                isCompact ? "h-6 w-6" : "h-8 w-8"
              )}
              title="Remove Participant"
            >
              <Trash2 className={cn(isCompact ? "h-3 w-3" : "h-4 w-4")} />
            </button>
          )}
        </div>
      )}
    </div>
  );
});
