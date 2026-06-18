"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Award, LogOut, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface HostTransferDialogProps {
  isOpen: boolean;
  onClose: () => void;
  otherParticipants: { guestId: string; name: string; emoji: string; role: string }[];
  onTransferAndLeave: (newHostGuestId: string) => Promise<void>;
  onEndRoom: () => Promise<void>;
}

export function HostTransferDialog({
  isOpen,
  onClose,
  otherParticipants,
  onTransferAndLeave,
  onEndRoom,
}: HostTransferDialogProps) {
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  const handleTransfer = async () => {
    if (!selectedGuestId) return;
    setIsTransferring(true);
    try {
      await onTransferAndLeave(selectedGuestId);
    } catch (error) {
      console.error("Failed to transfer host:", error);
    } finally {
      setIsTransferring(false);
    }
  };

  const handleEnd = async () => {
    setIsEnding(true);
    try {
      await onEndRoom();
    } catch (error) {
      console.error("Failed to end room:", error);
    } finally {
      setIsEnding(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="glass-panel border-white/10 text-foreground w-[92vw] sm:max-w-md rounded-2xl max-h-[85dvh] flex flex-col p-6 overflow-hidden bg-zinc-950/95 backdrop-blur-xl">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-2">
            <Award className="h-5 w-5 text-violet-400" />
            Host Exit Options
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400 font-medium">
            You are the host of this room. Appoint a new host before leaving, or end the room for everyone.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 py-4 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-cyan-400" />
              Appoint New Host
            </label>

            {otherParticipants.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center bg-white/3 border border-white/5 rounded-xl space-y-2">
                <span className="text-2xl">👥</span>
                <p className="text-xs italic text-zinc-500 font-medium px-4">
                  No other participants are currently in the room. You must end the room to leave.
                </p>
              </div>
            ) : (
              <ScrollArea className="h-44 border border-white/5 rounded-xl bg-zinc-900/30 p-2">
                <div className="space-y-1.5">
                  {otherParticipants.map((p) => {
                    const isSelected = selectedGuestId === p.guestId;
                    return (
                      <button
                        key={p.guestId}
                        onClick={() => setSelectedGuestId(p.guestId)}
                        className={cn(
                          "w-full flex items-center justify-between p-2.5 rounded-xl border transition-all duration-200 text-left",
                          isSelected
                            ? "bg-violet-600/20 border-violet-500/50 text-white"
                            : "bg-white/3 hover:bg-white/5 border-transparent text-zinc-300"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 border border-white/10 text-lg select-none">
                            {p.emoji}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold truncate">{p.name}</span>
                            <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-extrabold">
                              {p.role}
                            </span>
                          </div>
                        </div>
                        {isSelected && (
                          <span className="h-2 w-2 rounded-full bg-violet-400 shrink-0 shadow-lg shadow-violet-500/50" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          {otherParticipants.length > 0 && (
            <Button
              onClick={handleTransfer}
              disabled={!selectedGuestId || isTransferring || isEnding}
              className="w-full bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-bold rounded-xl h-11 shadow-lg shadow-violet-500/20 active-bounce flex items-center justify-center gap-2"
            >
              <Award className="h-4 w-4" />
              {isTransferring ? "Transferring Host..." : "Transfer Host & Leave"}
            </Button>
          )}

          <Button
            onClick={handleEnd}
            disabled={isTransferring || isEnding}
            variant="destructive"
            className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl h-11 shadow-lg shadow-rose-600/20 active-bounce flex items-center justify-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            {isEnding ? "Ending Room..." : "End Room for Everyone"}
          </Button>

          <Button
            onClick={onClose}
            disabled={isTransferring || isEnding}
            variant="ghost"
            className="w-full rounded-xl h-11 border border-white/5 text-zinc-400 hover:text-white"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
