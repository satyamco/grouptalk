import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { raiseHandSchema, handleRequestSchema } from "@/lib/validators";
import { RoomServiceClient } from "livekit-server-sdk";
import { nanoid } from "nanoid";

const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;

// Helper to get LiveKit RoomServiceClient
function getRoomServiceClient() {
  if (!livekitUrl || !apiKey || !apiSecret) {
    throw new Error("LiveKit credentials not configured.");
  }
  // Convert ws/wss to http/https for RoomServiceClient
  const httpUrl = livekitUrl.replace(/^ws/, "http");
  return new RoomServiceClient(httpUrl, apiKey, apiSecret);
}

// POST /api/speaker-requests - Raise hand (request speaker access)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request
    const validation = raiseHandSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || "Invalid payload" },
        { status: 400 }
      );
    }

    const { room_id, guest_id, name, emoji } = validation.data;
    const supabase = getSupabaseServer();

    // Check if a pending request already exists
    const { data: existing } = await supabase
      .from("speaker_requests")
      .select("id")
      .eq("room_id", room_id)
      .eq("guest_id", guest_id)
      .eq("status", "pending")
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: true, message: "Hand already raised" });
    }

    // Insert speaker request
    const newRequest = {
      id: `req_${nanoid(12)}`,
      room_id,
      guest_id,
      name,
      emoji,
      status: "pending",
    };

    const { error: insertError } = await supabase
      .from("speaker_requests")
      .insert(newRequest);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json(newRequest, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// PATCH /api/speaker-requests - Approve or Reject a raise-hand request (Host/Mod only)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const guestId = request.headers.get("x-guest-id");

    if (!guestId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate request
    const validation = handleRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || "Invalid payload" },
        { status: 400 }
      );
    }

    const { request_id, room_id: bodyRoomId, guest_id: bodyGuestId, status } = validation.data;
    const supabase = getSupabaseServer();

    // 1. Fetch the request details
    let dbQuery = supabase.from("speaker_requests").select("*");
    if (request_id) {
      dbQuery = dbQuery.eq("id", request_id);
    } else if (bodyRoomId && bodyGuestId) {
      dbQuery = dbQuery.eq("room_id", bodyRoomId).eq("guest_id", bodyGuestId).eq("status", "pending");
    } else {
      return NextResponse.json({ error: "Missing lookup identifier (request_id or room_id+guest_id)" }, { status: 400 });
    }

    const { data: speakerRequest, error: fetchReqError } = await dbQuery.maybeSingle();

    if (fetchReqError || !speakerRequest) {
      return NextResponse.json({ error: "Speaker request not found" }, { status: 404 });
    }

    const { id: dbRequestId, room_id, guest_id: requesterGuestId, emoji } = speakerRequest;

    // 2. Verify that the user handling this is the room host or moderator
    let room: { host_id: string; max_seats?: number | null } | null = null;
    let hasRoomError = false;

    const queryResult = await supabase
      .from("rooms")
      .select("host_id, max_seats")
      .eq("id", room_id)
      .single();

    // Gracefully fall back if the max_seats column does not exist in the database (error codes 42703/PGRST204)
    if (queryResult.error && (queryResult.error.code === "42703" || queryResult.error.code === "PGRST204")) {
      const fallbackQuery = await supabase
        .from("rooms")
        .select("host_id")
        .eq("id", room_id)
        .single();
      room = fallbackQuery.data;
      hasRoomError = !!fallbackQuery.error;
    } else {
      room = queryResult.data;
      hasRoomError = !!queryResult.error;
    }

    if (hasRoomError || !room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const { data: handlerParticipant } = await supabase
      .from("participants")
      .select("role")
      .eq("room_id", room_id)
      .eq("guest_id", guestId)
      .maybeSingle();

    const isAuthorized = 
      room.host_id === guestId || 
      (handlerParticipant && (handlerParticipant.role === "host" || handlerParticipant.role === "moderator"));

    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden: Unauthorized to handle speaker requests" }, { status: 403 });
    }

    // 3. Update the request status
    const { error: updateReqError } = await supabase
      .from("speaker_requests")
      .update({ status })
      .eq("id", dbRequestId);

    if (updateReqError) {
      return NextResponse.json({ error: updateReqError.message }, { status: 500 });
    }

    if (status === "approved") {
      // Check if room has reached its speaker capacity
      const { roomCapacityMap } = await import("@/lib/room-cleanup");
      const memCapacity = roomCapacityMap.get(room_id);
      const maxSeats = memCapacity !== undefined ? memCapacity : (room.max_seats || 8);

      const { data: speakers, error: speakersError } = await supabase
        .from("participants")
        .select("id")
        .eq("room_id", room_id)
        .in("role", ["host", "moderator", "speaker"]);

      if (speakersError) {
        return NextResponse.json({ error: speakersError.message }, { status: 500 });
      }

      const currentSpeakersCount = speakers?.length || 0;
      if (currentSpeakersCount >= maxSeats) {
        return NextResponse.json(
          { error: `The room has reached its maximum speaker capacity of ${maxSeats} seats. Please extend the capacity to allow more speakers.` },
          { status: 400 }
        );
      }

      // 4. Update the participant's role in the DB to "speaker"
      const { error: updatePartError } = await supabase
        .from("participants")
        .update({ role: "speaker" })
        .eq("room_id", room_id)
        .eq("guest_id", requesterGuestId);

      if (updatePartError) {
        return NextResponse.json({ error: updatePartError.message }, { status: 500 });
      }

      // 5. Update LiveKit permissions using RoomServiceClient to enable canPublish: true
      try {
        const roomServiceClient = getRoomServiceClient();
        await roomServiceClient.updateParticipant(room_id, requesterGuestId, {
          permission: {
            canPublish: true,
            canSubscribe: true,
            canPublishData: true,
          },
          metadata: JSON.stringify({ emoji, role: "speaker" }), // Sync metadata role
        });
      } catch (lkError: unknown) {
        console.error("Failed to update LiveKit participant permissions:", lkError);
        // Note: We don't fail the whole request because DB is in-sync and user can rejoin with new role, but logging is good
      }
    }

    // If rejected, we simply leave it in DB as rejected or we delete it. Let's delete it so it clears out.
    if (status === "rejected") {
      await supabase.from("speaker_requests").delete().eq("id", dbRequestId);
    } else {
      // Approved requests can also be deleted from the list to clean it up
      await supabase.from("speaker_requests").delete().eq("id", dbRequestId);
    }

    return NextResponse.json({ success: true, status });
  } catch (error: unknown) {
    console.error("Speaker request handle error:", error);
    const errorMessage = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
