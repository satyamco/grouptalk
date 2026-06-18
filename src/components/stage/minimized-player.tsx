"use client";

import { useMemo, useState, memo } from "react";
import { useRouter } from "next/navigation";
import { useVoice } from "@/hooks/use-voice";
import { useVoiceStore } from "@/hooks/use-voice-store";
import { Button } from "@/components/ui/button";
import { HostTransferDialog } from "./host-transfer-dialog";
import { CATEGORY_META } from "@/lib/constants";
import { getGuestId } from "@/hooks/use-guest-id";
import {
  Mic,
  MicOff,
  Maximize2,
  LogOut,
  Volume2,
  Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const MinimizedPlayer = memo(function MinimizedPlayer() {
  const router = useRouter();
  const guestId = getGuestId();
  const {
    activeRoomId,
    activeRoomData,
    userParticipant,
    setMinimized,
    leaveRoom,
  } = useVoiceStore();

  const {
    localParticipant,
    isMuted,
    toggleMute,
    allParticipants,
  } = useVoice();

  const [isTransferOpen, setIsTransferOpen] = useState(false);

  // Group participants for host transfer if needed
  const otherParticipants = useMemo(() => {
    const list: { guestId: string; name: string; emoji: string; role: string }[] = [];
    allParticipants.forEach((p) => {
      let role = "listener";
      let emoji = "🦁";
      try {
        if (p.metadata) {
          const parsed = JSON.parse(p.metadata);
          role = parsed.role || "listener";
          emoji = parsed.emoji || "🦁";
        }
      } catch {}
      list.push({
        guestId: p.identity,
        name: p.name || "Anonymous",
        emoji,
        role,
      });
    });
    return list;
  }, [allParticipants]);

  // Determine active speaker
  const activeSpeaker = useMemo(() => {
    if (localParticipant?.isSpeaking) {
      let emoji = "🦁";
      try {
        if (localParticipant.metadata) {
          const parsed = JSON.parse(localParticipant.metadata);
          emoji = parsed.emoji || "🦁";
        }
      } catch {}
      return { name: localParticipant.name || "You", emoji };
    }

    for (const p of allParticipants) {
      if (p.isSpeaking) {
        let emoji = "🦁";
        try {
          if (p.metadata) {
            const parsed = JSON.parse(p.metadata);
            emoji = parsed.emoji || "🦁";
          }
        } catch {}
        return { name: p.name || "Anonymous", emoji };
      }
    }

    return null;
  }, [allParticipants, localParticipant]);

  if (!activeRoomId || !activeRoomData || !userParticipant) return null;

  const meta = CATEGORY_META[activeRoomData.category] || { icon: "💬" };

  const handleMaximize = () => {
    router.push(`/rooms/${activeRoomId}`);
    setMinimized(false);
  };

  const handleLeaveClick = () => {
    if (userParticipant.role === "host") {
      setIsTransferOpen(true);
    } else {
      const confirmLeave = window.confirm("Are you sure you want to leave the room?");
      if (confirmLeave) {
        leaveRoom();
        toast.info("Left the room");
      }
    }
  };

  const handleTransferAndLeave = async (newHostGuestId: string) => {
    try {
      const res = await fetch(`/api/rooms/${activeRoomId}/participants`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-guest-id": guestId,
        },
        body: JSON.stringify({ targetGuestId: newHostGuestId, role: "host" }),
      });

      if (!res.ok) {
        throw new Error("Failed to transfer host role");
      }

      await leaveRoom();
      setIsTransferOpen(false);
      toast.success("Host role transferred. You left the room.");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Host transfer failed";
      toast.error(msg);
    }
  };

  const handleEndRoom = async () => {
    try {
      // 1. Terminate room
      const res = await fetch(`/api/rooms/${activeRoomId}`, {
        method: "DELETE",
        headers: { "x-guest-id": guestId },
      });

      if (!res.ok) throw new Error("Failed to end room");

      await leaveRoom();
      setIsTransferOpen(false);
      toast.success("Room ended successfully");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to end room";
      toast.error(msg);
    }
  };

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-55 w-[92vw] max-w-xl animate-in fade-in slide-in-from-bottom-6 duration-300">
        <div className="glass-panel bg-zinc-950/80 border border-white/10 backdrop-blur-xl rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-4">
          
          {/* Room details & Active speaker status */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-xl select-none">
              {meta.icon}
            </div>
            
            <div className="flex flex-col min-w-0 text-left">
              <span className="text-xs font-black text-white truncate max-w-[180px] sm:max-w-[240px]">
                {activeRoomData.name}
              </span>
              
              <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                {activeSpeaker ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <span className="text-[10px] text-emerald-400 font-bold truncate max-w-[120px] sm:max-w-[160px]">
                      🎙️ {activeSpeaker.emoji} {activeSpeaker.name} is speaking...
                    </span>
                  </>
                ) : (
                  <>
                    <Radio className="h-3 w-3 text-cyan-400 animate-pulse shrink-0" />
                    <span className="text-[10px] text-zinc-400 font-medium truncate">
                      Hosted by {activeRoomData.host_name}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Microphone toggle for speakers/hosts */}
            {userParticipant.role !== "listener" ? (
              <Button
                size="icon"
                onClick={toggleMute}
                className={cn(
                  "h-9 w-9 rounded-xl active-bounce border transition-all shrink-0",
                  isMuted
                    ? "bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20"
                    : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                )}
                title={isMuted ? "Unmute Mic" : "Mute Mic"}
              >
                {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            ) : (
              <div className="h-9 w-9 rounded-xl border border-white/5 bg-white/3 flex items-center justify-center text-cyan-400 shrink-0" title="Listening">
                <Volume2 className="h-4 w-4 animate-pulse" />
              </div>
            )}

            {/* Maximize */}
            <Button
              size="icon"
              variant="ghost"
              onClick={handleMaximize}
              className="h-9 w-9 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 text-zinc-300 hover:text-white shrink-0 active-bounce"
              title="Maximize Stage"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>

            {/* Leave */}
            <Button
              size="icon"
              onClick={handleLeaveClick}
              className="h-9 w-9 rounded-xl bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-600/20 shrink-0 active-bounce"
              title="Leave Room"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Host Exit dialog */}
      <HostTransferDialog
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        otherParticipants={otherParticipants}
        onTransferAndLeave={handleTransferAndLeave}
        onEndRoom={handleEndRoom}
      />
    </>
  );
});
