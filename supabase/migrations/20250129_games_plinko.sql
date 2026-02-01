-- Games Plinko Tables Migration
-- Creates tables for provably fair Plinko game with treasury management

-- =============================================================================
-- GAMES TREASURY
-- Tracks the house bankroll for games. Only one row should exist.
-- =============================================================================
CREATE TABLE IF NOT EXISTS game_treasury (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  total_wagered DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  total_paid_out DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  total_profit DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  play_count BIGINT NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert initial treasury row with seed funding
INSERT INTO game_treasury (balance) VALUES (1000.00)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- GAME BALANCES
-- User balances for games (separate from trading balances)
-- =============================================================================
CREATE TABLE IF NOT EXISTS game_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  total_deposited DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  total_withdrawn DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  total_wagered DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  total_won DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  play_count BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- =============================================================================
-- PLINKO SESSIONS
-- Tracks provably fair sessions (server seed + client seed pairs)
-- =============================================================================
CREATE TABLE IF NOT EXISTS plinko_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  server_seed TEXT NOT NULL,
  server_seed_hash TEXT NOT NULL,
  client_seed TEXT NOT NULL,
  nonce INTEGER NOT NULL DEFAULT 0,
  revealed BOOLEAN NOT NULL DEFAULT FALSE,
  revealed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for finding active sessions
CREATE INDEX IF NOT EXISTS idx_plinko_sessions_user_active 
  ON plinko_sessions(user_id, revealed) 
  WHERE revealed = FALSE;

-- =============================================================================
-- PLINKO PLAYS
-- Records every play for audit and verification
-- =============================================================================
CREATE TABLE IF NOT EXISTS plinko_plays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES plinko_sessions(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('low', 'medium', 'high')),
  bet_amount DECIMAL(10, 2) NOT NULL,
  slot INTEGER NOT NULL CHECK (slot >= 0 AND slot <= 16),
  multiplier DECIMAL(6, 2) NOT NULL,
  payout DECIMAL(12, 2) NOT NULL,
  profit DECIMAL(12, 2) NOT NULL,
  server_seed_hash TEXT NOT NULL,
  client_seed TEXT NOT NULL,
  nonce INTEGER NOT NULL,
  outcome_hex TEXT NOT NULL,
  random_float DECIMAL(20, 18) NOT NULL,
  treasury_balance_before DECIMAL(12, 2) NOT NULL,
  treasury_balance_after DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for queries
CREATE INDEX IF NOT EXISTS idx_plinko_plays_user ON plinko_plays(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plinko_plays_session ON plinko_plays(session_id);
CREATE INDEX IF NOT EXISTS idx_plinko_plays_created ON plinko_plays(created_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE game_treasury ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE plinko_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE plinko_plays ENABLE ROW LEVEL SECURITY;

-- Treasury: No direct user access (server only via service role)
-- No policies = no access for anon/authenticated roles

-- Game Balances: Users can read their own balance
CREATE POLICY "Users can view own game balance" ON game_balances
  FOR SELECT USING (auth.uid() = user_id);

-- Plinko Sessions: Users can view their own sessions
CREATE POLICY "Users can view own plinko sessions" ON plinko_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- Plinko Plays: Users can view their own plays
CREATE POLICY "Users can view own plinko plays" ON plinko_plays
  FOR SELECT USING (auth.uid() = user_id);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function to safely execute a plinko play atomically
CREATE OR REPLACE FUNCTION execute_plinko_play(
  p_user_id UUID,
  p_session_id UUID,
  p_mode TEXT,
  p_bet_amount DECIMAL,
  p_slot INTEGER,
  p_multiplier DECIMAL,
  p_payout DECIMAL,
  p_server_seed_hash TEXT,
  p_client_seed TEXT,
  p_nonce INTEGER,
  p_outcome_hex TEXT,
  p_random_float DECIMAL
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_treasury_before DECIMAL;
  v_treasury_after DECIMAL;
  v_user_balance DECIMAL;
  v_profit DECIMAL;
  v_play_id UUID;
BEGIN
  -- Lock treasury row for update
  SELECT balance INTO v_treasury_before
  FROM game_treasury
  FOR UPDATE;
  
  IF v_treasury_before IS NULL THEN
    RAISE EXCEPTION 'Treasury not found';
  END IF;
  
  -- Calculate profit (can be negative for house)
  v_profit := p_payout - p_bet_amount;
  
  -- Calculate new treasury balance
  -- Treasury gains bet, loses payout
  v_treasury_after := v_treasury_before + p_bet_amount - p_payout;
  
  -- Final safety check: treasury cannot go negative
  IF v_treasury_after < 0 THEN
    RAISE EXCEPTION 'Insufficient treasury balance';
  END IF;
  
  -- Get or create user game balance
  INSERT INTO game_balances (user_id, balance)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  SELECT balance INTO v_user_balance
  FROM game_balances
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  -- Check user has enough balance
  IF v_user_balance < p_bet_amount THEN
    RAISE EXCEPTION 'Insufficient user balance';
  END IF;
  
  -- Update treasury
  UPDATE game_treasury SET
    balance = v_treasury_after,
    total_wagered = total_wagered + p_bet_amount,
    total_paid_out = total_paid_out + p_payout,
    total_profit = total_profit + (p_bet_amount - p_payout),
    play_count = play_count + 1,
    last_updated = NOW();
  
  -- Update user balance
  UPDATE game_balances SET
    balance = balance - p_bet_amount + p_payout,
    total_wagered = total_wagered + p_bet_amount,
    total_won = total_won + p_payout,
    play_count = play_count + 1,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Update session nonce
  UPDATE plinko_sessions SET
    nonce = p_nonce + 1
  WHERE id = p_session_id;
  
  -- Record the play
  INSERT INTO plinko_plays (
    user_id, session_id, mode, bet_amount, slot, multiplier, payout, profit,
    server_seed_hash, client_seed, nonce, outcome_hex, random_float,
    treasury_balance_before, treasury_balance_after
  ) VALUES (
    p_user_id, p_session_id, p_mode, p_bet_amount, p_slot, p_multiplier, p_payout, v_profit,
    p_server_seed_hash, p_client_seed, p_nonce, p_outcome_hex, p_random_float,
    v_treasury_before, v_treasury_after
  )
  RETURNING id INTO v_play_id;
  
  -- Return result
  RETURN json_build_object(
    'success', true,
    'play_id', v_play_id,
    'treasury_balance', v_treasury_after,
    'user_balance', v_user_balance - p_bet_amount + p_payout
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Fail closed - return error, no state changes
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Function to get current treasury balance (for API)
CREATE OR REPLACE FUNCTION get_treasury_balance()
RETURNS DECIMAL
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT balance FROM game_treasury LIMIT 1;
$$;

-- Function to add game balance (for demo credits)
CREATE OR REPLACE FUNCTION add_game_balance(p_user_id UUID, p_amount DECIMAL)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance DECIMAL;
BEGIN
  INSERT INTO game_balances (user_id, balance, total_deposited)
  VALUES (p_user_id, p_amount, p_amount)
  ON CONFLICT (user_id) DO UPDATE SET
    balance = game_balances.balance + p_amount,
    total_deposited = game_balances.total_deposited + p_amount,
    updated_at = NOW()
  RETURNING balance INTO v_new_balance;
  
  RETURN v_new_balance;
END;
$$;

-- Function to reveal a session's server seed
CREATE OR REPLACE FUNCTION reveal_plinko_session(p_session_id UUID, p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session plinko_sessions;
BEGIN
  SELECT * INTO v_session
  FROM plinko_sessions
  WHERE id = p_session_id AND user_id = p_user_id;
  
  IF v_session IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Session not found');
  END IF;
  
  IF v_session.revealed THEN
    RETURN json_build_object(
      'success', true,
      'server_seed', v_session.server_seed,
      'already_revealed', true
    );
  END IF;
  
  UPDATE plinko_sessions SET
    revealed = TRUE,
    revealed_at = NOW()
  WHERE id = p_session_id;
  
  RETURN json_build_object(
    'success', true,
    'server_seed', v_session.server_seed,
    'already_revealed', false
  );
END;
$$;
