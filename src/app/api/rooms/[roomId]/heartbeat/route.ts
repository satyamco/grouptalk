import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { syncRoomParticipants, cleanupInactiveRooms } from "@/lib/room-cleanup";

// POST /api/rooms/[roomId]/heartbeat - Send user heartbeat and run inactivity auto-closer check
// NOTE: This endpoint is currently NOT called from the client to reduce server costs,
// but remains available for manual triggering or future background sync logic.
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await context.params;
    const body = await request.json();
    const { guestId, role, isSpeaking } = body;

    if (!guestId || !role) {
      return NextResponse.json({ error: "Missing heartbeat parameters" }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    // 1. Update presence / activity for this room
    if (role === "host") {
      // Host is present, so update both host_last_seen_at and last_activity_at
      await supabase
        .from("rooms")
        .update({
          host_last_seen_at: new Date().toISOString(),
          last_activity_at: new Date().toISOString(),
        })
        .eq("id", roomId);
    } else if (isSpeaking) {
      // Non-host speaker is speaking, update room activity time
      await supabase
        .from("rooms")
        .update({
          last_activity_at: new Date().toISOString(),
        })
        .eq("id", roomId);
    }

    // 2. Synchronize participant presence with LiveKit in the background (non-blocking)
    syncRoomParticipants(roomId).catch((err) => {
      console.warn("Async participant sync warning:", err);
    });

    // 3. Global self-cleaning check: Find and close empty or inactive rooms in the background (non-blocking)
    cleanupInactiveRooms().catch((err) => {
      console.warn("Async room cleanup warning:", err);
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Heartbeat processing error:", error);
    const errorMessage = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
