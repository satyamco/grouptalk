"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import { Room, Participant, ChatMessage, SpeakerRequest } from "@/types";
import { useVoice } from "@/hooks/use-voice";
import { useChat } from "@/hooks/use-chat";
import { getGuestId } from "@/hooks/use-guest-id";
import { cn } from "@/lib/utils";
import { SpeakerGrid } from "./speaker-grid";
import { ListenerGrid } from "./listener-grid";
import { StageControls } from "./stage-controls";
import { HandRaisePanel } from "./hand-raise-panel";
import { ChatPanel } from "../chat/chat-panel";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { CATEGORY_META } from "@/lib/constants";
import { ShieldAlert, Users, MessageSquare, Award, ArrowLeft, Mic, MicOff, Volume2, Send, LayoutGrid, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { nanoid } from "nanoid";

export interface VoiceStageProps {
  token: string;
  roomId: string;
  roomData: Room;
  initialParticipants: Participant[];
  userParticipant: Participant;
}

// Sub-component that runs inside the LiveKitRoom context
function VoiceStageContent({
  roomId,
  roomData,
  userParticipant,
}: {
  roomId: string;
  roomData: Room;
  userParticipant: Participant;
}) {
  const router = useRouter();
  const guestId = getGuestId();

  // Mobile layout state and refs
  const [isMobile, setIsMobile] = useState(false);
  const [mobileText, setMobileText] = useState("");
  const mobileChatBottomRef = useRef<HTMLDivElement>(null);
  const mobileMessagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // 1. LiveKit Voice hook
  const {
    room,
    localParticipant,
    isMuted,
    toggleMute,
    leaveRoom,
    allParticipants,
    connectionState,
  } = useVoice();

  // State for moderation/hand raises
  const [requests, setRequests] = useState<SpeakerRequest[]>([]);
  const [isRequestsOpen, setIsRequestsOpen] = useState(false);
  const [hasHandRaised, setHasHandRaised] = useState(false);
  
  // State for UI toggles
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  


  // Fetch pending requests from DB (for hosts/mods)
  const fetchRequests = useCallback(async () => {
    const isHostOrMod = userParticipant.role === "host" || userParticipant.role === "moderator";
    if (!isHostOrMod) return;

    try {
      const res = await fetch(`/api/rooms/${roomId}`);
      if (!res.ok) return;
      
      // We can also query requests directly, but since we want to be light, let's fetch active requests.
      // Wait, let's fetch requests from a separate endpoint or from the room details if it includes them.
      // Actually, we can fetch all requests by hitting database tables or a helper API.
      // Let's query Supabase directly using client-side query since we want it fast, or write a fetch.
      // Wait! Let's fetch using a direct fetch to database via Supabase client, which is already configured.
      const { supabase } = await import("@/lib/supabase/client");
      const { data } = await supabase
        .from("speaker_requests")
        .select("*")
        .eq("room_id", roomId)
        .eq("status", "pending");
      
      setRequests(data || []);
    } catch (error) {
      console.error("Failed to fetch requests:", error);
    }
  }, [roomId, userParticipant.role]);

  // Load requests on mount
  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Sync hand raise state for the local participant on mount
  useEffect(() => {
    if (userParticipant.role !== "listener") return;

    const checkHandRaised = async () => {
      const { supabase } = await import("@/lib/supabase/client");
      const { data } = await supabase
        .from("speaker_requests")
        .select("id")
        .eq("room_id", roomId)
        .eq("guest_id", guestId)
        .eq("status", "pending")
        .maybeSingle();

      setHasHandRaised(!!data);
    };

    checkHandRaised();
  }, [roomId, guestId, userParticipant.role]);

  // If we get disconnected from LiveKit room, check if the room was ended
  useEffect(() => {
    if (connectionState === "disconnected" && userParticipant.role !== "host") {
      const checkRoomStatus = async () => {
        try {
          const res = await fetch(`/api/rooms/${roomId}`);
          if (!res.ok) {
            toast.error("This room has ended.");
            router.push("/rooms");
          }
        } catch {
          router.push("/rooms");
        }
      };

      const timer = setTimeout(checkRoomStatus, 1000);
      return () => clearTimeout(timer);
    }
  }, [connectionState, roomId, router, userParticipant.role]);



  const broadcastRoleChangeRef = useRef<any>(null);

  // Helper to handle quick action directly from the toast
  const handleQuickAction = useCallback(
    async (targetGuestId: string, status: "approved" | "rejected", toastId: string | number) => {
      try {
        const response = await fetch("/api/speaker-requests", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-guest-id": guestId || "",
          },
          body: JSON.stringify({
            room_id: roomId,
            guest_id: targetGuestId,
            status,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || `Failed to ${status} request`);
        }

        toast.dismiss(toastId);
        toast.success(`Request ${status === "approved" ? "approved" : "rejected"} successfully`, { duration: 6000 });

        if (status === "approved" && broadcastRoleChangeRef.current) {
          // Promote in real-time
          await broadcastRoleChangeRef.current(targetGuestId, "speaker");
        }

        // Refresh requests list
        fetchRequests();
      } catch (error: any) {
        toast.error(error.message || "An error occurred");
      }
    },
    [roomId, guestId, fetchRequests]
  );

  // 2. LiveKit Chat hook
  const {
    messages,
    sendMessage,
    broadcastRoleChange,
    broadcastParticipantRemoved,
    broadcastHandRaise,
    broadcastRoomEnded,
  } = useChat({
    senderName: userParticipant.name,
    senderEmoji: userParticipant.emoji,
    onRoleChanged: (targetGuestId, newRole) => {
      // If our own role changed
      if (targetGuestId === guestId) {
        toast.success(`You have been promoted to ${newRole}!`);
        // Reconnect to publish audio track or simply reload
        window.location.reload();
      }
    },
    onParticipantRemoved: (targetGuestId) => {
      if (targetGuestId === guestId) {
        toast.error("You have been removed from the room by the host.");
        leaveRoom();
        router.push("/rooms");
      }
    },
    onRequestsChanged: fetchRequests,
    onHandRaiseReceived: (targetGuestId, name, emoji) => {
      const isHostOrMod = userParticipant.role === "host" || userParticipant.role === "moderator";
      if (!isHostOrMod) return;

      toast.custom(
        (id) => (
          <div className="glass-panel border border-white/10 text-foreground p-4 rounded-xl flex items-center justify-between gap-4 max-w-sm w-full shadow-2xl backdrop-blur-xl bg-zinc-900/90 animate-in fade-in slide-in-from-bottom-5 duration-300">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5 border border-white/10 text-2xl select-none">
                {emoji}
              </div>
              <div className="flex flex-col text-left min-w-0">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-violet-400">Speaker Request</span>
                <span className="text-sm font-bold text-white truncate max-w-[150px]">
                  {name}
                </span>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => handleQuickAction(targetGuestId, "rejected", id)}
                className="h-8 px-3 rounded-lg text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 active:scale-95 transition-all duration-200"
              >
                Reject
              </button>
              <button
                onClick={() => handleQuickAction(targetGuestId, "approved", id)}
                className="h-8 px-3 rounded-lg text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/20 active:scale-95 transition-all duration-200"
              >
                Approve
              </button>
            </div>
          </div>
        ),
        {
          duration: 6000,
        }
      );
    },
    onRoomEnded: (hostName) => {
      toast.error(`The host (${hostName}) ended the room.`);
      setTimeout(() => {
        router.push("/rooms");
      }, 1500);
    },
  });

  // Assign the ref so handleQuickAction can use it
  broadcastRoleChangeRef.current = broadcastRoleChange;

  // Auto-scroll mobile chat
  useEffect(() => {
    if (isMobile) {
      mobileChatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isMobile]);

  // Increment unread count if chat is closed
  useEffect(() => {
    if (!isChatOpen && messages.length > 0) {
      setUnreadCount((prev) => prev + 1);
    }
  }, [messages, isChatOpen]);

  // Reset unread count when opening chat
  const handleChatToggle = () => {
    setIsChatOpen(!isChatOpen);
    if (!isChatOpen) {
      setUnreadCount(0);
    }
  };

  // Group participants by role from LiveKit list
  const { speakers, listeners } = useMemo(() => {
    const speakersList: any[] = [];
    const listenersList: any[] = [];

    // Map to deduplicate participants by identity
    const participantMap = new Map<string, any>();

    // Add local participant
    if (localParticipant) {
      participantMap.set(localParticipant.identity, localParticipant);
    }

    // Add all participants (this includes remote and potentially local)
    allParticipants.forEach((p) => {
      participantMap.set(p.identity, p);
    });

    // Categorize unique participants into speakers vs listeners
    participantMap.forEach((p) => {
      let role = "listener";
      try {
        if (p.metadata) {
          const parsed = JSON.parse(p.metadata);
          role = parsed.role || "listener";
        } else if (p.identity === localParticipant?.identity) {
          role = userParticipant.role;
        }
      } catch {}

      if (role !== "listener") {
        speakersList.push(p);
      } else {
        listenersList.push(p);
      }
    });

    return { speakers: speakersList, listeners: listenersList };
  }, [allParticipants, localParticipant, userParticipant.role]);

  // Pending request guest ids to show raised hand icons on listener grid
  const pendingGuestIds = useMemo(() => requests.map((r) => r.guest_id), [requests]);

  // Mute a participant (Host only)
  const handleHostMute = async (targetParticipant: any) => {
    if (userParticipant.role !== "host") return;
    // Broadcast mute event or mute them. In LiveKit OSS, we can use server action.
    toast.info(`Requesting mute for ${targetParticipant.name}...`);
  };

  // Demote speaker to listener (Host only)
  const handleHostDemote = async (targetGuestId: string) => {
    if (userParticipant.role !== "host") return;

    try {
      const res = await fetch(`/api/rooms/${roomId}/participants`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-guest-id": guestId },
        body: JSON.stringify({ targetGuestId, role: "listener" }),
      });

      if (!res.ok) throw new Error("Failed to demote");

      toast.success("Participant demoted to listener");
      broadcastRoleChange(targetGuestId, "listener");
    } catch (err: any) {
      toast.error(err.message || "Failed to demote participant");
    }
  };

  // Kick participant (Host only)
  const handleHostKick = async (targetGuestId: string) => {
    if (userParticipant.role !== "host") return;

    try {
      const res = await fetch(`/api/rooms/${roomId}/participants?targetGuestId=${targetGuestId}`, {
        method: "DELETE",
        headers: { "x-guest-id": guestId },
      });

      if (!res.ok) throw new Error("Failed to remove participant");

      toast.success("Participant removed from room");
      broadcastParticipantRemoved(targetGuestId);
    } catch (err: any) {
      toast.error(err.message || "Failed to remove participant");
    }
  };

  // Raise hand toggler (Listener only)
  const handleHandRaiseToggle = async () => {
    if (userParticipant.role !== "listener") return;

    const action = hasHandRaised ? "lower" : "raise";

    try {
      if (hasHandRaised) {
        // Lower hand (Delete from DB)
        const { supabase } = await import("@/lib/supabase/client");
        await supabase
          .from("speaker_requests")
          .delete()
          .eq("room_id", roomId)
          .eq("guest_id", guestId);

        setHasHandRaised(false);
        toast.info("Hand lowered");
        
        // Broadcast hand lower (empty name signals lowering)
        await broadcastHandRaise(guestId, "", "");
      } else {
        // Raise hand (Post to DB)
        const res = await fetch("/api/speaker-requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room_id: roomId,
            guest_id: guestId,
            name: userParticipant.name,
            emoji: userParticipant.emoji,
          }),
        });

        if (!res.ok) throw new Error("Failed to raise hand");

        setHasHandRaised(true);
        toast.success("Hand raised! Waiting for host approval...");
        
        // Broadcast hand raise to other participants
        await broadcastHandRaise(guestId, userParticipant.name, userParticipant.emoji);
      }

      // Refresh requests list for host/mod via fetch
      fetchRequests();
    } catch (err: any) {
      toast.error(err.message || "Action failed");
    }
  };

  // Leave Room
  const handleLeave = async () => {
    const confirmLeave = window.confirm("Are you sure you want to leave the room?");
    if (!confirmLeave) return;

    try {
      await leaveRoom();
      // Remove from participant list in DB
      await fetch(`/api/rooms/${roomId}/participants`, {
        method: "DELETE",
        headers: { "x-guest-id": guestId },
      });
      router.push("/rooms");
    } catch (error) {
      router.push("/rooms");
    }
  };

  // End Room (Host only)
  const handleEndRoom = async () => {
    if (userParticipant.role !== "host") return;

    const confirm = window.confirm("Are you sure you want to end this room for everyone?");
    if (!confirm) return;

    try {
      // 1. Broadcast to other participants that the room has ended
      await broadcastRoomEnded(userParticipant.name);

      // Small delay (200ms) to guarantee packet delivery
      await new Promise((resolve) => setTimeout(resolve, 200));

      // 2. Terminate room (DB & LiveKit Server Session)
      const res = await fetch(`/api/rooms/${roomId}`, {
        method: "DELETE",
        headers: { "x-guest-id": guestId },
      });

      if (!res.ok) throw new Error("Failed to end room");

      toast.success("Room ended");
      router.push("/rooms");
    } catch (err: any) {
      toast.error(err.message || "Failed to end room");
    }
  };

  const meta = CATEGORY_META[roomData.category] || { icon: "💬", gradient: "from-violet-500 to-purple-600" };

  if (isMobile) {
    return (
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-background relative select-none">


        {/* Room Header bar */}
        <header className="h-14 border-b border-white/5 bg-background/50 backdrop-blur-md px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={handleLeave}
              className="p-1.5 rounded-full hover:bg-white/5 text-muted-foreground hover:text-foreground active-bounce transition duration-200"
            >
              <ArrowLeft className="h-4.5 w-4.5" />
            </button>
            <div className="flex flex-col text-left min-w-0">
              <h1 className="text-xs font-black text-white truncate">
                {roomData.name}
              </h1>
              <p className="text-[9px] text-zinc-500 flex items-center gap-1 mt-0.5 font-semibold truncate">
                <span>{meta.icon}</span>
                <span>{roomData.category}</span>
                <span>•</span>
                <span>By {roomData.host_name}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[9px] text-zinc-500 font-bold bg-white/5 border border-white/5 px-2 py-0.5 rounded-full">
            <Users className="h-3 w-3 text-cyan-400" />
            <span>{allParticipants.length + 1} online</span>
          </div>
        </header>

        {/* Mobile Stage Layout Container */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-0 gap-0 bg-[#0b0c10]">
          {/* 1. Speakers Grid */}
          <div className="shrink-0 bg-transparent px-3 py-1.5 border-b border-white/5 rounded-none">
            <SpeakerGrid
              speakers={speakers}
              isHost={userParticipant.role === "host"}
              localIdentity={guestId}
              onKick={handleHostKick}
              onMute={handleHostMute}
              onDemote={handleHostDemote}
              userRole={userParticipant.role}
              hasHandRaised={hasHandRaised}
              onHandRaiseToggle={handleHandRaiseToggle}
            />
          </div>

          {/* 2. Listeners Row */}
          <div className="shrink-0 bg-transparent px-3 py-1.5 border-b border-white/5 rounded-none">
            <ListenerGrid
              listeners={listeners}
              localIdentity={guestId}
              pendingRequestGuestIds={pendingGuestIds}
            />
          </div>

          {/* 3. Inline Chat Section */}
          <div className="flex-1 flex flex-col min-h-0 bg-transparent rounded-none overflow-hidden px-3 pt-2 pb-0 relative">
            {/* Room Rules Card inside Chat */}
            <div className="bg-zinc-900/30 border border-white/5 rounded-lg p-1.5 mt-1.5 text-[10px] space-y-0.5 shrink-0">
              <span className="text-yellow-500 font-extrabold uppercase tracking-wide text-[9px]">
                📌 Room Rules
              </span>
              <p className="text-zinc-400 font-semibold leading-normal text-[9px] mt-0.5">
                🤝 Be Respectful • 🚫 No Spam or Promotions...
              </p>
            </div>

            {/* Chat Messages List */}
            <div 
              className="flex-1 overflow-y-auto pr-1 space-y-2 min-h-0 mt-1.5" 
              ref={mobileMessagesContainerRef}
            >
              {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-[10px] text-zinc-500 italic py-10">
                  No messages yet. Say hello!
                </div>
              ) : (
                <div className="space-y-2.5">
                  {messages.map((msg) => (
                    <div key={msg.id} className="flex items-start gap-1.5 text-[11px] leading-relaxed max-w-[95%]">
                      <span className="text-sm select-none shrink-0">{msg.senderEmoji}</span>
                      <div className="flex flex-col">
                        <div className="flex items-baseline gap-1">
                          <span className="font-extrabold text-violet-300">{msg.senderName}</span>
                          <span className="text-[8px] text-zinc-600 font-bold">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-zinc-355 font-medium whitespace-pre-wrap break-all mt-0.5">
                          {msg.message}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={mobileChatBottomRef} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Unified Mobile Bottom Controls Bar */}
        <div className="w-full border-t border-white/5 bg-zinc-950 py-3 px-3 flex items-center gap-3 shrink-0 pb-safe z-20">
          {/* Mic Toggle Icon Button */}
          {userParticipant.role !== "listener" ? (
            <button
              onClick={toggleMute}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center shrink-0 active:scale-95 transition-all",
                isMuted
                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                  : "bg-emerald-500 text-white shadow-md shadow-emerald-500/10"
              )}
            >
              {isMuted ? <MicOff className="h-4.5 w-4.5" /> : <Mic className="h-4.5 w-4.5" />}
            </button>
          ) : (
            <button
              disabled
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-zinc-900 text-zinc-650 border border-zinc-850"
            >
              <MicOff className="h-4.5 w-4.5 opacity-40" />
            </button>
          )}

          {/* Chat Input form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!mobileText.trim()) return;
              sendMessage(mobileText.trim());
              setMobileText("");
            }}
            className="flex-1 flex gap-1.5 items-center bg-zinc-900 border border-zinc-800 rounded-full px-3 py-1 h-10"
          >
            <input
              type="text"
              placeholder="Type..."
              value={mobileText}
              onChange={(e) => setMobileText(e.target.value)}
              maxLength={500}
              className="flex-1 bg-transparent border-0 outline-none text-xs text-white placeholder-zinc-500 font-medium"
            />
            <button
              type="submit"
              disabled={!mobileText.trim()}
              className="h-7 w-7 rounded-full bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center shrink-0 active:scale-90 disabled:opacity-40 transition-all"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>

          {/* Exit Room Icon Button */}
          <button
            onClick={userParticipant.role === "host" ? handleEndRoom : handleLeave}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-rose-600 text-white shrink-0 active:scale-95 transition-all shadow-md shadow-rose-600/10"
            title={userParticipant.role === "host" ? "End Room" : "Leave Room"}
          >
            <LogOut className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Host requests management Modal (Dialog) */}
        <Dialog open={isRequestsOpen} onOpenChange={setIsRequestsOpen}>
          <DialogContent className="glass-panel border-white/10 text-foreground w-[92vw] sm:max-w-sm md:max-w-md lg:max-w-lg rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                Raise Hands
              </DialogTitle>
              <DialogDescription className="sr-only">
                Manage speaker requests from listeners raising hands in the room.
              </DialogDescription>
            </DialogHeader>
            {isRequestsOpen && (
              <HandRaisePanel
                requests={requests}
                broadcastRoleChange={broadcastRoleChange}
                onActionComplete={() => {
                  fetchRequests();
                  setTimeout(fetchRequests, 1000);
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden bg-background relative select-none">
      {/* 1. Main Stage Section */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        


        {/* Room Header bar */}
        <header className="h-16 border-b border-white/5 bg-background/50 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={handleLeave}
              className="p-2 -ml-2 rounded-full hover:bg-white/5 text-muted-foreground hover:text-foreground active-bounce transition duration-200"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex flex-col text-left min-w-0">
              <h1 className="text-sm sm:text-base font-black text-foreground truncate">
                {roomData.name}
              </h1>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5 font-medium truncate">
                <span>{meta.icon}</span>
                <span>{roomData.category}</span>
                <span>•</span>
                <span>Hosted by {roomData.host_name}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground font-semibold">
            <div className="flex items-center gap-1 bg-white/3 border border-white/5 px-2.5 py-1 rounded-full">
              <Users className="h-3.5 w-3.5 text-cyan-500/80" />
              <span>{allParticipants.length + 1} online</span>
            </div>
          </div>
        </header>

        {/* Grids Stage Wrapper */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 max-w-4xl mx-auto w-full flex flex-col justify-start">
          {/* Speaker Grid (Hosts, Mods, Speakers) */}
          <SpeakerGrid
            speakers={speakers}
            isHost={userParticipant.role === "host"}
            localIdentity={guestId}
            onKick={handleHostKick}
            onMute={handleHostMute}
            onDemote={handleHostDemote}
            userRole={userParticipant.role}
            hasHandRaised={hasHandRaised}
            onHandRaiseToggle={handleHandRaiseToggle}
          />

          {/* Separator line */}
          <div className="border-t border-white/5 w-full shrink-0"></div>

          {/* Listener Grid (Listeners) */}
          <ListenerGrid
            listeners={listeners}
            localIdentity={guestId}
            pendingRequestGuestIds={pendingGuestIds}
          />
        </div>

        {/* Stage controls bar (Sticky bottom) */}
        <StageControls
          role={userParticipant.role}
          isMuted={isMuted}
          onMuteToggle={toggleMute}
          hasHandRaised={hasHandRaised}
          onHandRaiseToggle={handleHandRaiseToggle}
          onChatToggle={handleChatToggle}
          unreadChatCount={unreadCount}
          pendingRequestsCount={requests.length}
          onOpenRequests={() => setIsRequestsOpen(true)}
          onLeave={handleLeave}
          onEndRoom={handleEndRoom}
        />
      </div>

      {/* 2. Desktop Sidebar Chat */}
      <div className="hidden md:block">
        {isChatOpen && (
          <ChatPanel
            messages={messages}
            onSendMessage={sendMessage}
          />
        )}
      </div>

      {/* 3. Mobile Slide-Up Drawer Chat */}
      <Drawer open={isChatOpen && typeof window !== "undefined" && window.innerWidth < 768} onOpenChange={setIsChatOpen}>
        <DrawerContent className="glass-panel text-foreground border-white/10 h-[80vh] p-0 flex flex-col overflow-hidden">
          <DrawerTitle className="sr-only">Room Chat</DrawerTitle>
          <DrawerDescription className="sr-only">Send messages and view chat history in the voice room.</DrawerDescription>
          <ChatPanel
            messages={messages}
            onSendMessage={sendMessage}
          />
        </DrawerContent>
      </Drawer>

      {/* 4. Host requests management Modal (Dialog) */}
      <Dialog open={isRequestsOpen} onOpenChange={setIsRequestsOpen}>
        <DialogContent className="glass-panel border-white/10 text-foreground w-[92vw] sm:max-w-sm md:max-w-md lg:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              Raise Hands
            </DialogTitle>
            <DialogDescription className="sr-only">
              Manage speaker requests from listeners raising hands in the room.
            </DialogDescription>
          </DialogHeader>
          {isRequestsOpen && (
            <HandRaisePanel
              requests={requests}
              broadcastRoleChange={broadcastRoleChange}
              onActionComplete={() => {
                fetchRequests();
                // Trigger a small delay and fetch again to catch up
                setTimeout(fetchRequests, 1000);
              }}
            />
          )}
        </DialogContent>
      </Dialog>


    </div>
  );
}

// Parent VoiceStage that sets up LiveKitRoom connection provider wrapper
export function VoiceStage({
  token,
  roomId,
  roomData,
  initialParticipants,
  userParticipant,
}: VoiceStageProps) {
  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  return (
    <LiveKitRoom
      token={token}
      serverUrl={livekitUrl}
      connect={true}
      audio={userParticipant.role !== "listener"} // Auto-join with microphone if speaker/host
      className="h-full w-full bg-background"
    >
      <VoiceStageContent
        roomId={roomId}
        roomData={roomData}
        userParticipant={userParticipant}
      />
      
      {/* LiveKit audio playback element */}
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
