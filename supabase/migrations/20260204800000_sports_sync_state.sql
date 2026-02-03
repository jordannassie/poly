-- Sports Sync State Table
-- Tracks sync progress for each league/season to avoid redundant API calls
-- and enable resumable backfills

CREATE TABLE IF NOT EXISTS public.sports_sync_state (
  id BIGSERIAL PRIMARY KEY,
  sport_key TEXT NOT NULL,           -- 'nfl', 'nba', 'mlb', 'nhl', 'soccer'
  league_id INT NOT NULL,            -- API-Sports league ID
  season INT NOT NULL,
  last_backfill_at TIMESTAMPTZ,      -- Last full season backfill
  last_daily_sync_at TIMESTAMPTZ,    -- Last daily sync (upcoming games)
  last_live_sync_at TIMESTAMPTZ,     -- Last live games sync
  backfill_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint per sport/league/season
  CONSTRAINT uq_sports_sync_state UNIQUE (sport_key, league_id, season)
);

-- Enable RLS
ALTER TABLE public.sports_sync_state ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Sports sync state is readable"
  ON public.sports_sync_state
  FOR SELECT
  TO public
  USING (true);

-- Service role can manage
CREATE POLICY "Service role can manage sports sync state"
  ON public.sports_sync_state
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sports_sync_state_sport ON public.sports_sync_state(sport_key);
CREATE INDEX IF NOT EXISTS idx_sports_sync_state_season ON public.sports_sync_state(season);

COMMENT ON TABLE public.sports_sync_state IS 'Tracks sync state for automated game syncing';
