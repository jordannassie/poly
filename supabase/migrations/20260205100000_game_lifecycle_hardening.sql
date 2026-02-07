-- =====================================================
-- GAME LIFECYCLE HARDENING MIGRATION
-- State protections, settlement receipts, job locks
-- =====================================================

-- ============================================================================
-- 1) JOB_LOCKS TABLE - Prevents concurrent cron execution
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.job_locks (
  job_name TEXT PRIMARY KEY,
  locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  locked_by TEXT,
  meta JSONB DEFAULT '{}'::jsonb
);

COMMENT ON TABLE public.job_locks IS 'Distributed locks for preventing concurrent cron job execution';

-- Enable RLS
ALTER TABLE public.job_locks ENABLE ROW LEVEL SECURITY;

-- Service role can manage job locks
CREATE POLICY "Service role can manage job locks"
  ON public.job_locks
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to acquire a job lock
CREATE OR REPLACE FUNCTION public.acquire_job_lock(
  p_job_name TEXT,
  p_locked_by TEXT DEFAULT NULL,
  p_ttl_minutes INT DEFAULT 5
)
RETURNS BOOLEAN AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_expires_at TIMESTAMPTZ := v_now + (p_ttl_minutes || ' minutes')::INTERVAL;
BEGIN
  -- Delete expired locks first
  DELETE FROM public.job_locks 
  WHERE job_name = p_job_name AND expires_at < v_now;
  
  -- Try to insert new lock
  INSERT INTO public.job_locks (job_name, locked_at, expires_at, locked_by)
  VALUES (p_job_name, v_now, v_expires_at, p_locked_by)
  ON CONFLICT (job_name) DO NOTHING;
  
  -- Return true if we got the lock (our row was inserted)
  RETURN FOUND OR NOT EXISTS (
    SELECT 1 FROM public.job_locks 
    WHERE job_name = p_job_name AND locked_by IS DISTINCT FROM p_locked_by
  );
END;
$$ LANGUAGE plpgsql;

-- Function to release a job lock
CREATE OR REPLACE FUNCTION public.release_job_lock(p_job_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM public.job_locks WHERE job_name = p_job_name;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2) SETTLEMENT_RECEIPTS TABLE - Track individual settlement transactions
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.settlement_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_queue_id UUID REFERENCES public.settlement_queue(id) ON DELETE CASCADE,
  market_id UUID REFERENCES public.markets(id),
  game_id BIGINT REFERENCES public.sports_games(id),
  user_id UUID,
  
  -- Transaction details
  receipt_type TEXT NOT NULL CHECK (receipt_type IN ('PAYOUT', 'REFUND', 'FEE')),
  status TEXT NOT NULL DEFAULT 'INITIATED' CHECK (status IN ('INITIATED', 'CONFIRMED', 'FAILED')),
  amount NUMERIC(18,6) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USDC',
  
  -- Tracking
  payout_id UUID,
  ledger_entry_id UUID,
  tx_hash TEXT,
  
  -- Timestamps
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Prevent duplicate payouts to same user for same market
  CONSTRAINT uq_settlement_receipt_user_market UNIQUE (market_id, user_id, receipt_type)
);

CREATE INDEX IF NOT EXISTS idx_settlement_receipts_queue_id ON public.settlement_receipts(settlement_queue_id);
CREATE INDEX IF NOT EXISTS idx_settlement_receipts_market_id ON public.settlement_receipts(market_id);
CREATE INDEX IF NOT EXISTS idx_settlement_receipts_game_id ON public.settlement_receipts(game_id);
CREATE INDEX IF NOT EXISTS idx_settlement_receipts_status ON public.settlement_receipts(status);
CREATE INDEX IF NOT EXISTS idx_settlement_receipts_user_id ON public.settlement_receipts(user_id);

-- Enable RLS
ALTER TABLE public.settlement_receipts ENABLE ROW LEVEL SECURITY;

-- Service role can manage
CREATE POLICY "Service role can manage settlement receipts"
  ON public.settlement_receipts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view their own receipts
CREATE POLICY "Users can view own settlement receipts"
  ON public.settlement_receipts
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

COMMENT ON TABLE public.settlement_receipts IS 'Tracks individual payout/refund transactions for idempotency';

-- ============================================================================
-- 3) STATE PROTECTION TRIGGER - Prevent status regression
-- ============================================================================

-- Status weight function for comparison
CREATE OR REPLACE FUNCTION public.status_norm_weight(status TEXT)
RETURNS INT AS $$
BEGIN
  RETURN CASE status
    WHEN 'SCHEDULED' THEN 1
    WHEN 'LIVE' THEN 2
    WHEN 'FINAL' THEN 3
    WHEN 'CANCELED' THEN 3
    WHEN 'POSTPONED' THEN 3
    ELSE 0
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger function to enforce state machine rules
CREATE OR REPLACE FUNCTION public.enforce_game_state_machine()
RETURNS TRIGGER AS $$
BEGIN
  -- Rule 1: If game was already settled, block most updates
  IF OLD.settled_at IS NOT NULL THEN
    -- Allow ONLY updating certain metadata fields, not game results
    IF (
      NEW.home_score IS DISTINCT FROM OLD.home_score OR
      NEW.away_score IS DISTINCT FROM OLD.away_score OR
      NEW.winner_side IS DISTINCT FROM OLD.winner_side OR
      NEW.status_norm IS DISTINCT FROM OLD.status_norm
    ) THEN
      RAISE EXCEPTION 'Cannot modify settled game results (game_id=%)', OLD.id;
    END IF;
  END IF;
  
  -- Rule 2: Prevent status regression (FINAL/CANCELED/POSTPONED cannot go back to LIVE/SCHEDULED)
  IF OLD.status_norm IN ('FINAL', 'CANCELED', 'POSTPONED') THEN
    IF NEW.status_norm NOT IN ('FINAL', 'CANCELED', 'POSTPONED') THEN
      RAISE EXCEPTION 'Cannot regress status from % to % (game_id=%)', OLD.status_norm, NEW.status_norm, OLD.id;
    END IF;
  END IF;
  
  -- Rule 3: winner_side can only be set when status_norm is FINAL
  IF NEW.winner_side IS NOT NULL AND NEW.status_norm != 'FINAL' THEN
    -- Allow if we're also setting to FINAL in same update
    IF NEW.status_norm NOT IN ('FINAL') THEN
      RAISE EXCEPTION 'winner_side can only be set when status_norm is FINAL (game_id=%)', OLD.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger (drop first if exists to allow recreation)
DROP TRIGGER IF EXISTS enforce_game_state_machine_trigger ON public.sports_games;
CREATE TRIGGER enforce_game_state_machine_trigger
  BEFORE UPDATE ON public.sports_games
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_game_state_machine();

-- ============================================================================
-- 4) SETTLEMENT QUEUE OUTCOME COLUMN FIX
-- Ensure outcome column exists and has proper constraint
-- ============================================================================

-- Add outcome column if not exists (may have been missed in prior migration)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'settlement_queue' 
    AND column_name = 'outcome'
  ) THEN
    ALTER TABLE public.settlement_queue ADD COLUMN outcome TEXT;
  END IF;
END $$;

-- ============================================================================
-- 5) ADD INDEXES FOR HEALTH CHECK QUERIES
-- ============================================================================

-- Composite index for stuck game detection
CREATE INDEX IF NOT EXISTS idx_sports_games_stuck_detection 
  ON public.sports_games(status_norm, starts_at, finalized_at);

-- Index for finding FINAL games not yet settled
CREATE INDEX IF NOT EXISTS idx_sports_games_final_unsettled 
  ON public.sports_games(status_norm, settled_at) 
  WHERE status_norm = 'FINAL' AND settled_at IS NULL;

-- Index for queue processing
CREATE INDEX IF NOT EXISTS idx_settlement_queue_ready 
  ON public.settlement_queue(status, next_attempt_at) 
  WHERE status IN ('QUEUED', 'FAILED');

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON public.job_locks TO service_role;
GRANT SELECT ON public.settlement_receipts TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_job_lock TO service_role;
GRANT EXECUTE ON FUNCTION public.release_job_lock TO service_role;
GRANT EXECUTE ON FUNCTION public.status_norm_weight TO service_role;
