"use client";

import { useLocalParticipant, useRoomContext, useParticipants } from "@livekit/components-react";
import { useCallback } from "react";

/**
 * Custom hook wrapping LiveKit hooks to manage voice state.
 * Must be used inside a <LiveKitRoom> context.
 */
export function useVoice() {
  const room = useRoomContext();
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const allParticipants = useParticipants();

  // Toggle local mute state
  const toggleMute = useCallback(async () => {
    if (!localParticipant) return;
    
    try {
      const current = isMicrophoneEnabled;
      await localParticipant.setMicrophoneEnabled(!current);
    } catch (error) {
      console.error("Failed to toggle microphone:", error);
    }
  }, [localParticipant, isMicrophoneEnabled]);

  // Force mute (disable mic)
  const setMute = useCallback(async (enabled: boolean) => {
    if (!localParticipant) return;
    try {
      await localParticipant.setMicrophoneEnabled(!enabled);
    } catch (error) {
      console.error("Failed to set microphone state:", error);
    }
  }, [localParticipant]);

  // Disconnect from the room
  const leaveRoom = useCallback(async () => {
    if (room) {
      await room.disconnect();
    }
  }, [room]);

  return {
    room,
    localParticipant,
    isMuted: !isMicrophoneEnabled,
    toggleMute,
    setMute,
    leaveRoom,
    allParticipants,
    connectionState: room?.state || "disconnected",
  };
}
