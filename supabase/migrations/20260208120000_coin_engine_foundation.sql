-- Create coin engine foundation tables and policies

-- coin_balances tracks the current coin balance per user
CREATE TABLE IF NOT EXISTS public.coin_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT coin_balances_user_id_key UNIQUE (user_id)
);

-- coin_ledger is an append-only transaction log per user
CREATE TABLE IF NOT EXISTS public.coin_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount bigint NOT NULL,
  entry_type text NOT NULL,
  ref_type text NULL,
  ref_id uuid NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- coin_treasury_ledger tracks platform fee flows in coins
CREATE TABLE IF NOT EXISTS public.coin_treasury_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amount bigint NOT NULL,
  entry_type text NOT NULL,
  ref_type text NULL,
  ref_id uuid NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Helpful treasury view
CREATE OR REPLACE VIEW public.coin_treasury_balance AS
SELECT COALESCE(SUM(amount), 0)::bigint AS balance
FROM public.coin_treasury_ledger;

-- Indexes
CREATE INDEX IF NOT EXISTS coin_ledger_user_created_idx ON public.coin_ledger (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS coin_ledger_ref_idx ON public.coin_ledger (ref_type, ref_id);
CREATE INDEX IF NOT EXISTS coin_treasury_ledger_created_idx ON public.coin_treasury_ledger (created_at DESC);

-- Enable RLS and policies
ALTER TABLE public.coin_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users can read their coin balances"
  ON public.coin_balances
  FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY IF NOT EXISTS "Service role manages coin balances"
  ON public.coin_balances
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

ALTER TABLE public.coin_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users can read their coin ledger"
  ON public.coin_ledger
  FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY IF NOT EXISTS "Service role manages coin ledger"
  ON public.coin_ledger
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

ALTER TABLE public.coin_treasury_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Service role reads coin treasury"
  ON public.coin_treasury_ledger
  FOR SELECT
  USING (auth.role() = 'service_role');
CREATE POLICY IF NOT EXISTS "Service role writes coin treasury"
  ON public.coin_treasury_ledger
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
