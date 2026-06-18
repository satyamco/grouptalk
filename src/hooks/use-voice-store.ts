"use client";

import { create } from "zustand";
import { Room, Participant } from "@/types";
import { getGuestId } from "./use-guest-id";

interface VoiceState {
  activeRoomId: string | null;
  activeRoomData: Room | null;
  userParticipant: Participant | null;
  token: string | null;
  isMinimized: boolean;
  
  joinRoom: (roomId: string, roomData: Room, userParticipant: Participant, token: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  setMinimized: (minimized: boolean) => void;
  updateUserParticipant: (participant: Participant) => void;
  updateRoomData: (roomData: Room) => void;
}

export const useVoiceStore = create<VoiceState>((set, get) => ({
  activeRoomId: null,
  activeRoomData: null,
  userParticipant: null,
  token: null,
  isMinimized: false,

  joinRoom: async (roomId: string, roomData: Room, userParticipant: Participant, token: string) => {
    const { activeRoomId, leaveRoom } = get();
    
    // Automatically leave current room if joining a new one
    if (activeRoomId && activeRoomId !== roomId) {
      await leaveRoom();
    }

    set({
      activeRoomId: roomId,
      activeRoomData: roomData,
      userParticipant,
      token,
      isMinimized: false,
    });
  },

  leaveRoom: async () => {
    const { activeRoomId } = get();
    if (!activeRoomId) return;

    const guestId = getGuestId();

    // Reset state immediately for smooth UI transition
    set({
      activeRoomId: null,
      activeRoomData: null,
      userParticipant: null,
      token: null,
      isMinimized: false,
    });

    try {
      // Remove from participant list in DB
      await fetch(`/api/rooms/${activeRoomId}/participants`, {
        method: "DELETE",
        headers: {
          "x-guest-id": guestId,
        },
      });
    } catch (error) {
      console.error("Failed to delete participant from DB on room leave:", error);
    }
  },

  setMinimized: (isMinimized: boolean) => set({ isMinimized }),

  updateUserParticipant: (userParticipant: Participant) => set({ userParticipant }),

  updateRoomData: (activeRoomData: Room) => set({ activeRoomData }),
}));
