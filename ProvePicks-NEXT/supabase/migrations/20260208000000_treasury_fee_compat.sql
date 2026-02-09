-- =====================================================
-- TREASURY + SETTLEMENT TABLE COMPATIBILITY MIGRATION
-- 
-- This migration ensures:
-- 1) treasury_ledger table exists
-- 2) treasury_balance view exists
-- 3) market_settlements table/view exists (compatible with code)
-- 4) Fee tracking columns exist on the canonical settlements table
--
-- IDEMPOTENT: Safe to run multiple times
-- =====================================================

-- =====================================================
-- STEP 1: Create market_settlements TABLE if it doesn't exist
-- (The game_lifecycle_v1 migration should have created this,
-- but if only admin_foundation ran, we need to create it)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.market_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  game_id BIGINT REFERENCES public.sports_games(id) ON DELETE SET NULL,
  outcome TEXT NOT NULL,
  total_volume NUMERIC(18,6) DEFAULT 0,
  total_payouts NUMERIC(18,6) DEFAULT 0,
  payout_count INT DEFAULT 0,
  settled_by TEXT NOT NULL DEFAULT 'system',
  settled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payout_tx TEXT,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- One settlement per market
  CONSTRAINT uq_market_settlements_market_id UNIQUE (market_id)
);

-- Add indexes (IF NOT EXISTS is implicit with CREATE INDEX IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_market_settlements_game_id ON public.market_settlements(game_id);
CREATE INDEX IF NOT EXISTS idx_market_settlements_settled_at ON public.market_settlements(settled_at);
CREATE INDEX IF NOT EXISTS idx_market_settlements_created_at ON public.market_settlements(created_at);

-- Enable RLS (safe to run even if already enabled)
ALTER TABLE public.market_settlements ENABLE ROW LEVEL SECURITY;

-- Policies (drop first to avoid conflicts, then create)
DROP POLICY IF EXISTS "Public can view market settlements" ON public.market_settlements;
CREATE POLICY "Public can view market settlements"
  ON public.market_settlements
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Service role can manage market settlements" ON public.market_settlements;
CREATE POLICY "Service role can manage market settlements"
  ON public.market_settlements
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- STEP 2: Add fee tracking columns to market_settlements
-- (Uses ADD COLUMN IF NOT EXISTS for idempotency)
-- =====================================================

ALTER TABLE public.market_settlements 
  ADD COLUMN IF NOT EXISTS gross_pool NUMERIC(18,6) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS losing_pool NUMERIC(18,6) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS winning_pool NUMERIC(18,6) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS platform_fee_amount NUMERIC(18,6) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_distributed_amount NUMERIC(18,6) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS winners_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS losers_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fee_rate NUMERIC(5,4) DEFAULT 0.03;

-- =====================================================
-- STEP 3: Create treasury_ledger table
-- (settlement_id is nullable UUID to handle various scenarios)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.treasury_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id UUID,  -- No FK constraint to handle table name variations
  market_id UUID,
  game_id BIGINT,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('SETTLEMENT_FEE', 'DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT')),
  amount NUMERIC(18,6) NOT NULL,
  fee_rate NUMERIC(5,4),
  gross_pool NUMERIC(18,6),
  losing_pool NUMERIC(18,6),
  balance_before NUMERIC(18,6),
  balance_after NUMERIC(18,6),
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add unique constraint for idempotency (only one fee per settlement)
-- Use DO block to handle case where constraint already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'uq_treasury_ledger_settlement' 
    AND conrelid = 'public.treasury_ledger'::regclass
  ) THEN
    ALTER TABLE public.treasury_ledger 
      ADD CONSTRAINT uq_treasury_ledger_settlement UNIQUE (settlement_id);
  END IF;
EXCEPTION WHEN duplicate_object THEN
  -- Constraint already exists, ignore
  NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_treasury_ledger_created_at ON public.treasury_ledger(created_at);
CREATE INDEX IF NOT EXISTS idx_treasury_ledger_entry_type ON public.treasury_ledger(entry_type);
CREATE INDEX IF NOT EXISTS idx_treasury_ledger_settlement_id ON public.treasury_ledger(settlement_id);

-- Enable RLS
ALTER TABLE public.treasury_ledger ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Service role can manage treasury_ledger" ON public.treasury_ledger;
CREATE POLICY "Service role can manage treasury_ledger"
  ON public.treasury_ledger
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admin can view treasury_ledger" ON public.treasury_ledger;
CREATE POLICY "Admin can view treasury_ledger"
  ON public.treasury_ledger
  FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- STEP 4: Create treasury_balance view
-- =====================================================

CREATE OR REPLACE VIEW public.treasury_balance AS
SELECT 
  COALESCE(SUM(CASE WHEN entry_type IN ('SETTLEMENT_FEE', 'DEPOSIT') THEN amount ELSE 0 END), 0) as total_fees_collected,
  COALESCE(SUM(CASE WHEN entry_type = 'WITHDRAWAL' THEN -amount ELSE 0 END), 0) as total_withdrawn,
  COALESCE(SUM(CASE WHEN entry_type = 'ADJUSTMENT' THEN amount ELSE 0 END), 0) as total_adjustments,
  COALESCE(SUM(
    CASE 
      WHEN entry_type IN ('SETTLEMENT_FEE', 'DEPOSIT', 'ADJUSTMENT') THEN amount 
      WHEN entry_type = 'WITHDRAWAL' THEN -amount 
      ELSE 0 
    END
  ), 0) as current_balance,
  COUNT(*) as total_entries,
  MAX(created_at) as last_updated
FROM public.treasury_ledger;

-- =====================================================
-- STEP 5: Grant permissions
-- =====================================================

GRANT SELECT ON public.treasury_balance TO service_role, authenticated;
GRANT SELECT ON public.treasury_ledger TO service_role;
GRANT SELECT ON public.market_settlements TO anon, authenticated;

-- =====================================================
-- STEP 6: Add comments
-- =====================================================

COMMENT ON TABLE public.treasury_ledger IS 'Append-only ledger of treasury transactions (fees, deposits, withdrawals)';
COMMENT ON VIEW public.treasury_balance IS 'Current treasury balance and statistics';
COMMENT ON TABLE public.market_settlements IS 'Records of completed market settlements with fee tracking';

-- =====================================================
-- VERIFICATION QUERIES (run these after migration to verify)
-- =====================================================
-- 
-- Check objects exist:
-- SELECT to_regclass('public.treasury_ledger');
-- SELECT to_regclass('public.treasury_balance');
-- SELECT to_regclass('public.market_settlements');
--
-- Check market_settlements columns:
-- SELECT column_name FROM information_schema.columns 
-- WHERE table_schema='public' AND table_name='market_settlements'
-- ORDER BY ordinal_position;
--
-- Check treasury_ledger count:
-- SELECT count(*) FROM public.treasury_ledger;
--
-- Check fee columns exist:
-- SELECT gross_pool, losing_pool, platform_fee_amount, fee_rate 
-- FROM public.market_settlements LIMIT 1;
--
-- =====================================================
