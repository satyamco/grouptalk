"use client";

import * as React from "react";
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import { useVoiceStore } from "@/hooks/use-voice-store";
import { MinimizedPlayer } from "@/components/stage/minimized-player";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const { token, activeRoomId, userParticipant, isMinimized } = useVoiceStore();
  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  const showLiveKitRoom = token && activeRoomId && userParticipant;

  return (
    <>
      {showLiveKitRoom ? (
        <LiveKitRoom
          token={token}
          serverUrl={livekitUrl}
          connect={true}
          audio={userParticipant.role !== "listener"}
          className="h-full w-full bg-background"
        >
          {children}
          <RoomAudioRenderer />
          {isMinimized && <MinimizedPlayer />}
        </LiveKitRoom>
      ) : (
        children
      )}
    </>
  );
}
