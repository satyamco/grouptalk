"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/hooks/use-profile";
import { getGuestId } from "@/hooks/use-guest-id";
import { useVoiceStore } from "@/hooks/use-voice-store";
import dynamic from "next/dynamic";

import type { VoiceStageProps } from "@/components/stage/voice-stage";

const VoiceStage = dynamic<VoiceStageProps>(
  () => import("@/components/stage/voice-stage").then((mod) => mod.VoiceStage),
  { ssr: false }
);
import { Participant } from "@/types";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RoomPageProps {
  params: Promise<{ roomId: string }>;
}

export default function RoomPage({ params }: RoomPageProps) {
  const router = useRouter();
  const { roomId } = use(params);
  
  const { profile, isLoaded: profileLoaded } = useProfile();
  const {
    activeRoomId,
    activeRoomData,
    userParticipant,
    token,
    joinRoom,
    setMinimized,
  } = useVoiceStore();
  
  const alreadyInRoom = activeRoomId === roomId && !!token;
  const [loading, setLoading] = useState(!alreadyInRoom);
  const [error, setError] = useState<string | null>(null);

  // Core initialization flow
  useEffect(() => {
    if (!profileLoaded) return;

    // Enforce profile setup gate
    if (!profile) {
      router.replace(`/onboarding?redirect=/rooms/${roomId}`);
      return;
    }

    // If we are already in this room, just maximize it!
    if (activeRoomId === roomId && token) {
      setMinimized(false);
      return;
    }

    const guestId = getGuestId();

    const initializeRoom = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Fetch Room Details (metadata + current participants)
        const roomRes = await fetch(`/api/rooms/${roomId}`);
        const roomJson = await roomRes.json();
        if (!roomRes.ok) {
          throw new Error(roomJson.error || "Room not found");
        }
        
        const roomData = roomJson.room;

        // 2. Register Participant (Join Room in Database)
        const joinRes = await fetch(`/api/rooms/${roomId}/participants`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            guest_id: guestId,
            name: profile.name,
            emoji: profile.emoji,
          }),
        });

        if (!joinRes.ok) {
          const errData = await joinRes.json();
          throw new Error(errData.error || "Failed to join room");
        }

        const selfParticipant: Participant = await joinRes.json();

        // 3. Fetch LiveKit Token
        const tokenRes = await fetch("/api/livekit/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            roomId,
            guestId,
            name: profile.name,
            emoji: profile.emoji,
          }),
        });

        if (!tokenRes.ok) {
          const errData = await tokenRes.json();
          throw new Error(errData.error || "Failed to generate voice token");
        }

        const { token: jwtToken } = await tokenRes.json();

        // 4. Save to global Zustand store
        await joinRoom(roomId, roomData, selfParticipant, jwtToken);

      } catch (err: unknown) {
        console.error("Initialization error:", err);
        const errMessage = err instanceof Error ? err.message : "Failed to join room";
        setError(errMessage);
      } finally {
        setLoading(false);
      }
    };

    initializeRoom();
  }, [profileLoaded, profile, roomId, router, activeRoomId, token, joinRoom, setMinimized]);

  if (!profileLoaded || loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="text-sm text-muted-foreground uppercase tracking-widest animate-pulse">
          Connecting to room stage...
        </p>
      </div>
    );
  }

  if (error || activeRoomId !== roomId || !activeRoomData || !userParticipant || !token) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center space-y-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400">
          <AlertCircle className="h-8 w-8" />
        </div>
        <div className="space-y-2 max-w-sm">
          <h2 className="text-xl font-bold text-foreground">Failed to Join Room</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {error || "An unexpected error occurred while connecting."}
          </p>
        </div>
        <Button
          onClick={() => router.push("/rooms")}
          className="bg-primary/20 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/30 hover:border-transparent rounded-xl font-bold px-6 h-10 active-bounce"
        >
          Back to Discovery
        </Button>
      </div>
    );
  }

  return (
    <VoiceStage
      token={token}
      roomId={roomId}
      roomData={activeRoomData}
      initialParticipants={[]}
      userParticipant={userParticipant}
    />
  );
}
