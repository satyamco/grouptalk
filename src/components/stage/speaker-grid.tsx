"use client";

import { useState, useEffect } from "react";
import { RemoteParticipant, LocalParticipant } from "livekit-client";
import { Hand, Lock } from "lucide-react";
import { SpeakerTile } from "./speaker-tile";
import { cn } from "@/lib/utils";

interface SpeakerGridProps {
  speakers: (LocalParticipant | RemoteParticipant)[];
  isHost: boolean;
  localIdentity: string;
  onKick?: (guestId: string) => void;
  onMute?: (participant: LocalParticipant | RemoteParticipant) => void;
  onDemote?: (guestId: string) => void;
  // New props for empty seat clicks & role info
  userRole?: string;
  hasHandRaised?: boolean;
  onHandRaiseToggle?: () => void;
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
}: SpeakerGridProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const getRole = (participant: any) => {
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

  if (isMobile) {
    // Mobile layout: Fixed 8-seat grid (2 rows of 4 seats)
    const totalSeats = 8;
    const seats = Array.from({ length: totalSeats }, (_, i) => {
      if (i === 0) return host || null;
      return nonHosts[i - 1] || null;
    });

    return (
      <div className="w-full">
        <div className="grid grid-cols-4 gap-2">
          {seats.map((speaker, i) => {
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
                />
              );
            }

            // Render Empty Seat
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
                  "flex flex-col items-center justify-center p-1 rounded-xl bg-transparent border-0 transition-all duration-300 select-none relative",
                  isClickable ? "cursor-pointer hover:bg-white/5 active:scale-95" : ""
                )}
              >
                <div
                  className={cn(
                    "relative flex h-12 w-12 items-center justify-center rounded-full border border-dashed text-lg transition-all duration-300",
                    hasHandRaised && userRole === "listener"
                      ? "border-violet-500 bg-violet-600/10 text-violet-400 shadow-[0_0_12px_rgba(124,58,237,0.15)] animate-[pulse_2s_infinite]"
                      : "border-zinc-800/80 bg-zinc-950/40 text-zinc-600/70"
                  )}
                >
                  <Hand className={cn(
                    "h-5 w-5 transition-all duration-300",
                    hasHandRaised && userRole === "listener" ? "text-violet-400 animate-bounce" : "text-zinc-600/50"
                  )} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Desktop layout: standard dynamic grid
  const orderedSpeakers = host ? [host, ...nonHosts] : nonHosts;
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
        Speakers ({speakers.length})
      </h3>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 max-h-[360px] overflow-y-auto pr-1">
        {orderedSpeakers.map((speaker) => (
          <SpeakerTile
            key={speaker.identity}
            participant={speaker}
            isHost={isHost}
            isSelf={speaker.identity === localIdentity}
            onKick={onKick}
            onMute={onMute}
            onDemote={onDemote}
          />
        ))}
      </div>
    </div>
  );
}
