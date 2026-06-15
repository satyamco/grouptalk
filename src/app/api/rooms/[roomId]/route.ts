import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { RoomServiceClient } from "livekit-server-sdk";

const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;

// GET /api/rooms/[roomId] - Fetch details of a single room, including current participants
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await context.params;
    const supabase = getSupabaseServer();

    // Fetch room metadata
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (!room.is_active) {
      return NextResponse.json({ error: "Room is no longer active" }, { status: 410 });
    }

    // Fetch active participants in the room
    const { data: participants, error: partError } = await supabase
      .from("participants")
      .select("*")
      .eq("room_id", roomId)
      .order("joined_at", { ascending: true });

    if (partError) {
      return NextResponse.json({ error: partError.message }, { status: 500 });
    }

    return NextResponse.json({
      room,
      participants: participants || [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}

// DELETE /api/rooms/[roomId] - End a room (deactivate it). Requires verification that sender is the host.
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await context.params;
    const guestId = request.headers.get("x-guest-id");

    if (!guestId) {
      return NextResponse.json({ error: "Unauthorized: Missing guest identification" }, { status: 401 });
    }

    const supabase = getSupabaseServer();

    // Verify room exists and the requester is the host
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("host_id")
      .eq("id", roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.host_id !== guestId) {
      return NextResponse.json({ error: "Forbidden: Only the room host can end the room" }, { status: 403 });
    }

    // Mark room inactive
    const { error: updateError } = await supabase
      .from("rooms")
      .update({ is_active: false })
      .eq("id", roomId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Remove all participants from this room
    await supabase.from("participants").delete().eq("room_id", roomId);
    // Remove all pending speaker requests for this room
    await supabase.from("speaker_requests").delete().eq("room_id", roomId);

    // Delete LiveKit Room Session
    try {
      if (livekitUrl && apiKey && apiSecret) {
        const httpUrl = livekitUrl.replace(/^ws/, "http");
        const roomServiceClient = new RoomServiceClient(httpUrl, apiKey, apiSecret);
        await roomServiceClient.deleteRoom(roomId);
      }
    } catch (lkErr) {
      console.error("Failed to delete LiveKit room session:", lkErr);
    }

    return NextResponse.json({ success: true, message: "Room ended successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}
