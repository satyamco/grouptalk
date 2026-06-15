import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { generateLiveKitToken } from "@/lib/livekit/server";
import { tokenRequestSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validation = tokenRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || "Invalid token request payload" },
        { status: 400 }
      );
    }

    const { roomId, guestId, name, emoji } = validation.data;
    const supabase = getSupabaseServer();

    // Verify room is active
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("is_active")
      .eq("id", roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (!room.is_active) {
      return NextResponse.json({ error: "Room is no longer active" }, { status: 410 });
    }

    // Query participant's current role in the room
    const { data: participant, error: partError } = await supabase
      .from("participants")
      .select("role")
      .eq("room_id", roomId)
      .eq("guest_id", guestId)
      .maybeSingle();

    // Default to listener if not registered in the participants list yet
    const role = participant ? (participant.role as any) : "listener";

    // Generate JWT token
    const token = await generateLiveKitToken(roomId, guestId, name, emoji, role);

    return NextResponse.json({ token });
  } catch (error: any) {
    console.error("Token generation error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}
