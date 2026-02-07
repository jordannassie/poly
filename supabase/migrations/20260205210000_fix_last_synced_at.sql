-- =====================================================
-- FIX: Ensure last_synced_at column exists in sports_games
-- This is a targeted fix for the schema cache issue
-- =====================================================

-- Add last_synced_at if it doesn't exist
ALTER TABLE public.sports_games 
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ DEFAULT NOW();

-- Add index for queries on last_synced_at
CREATE INDEX IF NOT EXISTS idx_sports_games_last_synced_at 
  ON public.sports_games(last_synced_at);

-- Notify PostgREST to reload schema cache (if running)
-- This helps avoid the "schema cache" error
NOTIFY pgrst, 'reload schema';

COMMENT ON COLUMN public.sports_games.last_synced_at IS 'Timestamp of last data sync from provider';
