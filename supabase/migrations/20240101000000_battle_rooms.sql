-- Battle rooms table for PvP via Supabase Realtime
-- Rooms are ephemeral: auto-deleted after 2 hours via pg_cron (if enabled).

CREATE TABLE IF NOT EXISTS battle_rooms (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id   UUID        REFERENCES auth.users(id),
  player2_id   UUID        REFERENCES auth.users(id),
  player1_team JSONB,
  player2_team JSONB,
  state        JSONB       DEFAULT '{}',
  status       TEXT        DEFAULT 'waiting'
                           CHECK (status IN ('waiting', 'active', 'finished')),
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE battle_rooms ENABLE ROW LEVEL SECURITY;

-- Players can read their own rooms
CREATE POLICY "Players can see their rooms" ON battle_rooms
  FOR SELECT
  USING (auth.uid() IN (player1_id, player2_id));

-- Players can update rooms they belong to
CREATE POLICY "Players can update their rooms" ON battle_rooms
  FOR UPDATE
  USING (auth.uid() IN (player1_id, player2_id));

-- Any authenticated user can create a room (they become player1)
CREATE POLICY "Authenticated users can create rooms" ON battle_rooms
  FOR INSERT
  WITH CHECK (auth.uid() = player1_id);

-- Index for fast lookup by player
CREATE INDEX IF NOT EXISTS idx_battle_rooms_player1 ON battle_rooms (player1_id);
CREATE INDEX IF NOT EXISTS idx_battle_rooms_player2 ON battle_rooms (player2_id);
CREATE INDEX IF NOT EXISTS idx_battle_rooms_created_at ON battle_rooms (created_at);

-- Optional: auto-delete rooms older than 2 hours (requires pg_cron extension)
-- Uncomment if pg_cron is enabled in your Supabase project:
--
-- SELECT cron.schedule(
--   'cleanup-battle-rooms',
--   '0 * * * *',
--   $$DELETE FROM battle_rooms WHERE created_at < NOW() - INTERVAL '2 hours'$$
-- );
