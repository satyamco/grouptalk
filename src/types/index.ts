// ============================================================
// VoxRoom — Shared TypeScript Types
// ============================================================

// --- User Profile (stored in localStorage) ---

export interface UserProfile {
  name: string;
  emoji: string;
  gender?: "Male" | "Female" | "Non-binary" | "Prefer not to say";
  ageGroup?: "Under 18" | "18-24" | "25-34" | "35-44" | "45+";
}

// --- Room ---

export type RoomCategory =
  | "General"
  | "English Learning"
  | "Music"
  | "Tech"
  | "Gaming"
  | "Sports"
  | "Politics"
  | "Education"
  | "Chill"
  | "Q&A"
  | "Debate";

export interface Room {
  id: string;
  name: string;
  description: string | null;
  category: RoomCategory;
  host_id: string;
  host_name: string;
  host_emoji: string;
  is_private: boolean;
  is_active: boolean;
  created_at: string;
  max_seats?: number;
  last_activity_at?: string;
  host_last_seen_at?: string;
}

export interface RoomWithCounts extends Room {
  speaker_count: number;
  listener_count: number;
  participant_count: number;
}

// --- Participant ---

export type ParticipantRole = "host" | "moderator" | "speaker" | "listener";

export interface Participant {
  id: string;
  room_id: string;
  guest_id: string;
  name: string;
  emoji: string;
  role: ParticipantRole;
  joined_at: string;
}

// --- Speaker Request ---

export type SpeakerRequestStatus = "pending" | "approved" | "rejected";

export interface SpeakerRequest {
  id: string;
  room_id: string;
  guest_id: string;
  name: string;
  emoji: string;
  status: SpeakerRequestStatus;
  created_at: string;
}

// --- Chat Message ---

export interface ChatMessage {
  id: string;
  senderName: string;
  senderEmoji: string;
  message: string;
  createdAt: number; // Unix timestamp (ms)
}

// --- API Payloads ---

export interface CreateRoomPayload {
  name: string;
  description?: string;
  category: RoomCategory;
  is_private?: boolean;
}

export interface JoinRoomPayload {
  guest_id: string;
  name: string;
  emoji: string;
}

export interface RaiseHandPayload {
  room_id: string;
  guest_id: string;
  name: string;
  emoji: string;
}

export interface HandleRequestPayload {
  request_id: string;
  status: "approved" | "rejected";
}

// --- LiveKit ---

export interface TokenRequest {
  roomId: string;
  guestId: string;
  name: string;
  emoji: string;
}

export interface TokenResponse {
  token: string;
}

// --- Data Channel Events ---

export type DataChannelEvent =
  | { type: "chat"; data: ChatMessage }
  | { type: "hand-raise"; data: { guestId: string; name: string; emoji: string } }
  | { type: "hand-response"; data: { guestId: string; approved: boolean } }
  | { type: "role-change"; data: { guestId: string; newRole: ParticipantRole } }
  | { type: "participant-removed"; data: { guestId: string } }
  | { type: "reaction"; data: { emoji: string; senderName: string } }
  | { type: "room-ended"; data: { hostName: string } }
  | { type: "capacity-updated"; data: { maxSeats: number } };
