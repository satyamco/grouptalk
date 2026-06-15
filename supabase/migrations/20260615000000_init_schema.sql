-- ============================================================
-- VoxRoom — Supabase Schema Initialization
-- ============================================================

-- Enable UUID extension if needed, though we use text IDs (nanoids)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Rooms Table
CREATE TABLE IF NOT EXISTS rooms (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  category    TEXT NOT NULL,
  host_id     TEXT NOT NULL,
  host_name   TEXT NOT NULL,
  host_emoji  TEXT NOT NULL,
  is_private  BOOLEAN DEFAULT FALSE,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing for active rooms lookup
CREATE INDEX IF NOT EXISTS idx_rooms_is_active ON rooms(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_rooms_category ON rooms(category);

-- 2. Participants Table
CREATE TABLE IF NOT EXISTS participants (
  id        TEXT PRIMARY KEY,
  room_id   TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  guest_id  TEXT NOT NULL,
  name      TEXT NOT NULL,
  emoji     TEXT NOT NULL,
  role      TEXT NOT NULL CHECK (role IN ('host', 'moderator', 'speaker', 'listener')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_room_guest UNIQUE (room_id, guest_id)
);

-- Indexing for fast lookups per room
CREATE INDEX IF NOT EXISTS idx_participants_room_id ON participants(room_id);
CREATE INDEX IF NOT EXISTS idx_participants_guest_id ON participants(guest_id);

-- 3. Speaker Requests (Raise Hand) Table
CREATE TABLE IF NOT EXISTS speaker_requests (
  id         TEXT PRIMARY KEY,
  room_id    TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  guest_id   TEXT NOT NULL,
  name       TEXT NOT NULL,
  emoji      TEXT NOT NULL,
  status     TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing for fast lookups of pending requests per room
CREATE INDEX IF NOT EXISTS idx_speaker_requests_room_id ON speaker_requests(room_id);
CREATE INDEX IF NOT EXISTS idx_speaker_requests_status ON speaker_requests(status) WHERE status = 'pending';
