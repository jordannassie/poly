-- =====================================================
-- SETTLEMENT TREASURY FEE TRACKING (PARTIAL)
-- 
-- NOTE: This migration is superseded by 20260208000000_treasury_fee_compat.sql
-- which handles all table creation and compatibility.
-- This file only adds columns if market_settlements already exists.
-- =====================================================

-- Only add columns if market_settlements table exists
-- (The compat migration will handle full creation if it doesn't)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM to_regclass('public.market_settlements')) THEN
    -- Add fee tracking columns
    ALTER TABLE public.market_settlements 
      ADD COLUMN IF NOT EXISTS gross_pool NUMERIC(18,6) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS losing_pool NUMERIC(18,6) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS winning_pool NUMERIC(18,6) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS platform_fee_amount NUMERIC(18,6) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS net_distributed_amount NUMERIC(18,6) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS winners_count INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS losers_count INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS fee_rate NUMERIC(5,4) DEFAULT 0.03;
    RAISE NOTICE 'Added fee columns to market_settlements';
  ELSE
    RAISE NOTICE 'market_settlements does not exist yet - will be created by compat migration';
  END IF;
END $$;

-- The full treasury_ledger table and treasury_balance view are created 
-- by the 20260208000000_treasury_fee_compat.sql migration
