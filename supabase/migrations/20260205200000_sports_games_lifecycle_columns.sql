-- =====================================================
-- SPORTS_GAMES LIFECYCLE COLUMNS MIGRATION
-- Add missing lifecycle columns to existing sports_games table
-- Idempotent: safe to run multiple times
-- =====================================================

-- Add lifecycle columns if they don't exist
DO $$ 
BEGIN
  -- status_raw: raw status from provider API
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'sports_games' AND column_name = 'status_raw'
  ) THEN
    ALTER TABLE public.sports_games ADD COLUMN status_raw TEXT;
    RAISE NOTICE 'Added column: status_raw';
  END IF;

  -- status_norm: normalized status (SCHEDULED, LIVE, FINAL, CANCELED, POSTPONED)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'sports_games' AND column_name = 'status_norm'
  ) THEN
    ALTER TABLE public.sports_games ADD COLUMN status_norm TEXT DEFAULT 'SCHEDULED' 
      CHECK (status_norm IN ('SCHEDULED', 'LIVE', 'FINAL', 'CANCELED', 'POSTPONED'));
    RAISE NOTICE 'Added column: status_norm';
  END IF;

  -- winner_side: HOME, AWAY, or DRAW (only for FINAL games)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'sports_games' AND column_name = 'winner_side'
  ) THEN
    ALTER TABLE public.sports_games ADD COLUMN winner_side TEXT 
      CHECK (winner_side IS NULL OR winner_side IN ('HOME', 'AWAY', 'DRAW'));
    RAISE NOTICE 'Added column: winner_side';
  END IF;

  -- finalized_at: when game was marked as FINAL
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'sports_games' AND column_name = 'finalized_at'
  ) THEN
    ALTER TABLE public.sports_games ADD COLUMN finalized_at TIMESTAMPTZ;
    RAISE NOTICE 'Added column: finalized_at';
  END IF;

  -- settled_at: when settlement was completed
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'sports_games' AND column_name = 'settled_at'
  ) THEN
    ALTER TABLE public.sports_games ADD COLUMN settled_at TIMESTAMPTZ;
    RAISE NOTICE 'Added column: settled_at';
  END IF;

  -- last_synced_at: last time data was synced from provider
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'sports_games' AND column_name = 'last_synced_at'
  ) THEN
    ALTER TABLE public.sports_games ADD COLUMN last_synced_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Added column: last_synced_at';
  END IF;

  -- provider: data provider name (may already exist in v2 schema)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'sports_games' AND column_name = 'provider'
  ) THEN
    ALTER TABLE public.sports_games ADD COLUMN provider TEXT NOT NULL DEFAULT 'api-sports';
    RAISE NOTICE 'Added column: provider';
  END IF;

  -- external_game_id: unique game ID from provider (may already exist in v2 schema)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'sports_games' AND column_name = 'external_game_id'
  ) THEN
    ALTER TABLE public.sports_games ADD COLUMN external_game_id TEXT;
    -- Backfill from api_game_id if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'sports_games' AND column_name = 'api_game_id'
    ) THEN
      UPDATE public.sports_games SET external_game_id = api_game_id::TEXT WHERE external_game_id IS NULL;
    END IF;
    RAISE NOTICE 'Added column: external_game_id';
  END IF;

  -- updated_at: general timestamp for any row update
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'sports_games' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.sports_games ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Added column: updated_at';
  END IF;
END $$;

-- =====================================================
-- ENSURE UNIQUE CONSTRAINT EXISTS
-- The v2 schema uses (league, external_game_id)
-- =====================================================

-- Create unique constraint if not exists
DO $$
BEGIN
  -- Check if the v2 constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'uq_sports_games_league_external_game_id'
  ) THEN
    -- Check if external_game_id column exists and has data
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'sports_games' AND column_name = 'external_game_id'
    ) THEN
      -- Drop old constraint if it exists (from v1 schema)
      IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'uq_sports_games_league_api_game_id'
      ) THEN
        ALTER TABLE public.sports_games DROP CONSTRAINT uq_sports_games_league_api_game_id;
        RAISE NOTICE 'Dropped old constraint: uq_sports_games_league_api_game_id';
      END IF;
      
      -- Create new constraint (may fail if duplicates exist)
      BEGIN
        ALTER TABLE public.sports_games 
          ADD CONSTRAINT uq_sports_games_league_external_game_id UNIQUE (league, external_game_id);
        RAISE NOTICE 'Added constraint: uq_sports_games_league_external_game_id';
      EXCEPTION WHEN unique_violation THEN
        RAISE NOTICE 'Cannot add unique constraint - duplicate values exist';
      END;
    END IF;
  END IF;
END $$;

-- =====================================================
-- ADD INDEXES FOR LIFECYCLE QUERIES (IDEMPOTENT)
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_sports_games_status_norm ON public.sports_games(status_norm);
CREATE INDEX IF NOT EXISTS idx_sports_games_finalized_at ON public.sports_games(finalized_at);
CREATE INDEX IF NOT EXISTS idx_sports_games_settled_at ON public.sports_games(settled_at);
CREATE INDEX IF NOT EXISTS idx_sports_games_last_synced_at ON public.sports_games(last_synced_at);
CREATE INDEX IF NOT EXISTS idx_sports_games_provider ON public.sports_games(provider);
CREATE INDEX IF NOT EXISTS idx_sports_games_external_game_id ON public.sports_games(external_game_id);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sports_games_league_external_id ON public.sports_games(league, external_game_id);
CREATE INDEX IF NOT EXISTS idx_sports_games_status_starts ON public.sports_games(status_norm, starts_at);

-- =====================================================
-- BACKFILL status_norm FROM status (if needed)
-- =====================================================

UPDATE public.sports_games 
SET 
  status_raw = COALESCE(status_raw, status),
  status_norm = CASE 
    WHEN LOWER(COALESCE(status, '')) IN ('final', 'ft', 'aet', 'pen', 'finished', 'ended', 'f', 'f/ot') THEN 'FINAL'
    WHEN LOWER(COALESCE(status, '')) IN ('live', 'in progress', 'inprogress', '1h', '2h', 'ht', 'q1', 'q2', 'q3', 'q4', 'ot', 'p1', 'p2', 'p3') THEN 'LIVE'
    WHEN LOWER(COALESCE(status, '')) IN ('canceled', 'cancelled', 'canc', 'abd') THEN 'CANCELED'
    WHEN LOWER(COALESCE(status, '')) IN ('postponed', 'pst', 'post') THEN 'POSTPONED'
    ELSE 'SCHEDULED'
  END,
  updated_at = NOW()
WHERE status_norm IS NULL;

COMMENT ON COLUMN public.sports_games.status_raw IS 'Raw status code from provider API';
COMMENT ON COLUMN public.sports_games.status_norm IS 'Normalized status: SCHEDULED, LIVE, FINAL, CANCELED, POSTPONED';
COMMENT ON COLUMN public.sports_games.winner_side IS 'Winning side for FINAL games: HOME, AWAY, DRAW';
COMMENT ON COLUMN public.sports_games.finalized_at IS 'Timestamp when game was marked FINAL';
COMMENT ON COLUMN public.sports_games.settled_at IS 'Timestamp when settlement was completed';
COMMENT ON COLUMN public.sports_games.last_synced_at IS 'Last time data was synced from provider';
