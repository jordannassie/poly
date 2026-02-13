-- Create coin_positions table and atomic trade helper

-- coin_positions tracks user coin bets/picks for display in the portfolio
CREATE TABLE IF NOT EXISTS public.coin_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  market_id text NOT NULL,
  side text NOT NULL,
  amount_coins bigint NOT NULL,
  status text NOT NULL DEFAULT 'open',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coin_positions_user_id ON public.coin_positions (user_id);
CREATE INDEX IF NOT EXISTS idx_coin_positions_market_id ON public.coin_positions (market_id);

ALTER TABLE public.coin_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can read their own coin positions"
  ON public.coin_positions
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Service role manages coin positions"
  ON public.coin_positions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Atomic coin trade helper that debits coins, logs ledger, and creates a position
CREATE OR REPLACE FUNCTION public.process_coin_trade(
  p_user_id uuid,
  p_market_id text,
  p_side text,
  p_amount bigint,
  p_market_title text,
  p_market_slug text
) RETURNS TABLE(new_balance bigint, position_id uuid)
LANGUAGE plpgsql
AS $$
DECLARE
  current_balance bigint;
  position_uuid uuid;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_TRADE_AMOUNT';
  END IF;

  SELECT balance INTO current_balance
  FROM public.coin_balances
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF current_balance IS NULL THEN
    INSERT INTO public.coin_balances (user_id, balance)
    VALUES (p_user_id, 0);
    current_balance := 0;
  END IF;

  IF current_balance < p_amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE';
  END IF;

  UPDATE public.coin_balances
  SET balance = current_balance - p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  INSERT INTO public.coin_ledger (
    user_id,
    amount,
    entry_type,
    ref_type,
    ref_id,
    meta,
    created_at
  ) VALUES (
    p_user_id,
    -p_amount,
    'BET_LOCK',
    'MARKET',
    NULL,
    json_build_object(
      'market_id', p_market_id,
      'side', p_side,
      'market_title', p_market_title,
      'market_slug', p_market_slug
    ),
    NOW()
  );

  INSERT INTO public.coin_positions (
    user_id,
    market_id,
    side,
    amount_coins,
    meta
  ) VALUES (
    p_user_id,
    p_market_id,
    p_side,
    p_amount,
    json_build_object(
      'market_title', p_market_title,
      'market_slug', p_market_slug
    )
  )
  RETURNING id INTO position_uuid;

  new_balance := current_balance - p_amount;
  RETURN QUERY SELECT new_balance, position_uuid;
END;
$$;
