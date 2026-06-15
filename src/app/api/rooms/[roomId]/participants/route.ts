import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { joinRoomSchema } from "@/lib/validators";
import { RoomServiceClient } from "livekit-server-sdk";
import { nanoid } from "nanoid";

const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;

function getRoomServiceClient() {
  if (!livekitUrl || !apiKey || !apiSecret) {
    throw new Error("LiveKit credentials not configured.");
  }
  const httpUrl = livekitUrl.replace(/^ws/, "http");
  return new RoomServiceClient(httpUrl, apiKey, apiSecret);
}

// POST /api/rooms/[roomId]/participants - Join a room
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await context.params;
    const body = await request.json();
    const supabase = getSupabaseServer();

    // Validate request body
    const validation = joinRoomSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || "Invalid join data" },
        { status: 400 }
      );
    }

    const { guest_id, name, emoji } = validation.data;

    // Check if room exists and is active
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

    // Check if participant is already registered in the room
    const { data: existingParticipant } = await supabase
      .from("participants")
      .select("*")
      .eq("room_id", roomId)
      .eq("guest_id", guest_id)
      .maybeSingle();

    if (existingParticipant) {
      return NextResponse.json(existingParticipant, { status: 200 });
    }

    // Assign role: host if guest_id matches room.host_id, else listener
    const role = room.host_id === guest_id ? "host" : "listener";

    const newParticipant = {
      id: `part_${nanoid(12)}`,
      room_id: roomId,
      guest_id,
      name,
      emoji,
      role,
    };

    const { error: insertError } = await supabase
      .from("participants")
      .insert(newParticipant);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json(newParticipant, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}

// PATCH /api/rooms/[roomId]/participants - Update participant role (Host/Mod only)
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await context.params;
    const guestId = request.headers.get("x-guest-id");
    const body = await request.json();

    const { targetGuestId, role } = body;

    if (!guestId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!targetGuestId || !role) {
      return NextResponse.json({ error: "Missing parameters targetGuestId or role" }, { status: 400 });
    }

    if (!["moderator", "speaker", "listener"].includes(role)) {
      return NextResponse.json({ error: "Invalid role specified" }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    // Verify room host
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("host_id")
      .eq("id", roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Requester must be host to change roles
    if (room.host_id !== guestId) {
      return NextResponse.json({ error: "Forbidden: Only the room host can update roles" }, { status: 403 });
    }

    // Get target participant details to retrieve emoji
    const { data: targetPart } = await supabase
      .from("participants")
      .select("emoji")
      .eq("room_id", roomId)
      .eq("guest_id", targetGuestId)
      .maybeSingle();

    const targetEmoji = targetPart?.emoji || "🦁";

    // Update role in database
    const { error: updateError } = await supabase
      .from("participants")
      .update({ role })
      .eq("room_id", roomId)
      .eq("guest_id", targetGuestId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Update LiveKit permissions
    try {
      const roomServiceClient = getRoomServiceClient();
      const canPublish = role === "moderator" || role === "speaker";
      
      await roomServiceClient.updateParticipant(roomId, targetGuestId, {
        permission: {
          canPublish,
          canSubscribe: true,
          canPublishData: true,
        },
        metadata: JSON.stringify({ emoji: targetEmoji, role }),
      });
    } catch (lkError: any) {
      console.error("Failed to update LiveKit permissions on PATCH:", lkError);
    }

    return NextResponse.json({ success: true, targetGuestId, role });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}

// DELETE /api/rooms/[roomId]/participants - Leave a room OR kick a participant (if requested by host)
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await context.params;
    const guestId = request.headers.get("x-guest-id") || request.nextUrl.searchParams.get("guestId");
    const targetGuestId = request.nextUrl.searchParams.get("targetGuestId");

    if (!guestId) {
      return NextResponse.json({ error: "Missing guest identification" }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    // Verify room details
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("host_id")
      .eq("id", roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Determine target (either leaving oneself, or kicking someone else)
    const finalTargetGuestId = targetGuestId || guestId;
    const isKick = targetGuestId && targetGuestId !== guestId;

    if (isKick) {
      // Only host can kick
      if (room.host_id !== guestId) {
        return NextResponse.json({ error: "Forbidden: Only the room host can kick participants" }, { status: 403 });
      }
    }

    // Remove from database
    const { error: deleteError } = await supabase
      .from("participants")
      .delete()
      .eq("room_id", roomId)
      .eq("guest_id", finalTargetGuestId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Delete any pending requests
    await supabase
      .from("speaker_requests")
      .delete()
      .eq("room_id", roomId)
      .eq("guest_id", finalTargetGuestId);

    // Disconnect from LiveKit if it's a kick or if we want to ensure clean cleanup
    try {
      const roomServiceClient = getRoomServiceClient();
      await roomServiceClient.removeParticipant(roomId, finalTargetGuestId);
    } catch (lkError: any) {
      // Ignore if user already disconnected or if credentials are missing
      console.warn("Failed to remove participant from LiveKit:", lkError.message);
    }

    // Self-cleaning check: if no participants left, close the room
    const { data: remaining } = await supabase
      .from("participants")
      .select("id")
      .eq("room_id", roomId);

    if (!remaining || remaining.length === 0) {
      await supabase
        .from("rooms")
        .update({ is_active: false })
        .eq("id", roomId);
    }

    return NextResponse.json({ success: true, message: isKick ? "Participant kicked" : "Left room successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}
