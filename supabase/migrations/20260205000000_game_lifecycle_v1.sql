-- =====================================================
-- GAME LIFECYCLE V1 MIGRATION
-- Production-grade game state machine + settlement system
-- =====================================================

-- 1) Extend sports_games with normalized status and settlement tracking
-- Add new columns (won't break existing data)
ALTER TABLE public.sports_games 
  ADD COLUMN IF NOT EXISTS status_raw TEXT,
  ADD COLUMN IF NOT EXISTS status_norm TEXT DEFAULT 'SCHEDULED' 
    CHECK (status_norm IN ('SCHEDULED', 'LIVE', 'FINAL', 'CANCELED', 'POSTPONED')),
  ADD COLUMN IF NOT EXISTS winner_side TEXT 
    CHECK (winner_side IS NULL OR winner_side IN ('HOME', 'AWAY', 'DRAW')),
  ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill status_norm from existing status column
UPDATE public.sports_games 
SET status_raw = status,
    status_norm = CASE 
      WHEN LOWER(status) IN ('final', 'ft', 'aet', 'pen', 'finished', 'ended', 'f', 'f/ot') THEN 'FINAL'
      WHEN LOWER(status) IN ('live', 'in progress', 'inprogress', '1h', '2h', 'ht', 'q1', 'q2', 'q3', 'q4', 'ot', 'p1', 'p2', 'p3') THEN 'LIVE'
      WHEN LOWER(status) IN ('canceled', 'cancelled', 'canc', 'abd') THEN 'CANCELED'
      WHEN LOWER(status) IN ('postponed', 'pst', 'post') THEN 'POSTPONED'
      ELSE 'SCHEDULED'
    END,
    updated_at = NOW()
WHERE status_norm IS NULL OR status_norm = 'SCHEDULED';

-- Create indexes for lifecycle queries
CREATE INDEX IF NOT EXISTS idx_sports_games_status_norm ON public.sports_games(status_norm);
CREATE INDEX IF NOT EXISTS idx_sports_games_finalized_at ON public.sports_games(finalized_at);
CREATE INDEX IF NOT EXISTS idx_sports_games_settled_at ON public.sports_games(settled_at);
CREATE INDEX IF NOT EXISTS idx_sports_games_last_synced_at ON public.sports_games(last_synced_at);

-- 2) Create settlement_queue table for game-level settlement tracking
CREATE TABLE IF NOT EXISTS public.settlement_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id BIGINT NOT NULL REFERENCES public.sports_games(id) ON DELETE CASCADE,
  league TEXT NOT NULL,
  external_game_id TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'api-sports',
  status TEXT NOT NULL DEFAULT 'QUEUED' 
    CHECK (status IN ('QUEUED', 'PROCESSING', 'DONE', 'FAILED', 'SKIPPED')),
  outcome TEXT, -- HOME, AWAY, DRAW, CANCELED
  reason TEXT,
  attempts INT NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_by TEXT,
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Only one settlement task per game
  CONSTRAINT uq_settlement_queue_game_id UNIQUE (game_id)
);

-- Create indexes for queue processing
CREATE INDEX IF NOT EXISTS idx_settlement_queue_status ON public.settlement_queue(status);
CREATE INDEX IF NOT EXISTS idx_settlement_queue_next_attempt ON public.settlement_queue(next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_settlement_queue_league ON public.settlement_queue(league);

-- Enable RLS
ALTER TABLE public.settlement_queue ENABLE ROW LEVEL SECURITY;

-- Service role can manage settlement queue
CREATE POLICY "Service role can manage settlement queue"
  ON public.settlement_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3) Create market_settlements table for tracking per-market settlements
CREATE TABLE IF NOT EXISTS public.market_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  game_id BIGINT REFERENCES public.sports_games(id),
  outcome TEXT NOT NULL, -- HOME, AWAY, DRAW, CANCELED, VOID
  total_volume NUMERIC(18,6) DEFAULT 0,
  total_payouts NUMERIC(18,6) DEFAULT 0,
  payout_count INT DEFAULT 0,
  settled_by TEXT NOT NULL DEFAULT 'system', -- system, admin
  settled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payout_tx TEXT, -- optional on-chain tx signature
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- One settlement per market
  CONSTRAINT uq_market_settlements_market_id UNIQUE (market_id)
);

CREATE INDEX IF NOT EXISTS idx_market_settlements_game_id ON public.market_settlements(game_id);
CREATE INDEX IF NOT EXISTS idx_market_settlements_settled_at ON public.market_settlements(settled_at);

-- Enable RLS
ALTER TABLE public.market_settlements ENABLE ROW LEVEL SECURITY;

-- Public can view market settlements
CREATE POLICY "Public can view market settlements"
  ON public.market_settlements
  FOR SELECT
  TO public
  USING (true);

-- Service role can manage
CREATE POLICY "Service role can manage market settlements"
  ON public.market_settlements
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4) Updated_at trigger for sports_games
CREATE OR REPLACE FUNCTION public.handle_sports_games_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_sports_games_updated_at ON public.sports_games;
CREATE TRIGGER set_sports_games_updated_at
    BEFORE UPDATE ON public.sports_games
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_sports_games_updated_at();

-- 5) Updated_at trigger for settlement_queue
CREATE OR REPLACE FUNCTION public.handle_settlement_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_settlement_queue_updated_at ON public.settlement_queue;
CREATE TRIGGER set_settlement_queue_updated_at
    BEFORE UPDATE ON public.settlement_queue
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_settlement_queue_updated_at();

-- Grant permissions
GRANT SELECT ON public.settlement_queue TO service_role;
GRANT SELECT ON public.market_settlements TO anon, authenticated;

COMMENT ON TABLE public.settlement_queue IS 'Queue for game settlements - one task per game';
COMMENT ON TABLE public.market_settlements IS 'Records of completed market settlements';
COMMENT ON COLUMN public.sports_games.status_norm IS 'Normalized status: SCHEDULED, LIVE, FINAL, CANCELED, POSTPONED';
COMMENT ON COLUMN public.sports_games.winner_side IS 'Winning side for FINAL games: HOME, AWAY, DRAW';
