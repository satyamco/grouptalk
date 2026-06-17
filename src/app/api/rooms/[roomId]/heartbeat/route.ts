import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { RoomServiceClient } from "livekit-server-sdk";

const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;

function getRoomServiceClient() {
  if (!livekitUrl || !apiKey || !apiSecret) {
    return null;
  }
  const httpUrl = livekitUrl.replace(/^ws/, "http");
  return new RoomServiceClient(httpUrl, apiKey, apiSecret);
}

// POST /api/rooms/[roomId]/heartbeat - Send user heartbeat and run inactivity auto-closer check
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

    // 2. Self-cleaning check: Find and close inactive rooms where host has left
    // Thresholds: Host left > 2 mins, No activity > 20 mins
    const hostLeftThreshold = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const inactivityThreshold = new Date(Date.now() - 20 * 60 * 1000).toISOString();

    const { data: inactiveRooms, error: findError } = await supabase
      .from("rooms")
      .select("id")
      .eq("is_active", true)
      .lt("host_last_seen_at", hostLeftThreshold)
      .lt("last_activity_at", inactivityThreshold);

    if (findError) {
      console.error("Failed to query inactive rooms:", findError);
    } else if (inactiveRooms && inactiveRooms.length > 0) {
      const roomIdsToClose = inactiveRooms.map((r) => r.id);
      console.log("Auto-closing inactive rooms due to host leaving and inactivity:", roomIdsToClose);

      // Deactivate rooms in DB
      const { error: deactivateError } = await supabase
        .from("rooms")
        .update({ is_active: false })
        .in("id", roomIdsToClose);

      if (!deactivateError) {
        // Clean up participants & requests for closed rooms
        await supabase.from("participants").delete().in("room_id", roomIdsToClose);
        await supabase.from("speaker_requests").delete().in("room_id", roomIdsToClose);

        // Delete LiveKit sessions for these rooms
        const lkClient = getRoomServiceClient();
        if (lkClient) {
          for (const closedRoomId of roomIdsToClose) {
            try {
              await lkClient.deleteRoom(closedRoomId);
            } catch (lkErr) {
              console.warn(`Failed to delete LiveKit room ${closedRoomId}:`, lkErr);
            }
          }
        }
      } else {
        console.error("Failed to deactivate inactive rooms:", deactivateError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Heartbeat processing error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}
