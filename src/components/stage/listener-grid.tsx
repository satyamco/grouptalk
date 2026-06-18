"use client";

import { useState, useEffect } from "react";
import { RemoteParticipant, LocalParticipant } from "livekit-client";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface ListenerGridProps {
  listeners: (LocalParticipant | RemoteParticipant)[];
  localIdentity: string;
  pendingRequestGuestIds: string[]; // List of guestIds with active raised hands
  isMobile?: boolean;
}

export function ListenerGrid({
  listeners,
  localIdentity,
  pendingRequestGuestIds,
  isMobile = false,
}: ListenerGridProps) {
  const [selectedListener, setSelectedListener] = useState<LocalParticipant | RemoteParticipant | null>(null);

  const renderDialog = () => {
    if (!selectedListener) return null;

    const isSelf = selectedListener.identity === localIdentity;
    let emoji = "🦁";
    try {
      if (selectedListener.metadata) {
        const parsed = JSON.parse(selectedListener.metadata);
        emoji = parsed.emoji || "🦁";
      }
    } catch {
      // Fallback
    }

    return (
      <Dialog open={!!selectedListener} onOpenChange={(open) => { if (!open) setSelectedListener(null); }}>
        <DialogContent className="glass-panel border-white/10 text-foreground w-[85vw] sm:max-w-xs rounded-2xl p-5 text-center flex flex-col items-center justify-center">
          <DialogHeader className="w-full flex flex-col items-center justify-center">
            <DialogTitle className="text-sm font-extrabold uppercase tracking-widest text-violet-400">
              Listener Info
            </DialogTitle>
            <DialogDescription className="sr-only">
              Details about the selected listener.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2 flex flex-col items-center justify-center w-full">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-violet-500/15 to-cyan-500/15 border border-white/10 text-4xl select-none">
              {emoji}
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-black text-white">
                {selectedListener.name || "Anonymous Listener"} {isSelf && "(You)"}
              </h4>
              <span className="text-[9px] font-black bg-zinc-800 text-zinc-400 border border-zinc-700/50 px-2 py-0.5 rounded-full uppercase tracking-widest select-none">
                Listener
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  if (isMobile) {
    return (
      <div className="w-full">
        {listeners.length === 0 ? (
          <div className="text-[9px] text-zinc-600/70 italic py-1 pl-1">
            No listeners.
          </div>
        ) : (
          <div className="flex flex-row overflow-x-auto flex-nowrap gap-3.5 py-1 scrollbar-none w-full">
            {listeners.map((listener) => {
              // Decode metadata
              let emoji = "🦁";
              try {
                if (listener.metadata) {
                  const parsed = JSON.parse(listener.metadata);
                  emoji = parsed.emoji || "🦁";
                }
              } catch {
                // Fallback
              }

              const hasHandRaised = pendingRequestGuestIds.includes(listener.identity);

              return (
                <div
                  key={listener.identity}
                  onClick={() => setSelectedListener(listener)}
                  className="flex flex-col items-center justify-center shrink-0 relative group cursor-pointer active:scale-95 transition-all"
                >
                  {/* Listener Bubble */}
                  <div className="relative flex h-10 w-10 items-center justify-center rounded-full text-xl bg-zinc-950 border border-zinc-800/80 shadow-sm select-none">
                    {emoji}

                    {/* Hand Raise Overlay indicator */}
                    {hasHandRaised && (
                      <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-violet-600 text-[9px] text-white shadow-md border border-background animate-bounce">
                        🤚
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {renderDialog()}
      </div>
    );
  }

  // Desktop layout: standard wrapping card list
  return (
    <div className="space-y-3 flex-1 flex flex-col min-h-0">
      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
        Listeners ({listeners.length})
      </h3>

      <div className="flex-1 overflow-y-auto rounded-2xl bg-white/3 border border-white/5 p-4 max-h-[200px]">
        {listeners.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground italic">
            No listeners in this room.
          </div>
        ) : (
          <div className="flex flex-wrap gap-4 items-start content-start">
            {listeners.map((listener) => {
              const isSelf = listener.identity === localIdentity;
              
              // Decode metadata
              let emoji = "🦁";
              try {
                if (listener.metadata) {
                  const parsed = JSON.parse(listener.metadata);
                  emoji = parsed.emoji || "🦁";
                }
              } catch {
                // Fallback
              }

              const hasHandRaised = pendingRequestGuestIds.includes(listener.identity);

              return (
                <div
                  key={listener.identity}
                  onClick={() => setSelectedListener(listener)}
                  className="flex flex-col items-center justify-center space-y-1 relative group cursor-pointer"
                >
                  {/* Listener Bubble */}
                  <div className="relative flex h-10 w-10 items-center justify-center rounded-full text-xl bg-white/5 border border-white/5 shadow-sm transition duration-200 hover:scale-105 select-none">
                    {emoji}

                    {/* Hand Raise Overlay indicator */}
                    {hasHandRaised && (
                      <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-[10px] text-white shadow-md border border-background animate-bounce" title="Hand Raised">
                        🤚
                      </span>
                    )}
                  </div>

                  {/* Name below */}
                  <span className="text-[10px] text-muted-foreground/80 font-medium max-w-[50px] truncate text-center leading-none">
                    {listener.name} {isSelf && <span className="opacity-60">(You)</span>}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {renderDialog()}
    </div>
  );
}
