"use client";

import { RemoteParticipant, LocalParticipant } from "livekit-client";
import { Hand } from "lucide-react";
import { SpeakerTile } from "./speaker-tile";
import { cn } from "@/lib/utils";

interface SpeakerGridProps {
  speakers: (LocalParticipant | RemoteParticipant)[];
  isHost: boolean;
  localIdentity: string;
  onKick?: (guestId: string) => void;
  onMute?: (participant: LocalParticipant | RemoteParticipant) => void;
  onDemote?: (guestId: string) => void;
  userRole?: string;
  hasHandRaised?: boolean;
  onHandRaiseToggle?: () => void;
  maxSeats?: number;
}

export function SpeakerGrid({
  speakers,
  isHost,
  localIdentity,
  onKick,
  onMute,
  onDemote,
  userRole = "listener",
  hasHandRaised = false,
  onHandRaiseToggle,
  maxSeats = 8,
}: SpeakerGridProps) {
  const getRole = (participant: LocalParticipant | RemoteParticipant) => {
    if (participant.identity === localIdentity) {
      return userRole;
    }
    try {
      if (participant.metadata) {
        const parsed = JSON.parse(participant.metadata);
        return parsed.role || "speaker";
      }
    } catch {}
    return "speaker";
  };

  const host = speakers.find((s) => getRole(s) === "host");
  const nonHosts = speakers.filter((s) => getRole(s) !== "host");

  const totalSeats = maxSeats;
  const seats = Array.from({ length: totalSeats }, (_, i) => {
    if (i === 0) return host || null;
    return nonHosts[i - 1] || null;
  });

  return (
    <div className="w-full space-y-3">
      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-left pl-1">
        Speakers ({speakers.length} / {maxSeats})
      </h3>

      <div className={cn("grid grid-cols-4 max-w-xl mx-auto", maxSeats > 8 ? "gap-1.5 sm:gap-2" : "gap-2 sm:gap-3")}>
        {seats.map((speaker, i) => {
          const isCompact = maxSeats > 8;
          if (speaker) {
            return (
              <SpeakerTile
                key={speaker.identity}
                participant={speaker}
                isHost={isHost}
                isSelf={speaker.identity === localIdentity}
                onKick={onKick}
                onMute={onMute}
                onDemote={onDemote}
                isCompact={isCompact}
              />
            );
          }

          // Render Empty Seat Placeholder
          const isClickable = userRole === "listener" && onHandRaiseToggle;
          return (
            <div
              key={`empty-seat-${i}`}
              onClick={() => {
                if (isClickable && onHandRaiseToggle) {
                  onHandRaiseToggle();
                }
              }}
              className={cn(
                "flex flex-col items-center justify-center border border-dashed transition-all duration-300 select-none aspect-square relative",
                isClickable
                  ? "border-violet-500/20 bg-violet-600/5 hover:bg-violet-600/10 cursor-pointer active:scale-95"
                  : "border-zinc-800/80 bg-zinc-950/40 text-zinc-600/70",
                isCompact
                  ? "p-1 rounded-lg sm:rounded-xl"
                  : "p-2 rounded-xl sm:rounded-2xl"
              )}
              title={isClickable ? "Click to Raise Hand" : "Empty Seat"}
            >
              <div
                className={cn(
                  "relative flex items-center justify-center rounded-full border border-dashed text-lg transition-all duration-300",
                  isCompact
                    ? "h-8 w-8 sm:h-10 sm:w-10"
                    : "h-10 w-10 sm:h-12 sm:w-12",
                  hasHandRaised && userRole === "listener"
                    ? "border-violet-500 bg-violet-600/10 text-violet-400 shadow-[0_0_12px_rgba(124,58,237,0.15)] animate-[pulse_2s_infinite]"
                    : "border-transparent text-zinc-650/30"
                )}
              >
                <Hand className={cn(
                  "transition-all duration-300",
                  isCompact ? "h-3.5 w-3.5 sm:h-4 sm:w-4" : "h-4 w-4 sm:h-5 sm:w-5",
                  hasHandRaised && userRole === "listener" ? "text-violet-400 animate-bounce" : "text-zinc-650/30"
                )} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
