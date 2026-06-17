-- Add max_seats, last_activity_at, and host_last_seen_at to rooms
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS max_seats INTEGER DEFAULT 8;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS host_last_seen_at TIMESTAMPTZ DEFAULT NOW();
