"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useDataChannel, useLocalParticipant } from "@livekit/components-react";
import { ChatMessage, DataChannelEvent } from "@/types";
import { nanoid } from "nanoid";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

interface UseChatProps {
  senderName: string;
  senderEmoji: string;
  onRoleChanged?: (guestId: string, newRole: string) => void;
  onParticipantRemoved?: (guestId: string) => void;
  onRequestsChanged?: () => void;
  onHandRaiseReceived?: (guestId: string, name: string, emoji: string) => void;
  onRoomEnded?: (hostName: string) => void;
  onCapacityUpdated?: (maxSeats: number) => void;
}

export function useChat({
  senderName,
  senderEmoji,
  onRoleChanged,
  onParticipantRemoved,
  onRequestsChanged,
  onHandRaiseReceived,
  onRoomEnded,
  onCapacityUpdated,
}: UseChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const { localParticipant } = useLocalParticipant();
  
  // Track processed messages to prevent infinite render loops when callbacks change
  const lastProcessedMessageRef = useRef<any>(null);
  
  // Keep refs for callbacks so we don't trigger effect re-runs
  const callbacks = useRef({
    onRoleChanged,
    onParticipantRemoved,
    onRequestsChanged,
    onHandRaiseReceived,
    onRoomEnded,
    onCapacityUpdated,
  });
  callbacks.current = {
    onRoleChanged,
    onParticipantRemoved,
    onRequestsChanged,
    onHandRaiseReceived,
    onRoomEnded,
    onCapacityUpdated,
  };

  // Initialize data channel
  const { send, message: lastReceivedMessage } = useDataChannel("voxroom-events");

  // Handle incoming data channel messages
  useEffect(() => {
    if (!lastReceivedMessage) return;
    
    // Prevent duplicate processing of the same message
    if (lastReceivedMessage === lastProcessedMessageRef.current) return;
    lastProcessedMessageRef.current = lastReceivedMessage;

    try {
      const payloadString = decoder.decode(lastReceivedMessage.payload);
      const event: DataChannelEvent = JSON.parse(payloadString);
      const cb = callbacks.current;

      switch (event.type) {
        case "chat":
          setMessages((prev) => [...prev, event.data]);
          break;

        case "role-change":
          if (cb.onRoleChanged) {
            cb.onRoleChanged(event.data.guestId, event.data.newRole);
          }
          break;

        case "participant-removed":
          if (cb.onParticipantRemoved) {
            cb.onParticipantRemoved(event.data.guestId);
          }
          break;

        case "hand-raise":
          if (cb.onRequestsChanged) {
            cb.onRequestsChanged();
          }
          if (cb.onHandRaiseReceived && event.data.name) {
            cb.onHandRaiseReceived(event.data.guestId, event.data.name, event.data.emoji);
          }
          break;

        case "room-ended":
          if (cb.onRoomEnded) {
            cb.onRoomEnded(event.data.hostName);
          }
          break;

        case "capacity-updated":
          if (cb.onCapacityUpdated) {
            cb.onCapacityUpdated(event.data.maxSeats);
          }
          break;

        default:
          break;
      }
    } catch (error) {
      console.error("Failed to parse data channel message:", error);
    }
  }, [lastReceivedMessage]);

  // Send a text message
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || !send) return;

      const chatMsg: ChatMessage = {
        id: `msg_${nanoid(12)}`,
        senderName,
        senderEmoji,
        message: text.trim(),
        createdAt: Date.now(),
      };

      const event: DataChannelEvent = {
        type: "chat",
        data: chatMsg,
      };

      const payload = encoder.encode(JSON.stringify(event));
      
      try {
        await send(payload, { reliable: true });
        // Add to local state immediately for the sender
        setMessages((prev) => [...prev, chatMsg]);
      } catch (error) {
        console.error("Failed to send chat message:", error);
      }
    },
    [send, senderName, senderEmoji]
  );



  // Broadcast role change (used by host)
  const broadcastRoleChange = useCallback(
    async (guestId: string, newRole: any) => {
      if (!send) return;

      const event: DataChannelEvent = {
        type: "role-change",
        data: {
          guestId,
          newRole,
        },
      };

      const payload = encoder.encode(JSON.stringify(event));

      try {
        await send(payload, { reliable: true });
      } catch (error) {
        console.error("Failed to broadcast role change:", error);
      }
    },
    [send]
  );

  // Broadcast participant removal (kick, used by host)
  const broadcastParticipantRemoved = useCallback(
    async (guestId: string) => {
      if (!send) return;

      const event: DataChannelEvent = {
        type: "participant-removed",
        data: {
          guestId,
        },
      };

      const payload = encoder.encode(JSON.stringify(event));

      try {
        await send(payload, { reliable: true });
      } catch (error) {
        console.error("Failed to broadcast participant removal:", error);
      }
    },
    [send]
  );

  // Broadcast hand raise (used by listener)
  const broadcastHandRaise = useCallback(
    async (guestId: string, name: string, emoji: string) => {
      if (!send) return;

      const event: DataChannelEvent = {
        type: "hand-raise",
        data: {
          guestId,
          name,
          emoji,
        },
      };

      const payload = encoder.encode(JSON.stringify(event));

      try {
        await send(payload, { reliable: true });
      } catch (error) {
        console.error("Failed to broadcast hand raise:", error);
      }
    },
    [send]
  );

  // Broadcast room ended (used by host)
  const broadcastRoomEnded = useCallback(
    async (hostName: string) => {
      if (!send) return;

      const event: DataChannelEvent = {
        type: "room-ended",
        data: {
          hostName,
        },
      };

      const payload = encoder.encode(JSON.stringify(event));

      try {
        await send(payload, { reliable: true });
      } catch (error) {
        console.error("Failed to broadcast room ended:", error);
      }
    },
    [send]
  );

  // Broadcast capacity change (used by host)
  const broadcastCapacityChange = useCallback(
    async (maxSeats: number) => {
      if (!send) return;

      const event: DataChannelEvent = {
        type: "capacity-updated",
        data: {
          maxSeats,
        },
      };

      const payload = encoder.encode(JSON.stringify(event));

      try {
        await send(payload, { reliable: true });
      } catch (error) {
        console.error("Failed to broadcast capacity change:", error);
      }
    },
    [send]
  );

  return {
    messages,
    sendMessage,
    broadcastRoleChange,
    broadcastParticipantRemoved,
    broadcastHandRaise,
    broadcastRoomEnded,
    broadcastCapacityChange,
  };
}
