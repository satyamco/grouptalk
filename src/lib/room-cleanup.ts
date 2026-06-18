import { getSupabaseServer } from "@/lib/supabase/server";
import { RoomServiceClient } from "livekit-server-sdk";

const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;

let cachedRoomServiceClient: RoomServiceClient | null = null;

export function getRoomServiceClient() {
  if (cachedRoomServiceClient) return cachedRoomServiceClient;
  
  if (!livekitUrl || !apiKey || !apiSecret) {
    return null;
  }
  const httpUrl = livekitUrl.replace(/^ws/, "http");
  cachedRoomServiceClient = new RoomServiceClient(httpUrl, apiKey, apiSecret);
  return cachedRoomServiceClient;
}

const lastSyncTimeMap = new Map<string, number>();
let lastGlobalCleanupTime = 0;

// In-memory tracker for participant last-seen times in LiveKit to allow reconnection grace periods
const participantLastSeenInLiveKitMap = new Map<string, number>();

// In-memory tracker for room speaker capacities when DB columns are missing
export const roomCapacityMap = new Map<string, number>();

/**
 * Synchronize the database participant list for a specific room with LiveKit's active participant list.
 * Any registered database participant who is no longer active in LiveKit will be removed.
 */
export async function syncRoomParticipants(roomId: string, force = false) {
  const now = Date.now();
  const lastSync = lastSyncTimeMap.get(roomId) || 0;
  if (!force && now - lastSync < 90000) {
    return; // Rate limit: at most once every 90 seconds per room
  }
  lastSyncTimeMap.set(roomId, now);

  const supabase = getSupabaseServer();
  const lkClient = getRoomServiceClient();
  if (!lkClient) return;

  try {
    // 1. Get active participants in the LiveKit room session
    const lkParticipants = await lkClient.listParticipants(roomId);
    const activeGuestIds = lkParticipants.map((p) => p.identity);

    // 2. Fetch all registered participants in DB for this room
    const { data: dbParticipants } = await supabase
      .from("participants")
      .select("guest_id, joined_at")
      .eq("room_id", roomId);

    if (!dbParticipants) return;

    const idsToRemove: string[] = [];

    for (const dbPart of dbParticipants) {
      const presenceKey = `${roomId}:${dbPart.guest_id}`;
      if (activeGuestIds.includes(dbPart.guest_id)) {
        // Participant is actively connected to LiveKit
        participantLastSeenInLiveKitMap.set(presenceKey, now);
      } else {
        // Participant is not connected to LiveKit, check grace period
        const lastSeen = participantLastSeenInLiveKitMap.get(presenceKey);
        const joinedTime = new Date(dbPart.joined_at).getTime();
        
        if (lastSeen === undefined) {
          // First time we notice they are missing, record current time
          participantLastSeenInLiveKitMap.set(presenceKey, now);
        } else {
          const timeSinceLastSeen = now - lastSeen;
          const timeSinceJoined = now - joinedTime;
          
          // Allow 90 seconds grace period for transient disconnections/reloads, 
          // and at least 30 seconds since joining to prevent race conditions during initial connection
          if (timeSinceLastSeen > 90000 && timeSinceJoined > 30000) {
            idsToRemove.push(dbPart.guest_id);
            participantLastSeenInLiveKitMap.delete(presenceKey);
          }
        }
      }
    }

    if (idsToRemove.length > 0) {
      console.log(`[Presence Sync] Removing disconnected participants from room ${roomId}:`, idsToRemove);
      
      // Delete participants
      await supabase
        .from("participants")
        .delete()
        .eq("room_id", roomId)
        .in("guest_id", idsToRemove);

      // Clean up any speaker requests for these removed participants
      await supabase
        .from("speaker_requests")
        .delete()
        .eq("room_id", roomId)
        .in("guest_id", idsToRemove);
    }
  } catch (error) {
    console.warn(`[Presence Sync] Failed to sync participants for room ${roomId}:`, error);
  }
}

// In-memory tracker for empty rooms when DB columns are missing
const emptyRoomsMap = new Map<string, number>();

/**
 * Find and close all inactive rooms across the database.
 * A room is considered inactive if:
 * 1. It doesn't exist in LiveKit (meaning LiveKit session has ended/cleaned up)
 * 2. OR it has 0 participants in LiveKit and the last heartbeat/activity was more than 60 seconds ago
 * 3. OR the host is no longer registered as a participant in the room (host left/disconnected)
 */
export async function cleanupInactiveRooms(force = false) {
  const now = Date.now();
  if (!force && now - lastGlobalCleanupTime < 180000) {
    return; // Rate limit: at most once every 3 minutes globally
  }
  lastGlobalCleanupTime = now;

  const supabase = getSupabaseServer();
  const lkClient = getRoomServiceClient();
  if (!lkClient) return;

  try {
    // 1. Fetch all active rooms in the database
    let roomsResult: {
      data: Array<{ id: string; created_at: string; last_activity_at?: string | null; host_last_seen_at?: string | null }> | null;
      error: { code: string; message: string } | null;
    };

    const queryResult = await supabase
      .from("rooms")
      .select("id, created_at, last_activity_at, host_last_seen_at")
      .eq("is_active", true);

    // Gracefully fall back if activity tracking columns do not exist in the database (error 42703 or PGRST204)
    if (queryResult.error && (queryResult.error.code === "42703" || queryResult.error.code === "PGRST204")) {
      const fallbackQuery = await supabase
        .from("rooms")
        .select("id, created_at")
        .eq("is_active", true);
      roomsResult = {
        data: fallbackQuery.data,
        error: fallbackQuery.error ? { code: fallbackQuery.error.code, message: fallbackQuery.error.message } : null,
      };
    } else {
      roomsResult = {
        data: queryResult.data,
        error: queryResult.error ? { code: queryResult.error.code, message: queryResult.error.message } : null,
      };
    }

    if (roomsResult.error || !roomsResult.data || roomsResult.data.length === 0) {
      return;
    }

    const activeRooms = roomsResult.data;

    // Sync participant lists from LiveKit to database for all active rooms first
    for (const room of activeRooms) {
      await syncRoomParticipants(room.id);
    }

    // 2. Fetch all registered hosts in the participants table
    const { data: dbHosts } = await supabase
      .from("participants")
      .select("room_id")
      .eq("role", "host");

    const roomsWithHosts = new Set(dbHosts?.map((h) => h.room_id) || []);

    // 3. Fetch all active rooms in LiveKit
    const lkRooms = await lkClient.listRooms();
    const lkRoomMap = new Map(lkRooms.map((r) => [r.name, r]));

    const roomIdsToClose: string[] = [];

    for (const room of activeRooms) {
      const roomAgeMs = now - new Date(room.created_at).getTime();
      
      // Ignore rooms created in the last 60 seconds (grace period to connect)
      if (roomAgeMs < 60000) {
        continue;
      }

      // Close room if it doesn't have a host in the participants list (host left/disconnected)
      if (!roomsWithHosts.has(room.id)) {
        roomIdsToClose.push(room.id);
        continue;
      }

      const lkRoom = lkRoomMap.get(room.id);
      
      // Close room if it doesn't exist in LiveKit OR has 0 participants and has been idle for > 60 seconds
      if (!lkRoom) {
        roomIdsToClose.push(room.id);
      } else if (lkRoom.numParticipants === 0) {
        const lastActivityAt = (room as { last_activity_at?: string | null }).last_activity_at;
        const hostLastSeenAt = (room as { host_last_seen_at?: string | null }).host_last_seen_at;

        if (lastActivityAt || hostLastSeenAt) {
          const lastActivityMs = new Date(lastActivityAt || room.created_at).getTime();
          const hostLastSeenMs = new Date(hostLastSeenAt || room.created_at).getTime();
          const lastSeen = Math.max(lastActivityMs, hostLastSeenMs);
          
          if (now - lastSeen > 60000) {
            roomIdsToClose.push(room.id);
          }
        } else {
          // Use in-memory grace period map if DB activity tracking columns are missing
          const firstSeenEmpty = emptyRoomsMap.get(room.id);
          if (!firstSeenEmpty) {
            emptyRoomsMap.set(room.id, now);
          } else if (now - firstSeenEmpty > 60000) {
            roomIdsToClose.push(room.id);
          }
        }
      } else {
        // If room is no longer empty, remove it from the empty rooms map
        emptyRoomsMap.delete(room.id);
      }
    }

    if (roomIdsToClose.length > 0) {
      console.log("[Auto-Close] Deactivating empty/inactive rooms:", roomIdsToClose);

      // Deactivate rooms in DB
      const { error: deactivateError } = await supabase
        .from("rooms")
        .update({ is_active: false })
        .in("id", roomIdsToClose);

      if (!deactivateError) {
        // Clean up DB participants & requests for these closed rooms
        await supabase.from("participants").delete().in("room_id", roomIdsToClose);
        await supabase.from("speaker_requests").delete().in("room_id", roomIdsToClose);

        // Delete LiveKit sessions for these rooms
        for (const closedRoomId of roomIdsToClose) {
          try {
            await lkClient.deleteRoom(closedRoomId);
          } catch (lkErr) {
            console.warn(`[Auto-Close] Failed to delete LiveKit room ${closedRoomId}:`, lkErr);
          }
        }
      } else {
        console.error("[Auto-Close] Failed to deactivate rooms in DB:", deactivateError);
      }
    }
  } catch (error) {
    console.error("[Auto-Close] Error during room cleanup check:", error);
  }
}
