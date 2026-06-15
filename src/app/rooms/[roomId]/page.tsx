"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/hooks/use-profile";
import { getGuestId } from "@/hooks/use-guest-id";
import dynamic from "next/dynamic";

import type { VoiceStageProps } from "@/components/stage/voice-stage";

const VoiceStage = dynamic<VoiceStageProps>(
  () => import("@/components/stage/voice-stage").then((mod) => mod.VoiceStage),
  { ssr: false }
);
import { Room, Participant } from "@/types";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RoomPageProps {
  params: Promise<{ roomId: string }>;
}

export default function RoomPage({ params }: RoomPageProps) {
  const router = useRouter();
  const { roomId } = use(params);
  
  const { profile, isLoaded: profileLoaded } = useProfile();
  
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [userParticipant, setUserParticipant] = useState<Participant | null>(null);
  const [token, setToken] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Core initialization flow
  useEffect(() => {
    if (!profileLoaded) return;

    // Enforce profile setup gate
    if (!profile) {
      router.replace(`/onboarding?redirect=/rooms/${roomId}`);
      return;
    }

    const guestId = getGuestId();

    const initializeRoom = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Fetch Room Details (metadata + current participants)
        const roomRes = await fetch(`/api/rooms/${roomId}`);
        if (!roomRes.ok) {
          const errData = await roomRes.json();
          throw new Error(errData.error || "Room not found");
        }
        
        const { room: roomData, participants: parts } = await roomRes.json();
        setRoom(roomData);
        setParticipants(parts);

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
        setUserParticipant(selfParticipant);

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
        setToken(jwtToken);

      } catch (err: any) {
        console.error("Initialization error:", err);
        setError(err.message || "Failed to join room");
      } finally {
        setLoading(false);
      }
    };

    initializeRoom();
  }, [profileLoaded, profile, roomId, router]);

  // Handle cleanup on leave/unload
  useEffect(() => {
    return () => {
      // Only delete non-hosts on unmount to prevent page refresh deactivation of rooms
      if (profile && room && userParticipant && userParticipant.role !== "host") {
        const guestId = getGuestId();
        navigator.sendBeacon(
          `/api/rooms/${roomId}/participants?guestId=${guestId}`,
          ""
        );
      }
    };
  }, [profile, room, roomId, userParticipant]);

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

  if (error || !room || !userParticipant || !token) {
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
      roomData={room}
      initialParticipants={participants}
      userParticipant={userParticipant}
    />
  );
}
