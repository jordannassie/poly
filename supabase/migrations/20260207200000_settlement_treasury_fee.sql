-- =====================================================
-- SETTLEMENT TREASURY FEE TRACKING
-- Adds explicit fee tracking and treasury integration
-- =====================================================

-- Add fee tracking columns to market_settlements
ALTER TABLE public.market_settlements 
  ADD COLUMN IF NOT EXISTS gross_pool NUMERIC(18,6) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS losing_pool NUMERIC(18,6) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS winning_pool NUMERIC(18,6) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS platform_fee_amount NUMERIC(18,6) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_distributed_amount NUMERIC(18,6) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS winners_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS losers_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fee_rate NUMERIC(5,4) DEFAULT 0.03;

-- Create treasury_ledger for atomic fee tracking
CREATE TABLE IF NOT EXISTS public.treasury_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id UUID REFERENCES public.market_settlements(id) ON DELETE SET NULL,
  market_id UUID REFERENCES public.markets(id) ON DELETE SET NULL,
  game_id BIGINT REFERENCES public.sports_games(id) ON DELETE SET NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('SETTLEMENT_FEE', 'DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT')),
  amount NUMERIC(18,6) NOT NULL,
  fee_rate NUMERIC(5,4),
  gross_pool NUMERIC(18,6),
  losing_pool NUMERIC(18,6),
  balance_before NUMERIC(18,6),
  balance_after NUMERIC(18,6),
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Prevent duplicate fee entries per market
  CONSTRAINT uq_treasury_ledger_settlement UNIQUE (settlement_id)
);

CREATE INDEX IF NOT EXISTS idx_treasury_ledger_created_at ON public.treasury_ledger(created_at);
CREATE INDEX IF NOT EXISTS idx_treasury_ledger_entry_type ON public.treasury_ledger(entry_type);

-- Enable RLS
ALTER TABLE public.treasury_ledger ENABLE ROW LEVEL SECURITY;

-- Service role can manage treasury
CREATE POLICY "Service role can manage treasury_ledger"
  ON public.treasury_ledger
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admin can view treasury
CREATE POLICY "Admin can view treasury_ledger"
  ON public.treasury_ledger
  FOR SELECT
  TO authenticated
  USING (true);

-- Create treasury_balance view for easy querying
CREATE OR REPLACE VIEW public.treasury_balance AS
SELECT 
  COALESCE(SUM(CASE WHEN entry_type IN ('SETTLEMENT_FEE', 'DEPOSIT') THEN amount ELSE 0 END), 0) as total_fees_collected,
  COALESCE(SUM(CASE WHEN entry_type = 'WITHDRAWAL' THEN amount ELSE 0 END), 0) as total_withdrawn,
  COALESCE(SUM(CASE WHEN entry_type = 'ADJUSTMENT' THEN amount ELSE 0 END), 0) as total_adjustments,
  COALESCE(SUM(amount), 0) as current_balance,
  COUNT(*) as total_entries,
  MAX(created_at) as last_updated
FROM public.treasury_ledger;

GRANT SELECT ON public.treasury_balance TO service_role, authenticated;
GRANT SELECT ON public.treasury_ledger TO service_role;

COMMENT ON TABLE public.treasury_ledger IS 'Append-only ledger of treasury transactions (fees, deposits, withdrawals)';
COMMENT ON VIEW public.treasury_balance IS 'Current treasury balance and statistics';
