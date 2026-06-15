import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { createRoomSchema } from "@/lib/validators";
import { nanoid } from "nanoid";

// GET /api/rooms - List all active rooms with participant counts
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServer();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    let query = supabase
      .from("rooms")
      .select(`
        *,
        participants (
          role
        )
      `)
      .eq("is_active", true);

    if (category && category !== "all" && category !== "All") {
      query = query.eq("category", category);
    }

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    const { data: rooms, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Map participant roles to speaker/listener counts
    const roomsWithCounts = (rooms || []).map((room: any) => {
      const participants = room.participants || [];
      const speakerCount = participants.filter(
        (p: any) => p.role === "host" || p.role === "moderator" || p.role === "speaker"
      ).length;
      const listenerCount = participants.filter((p: any) => p.role === "listener").length;

      // Clean up nested participants array to prevent payload bloating
      const { participants: _, ...roomData } = room;

      return {
        ...roomData,
        speaker_count: speakerCount,
        listener_count: listenerCount,
        participant_count: participants.length,
      };
    });

    return NextResponse.json(roomsWithCounts);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}

// POST /api/rooms - Create a new room
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServer();
    const body = await request.json();
    
    // Validate room properties
    const roomValidation = createRoomSchema.safeParse(body);
    if (!roomValidation.success) {
      return NextResponse.json(
        { error: roomValidation.error.issues[0]?.message || "Invalid room data" },
        { status: 400 }
      );
    }

    // Extract host profile information
    const { host } = body;
    if (!host || !host.guestId || !host.name || !host.emoji) {
      return NextResponse.json(
        { error: "Host profile identity (guestId, name, emoji) is required" },
        { status: 400 }
      );
    }

    const roomId = `room_${nanoid(10)}`;
    const newRoom = {
      id: roomId,
      name: roomValidation.data.name,
      description: roomValidation.data.description || null,
      category: roomValidation.data.category,
      is_private: roomValidation.data.is_private,
      host_id: host.guestId,
      host_name: host.name,
      host_emoji: host.emoji,
      is_active: true,
    };

    // Insert room
    const { error: roomError } = await supabase.from("rooms").insert(newRoom);
    if (roomError) {
      return NextResponse.json({ error: roomError.message }, { status: 500 });
    }

    // Auto-insert host as primary participant
    const hostParticipant = {
      id: `part_${nanoid(12)}`,
      room_id: roomId,
      guest_id: host.guestId,
      name: host.name,
      emoji: host.emoji,
      role: "host",
    };

    const { error: partError } = await supabase.from("participants").insert(hostParticipant);
    if (partError) {
      // Rollback room creation if participant insert fails
      await supabase.from("rooms").delete().eq("id", roomId);
      return NextResponse.json({ error: partError.message }, { status: 500 });
    }

    return NextResponse.json(newRoom, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}
