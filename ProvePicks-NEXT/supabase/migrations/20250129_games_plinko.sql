-- Games Plinko Tables Migration
-- LOSS-FUNDED POOL MODEL
-- 
-- CRITICAL SAFETY INVARIANTS:
-- 1. Pool starts at $0.00 and can NEVER go negative
-- 2. All payouts are funded by previous losses
-- 3. Max payout limited by current pool balance minus reserved liability
-- 4. Atomic transactions with row locking for race safety

-- =============================================================================
-- GAMES POOL (Loss-Funded Treasury)
-- The ONLY source of payouts. Starts at $0.00.
-- =============================================================================
CREATE TABLE IF NOT EXISTS games_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  balance DECIMAL(14, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
  reserved_liability DECIMAL(14, 2) NOT NULL DEFAULT 0.00 CHECK (reserved_liability >= 0),
  safety_buffer DECIMAL(14, 2) NOT NULL DEFAULT 0.00 CHECK (safety_buffer >= 0),
  total_bets_received DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
  total_payouts_made DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
  total_profit DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
  play_count BIGINT NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Invariant: available = balance - reserved_liability - safety_buffer >= 0
  CONSTRAINT pool_solvency CHECK (balance >= reserved_liability + safety_buffer)
);

-- Insert initial pool row with $0.00 balance
INSERT INTO games_pool (balance, reserved_liability, safety_buffer) 
VALUES (0.00, 0.00, 0.00)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- GAME BALANCES
-- User balances for games (separate from trading balances)
-- =============================================================================
CREATE TABLE IF NOT EXISTS game_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
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
  bet_amount DECIMAL(10, 2) NOT NULL CHECK (bet_amount > 0),
  max_potential_payout DECIMAL(12, 2) NOT NULL,
  slot INTEGER NOT NULL CHECK (slot >= 0 AND slot <= 16),
  multiplier DECIMAL(6, 2) NOT NULL,
  actual_payout DECIMAL(12, 2) NOT NULL,
  profit DECIMAL(12, 2) NOT NULL,
  server_seed_hash TEXT NOT NULL,
  client_seed TEXT NOT NULL,
  nonce INTEGER NOT NULL,
  outcome_hex TEXT NOT NULL,
  random_float DECIMAL(20, 18) NOT NULL,
  pool_balance_before DECIMAL(14, 2) NOT NULL,
  pool_balance_after DECIMAL(14, 2) NOT NULL,
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
ALTER TABLE games_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE plinko_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE plinko_plays ENABLE ROW LEVEL SECURITY;

-- Pool: No direct user access (server only via service role)
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

-- Function to get pool status (public info, no secrets)
CREATE OR REPLACE FUNCTION get_pool_status()
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT json_build_object(
    'balance', balance,
    'reserved_liability', reserved_liability,
    'safety_buffer', safety_buffer,
    'available_to_pay', GREATEST(0, balance - reserved_liability - safety_buffer),
    'total_bets', total_bets_received,
    'total_payouts', total_payouts_made,
    'total_profit', total_profit,
    'play_count', play_count
  )
  FROM games_pool
  LIMIT 1;
$$;

-- =============================================================================
-- ATOMIC PLINKO PLAY EXECUTION
-- 
-- This function executes a play with full atomicity and safety:
-- 1. Lock pool row
-- 2. Verify solvency (pool can cover max payout)
-- 3. Reserve liability (hold for max payout)
-- 4. Add bet to pool
-- 5. Compute outcome (passed in from server)
-- 6. Pay actual payout
-- 7. Release liability hold
-- 8. Update all stats
-- 
-- If ANY step fails, the entire transaction rolls back.
-- =============================================================================
CREATE OR REPLACE FUNCTION execute_plinko_play_atomic(
  p_user_id UUID,
  p_session_id UUID,
  p_mode TEXT,
  p_bet_amount DECIMAL,
  p_max_multiplier DECIMAL,
  p_slot INTEGER,
  p_actual_multiplier DECIMAL,
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
  v_pool_balance DECIMAL;
  v_reserved_liability DECIMAL;
  v_safety_buffer DECIMAL;
  v_available_to_pay DECIMAL;
  v_max_payout DECIMAL;
  v_actual_payout DECIMAL;
  v_new_pool_balance DECIMAL;
  v_user_balance DECIMAL;
  v_profit DECIMAL;
  v_play_id UUID;
BEGIN
  -- ========================================
  -- STEP 1: Lock pool and get current state
  -- ========================================
  SELECT balance, reserved_liability, safety_buffer
  INTO v_pool_balance, v_reserved_liability, v_safety_buffer
  FROM games_pool
  FOR UPDATE; -- Row lock prevents race conditions
  
  IF v_pool_balance IS NULL THEN
    RAISE EXCEPTION 'Games pool not initialized';
  END IF;
  
  -- ========================================
  -- STEP 2: Calculate max payout and verify solvency
  -- ========================================
  v_max_payout := p_bet_amount * p_max_multiplier;
  v_available_to_pay := v_pool_balance - v_reserved_liability - v_safety_buffer;
  
  -- CRITICAL: Check pool can cover max possible payout
  IF v_max_payout > v_available_to_pay THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient pool balance for this bet. Pool cannot cover max payout.',
      'available', v_available_to_pay,
      'required', v_max_payout
    );
  END IF;
  
  -- ========================================
  -- STEP 3: Get or create user balance and verify funds
  -- ========================================
  INSERT INTO game_balances (user_id, balance)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  SELECT balance INTO v_user_balance
  FROM game_balances
  WHERE user_id = p_user_id
  FOR UPDATE; -- Lock user balance row
  
  IF v_user_balance < p_bet_amount THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient user balance',
      'user_balance', v_user_balance,
      'required', p_bet_amount
    );
  END IF;
  
  -- ========================================
  -- STEP 4: Reserve liability (hold for max payout)
  -- This ensures concurrent plays don't overcommit
  -- ========================================
  UPDATE games_pool SET
    reserved_liability = reserved_liability + v_max_payout
  WHERE id = (SELECT id FROM games_pool LIMIT 1);
  
  -- ========================================
  -- STEP 5: Debit user and credit pool (bet goes to pool FIRST)
  -- ========================================
  UPDATE game_balances SET
    balance = balance - p_bet_amount
  WHERE user_id = p_user_id;
  
  UPDATE games_pool SET
    balance = balance + p_bet_amount,
    total_bets_received = total_bets_received + p_bet_amount
  WHERE id = (SELECT id FROM games_pool LIMIT 1);
  
  -- ========================================
  -- STEP 6: Calculate actual payout and profit
  -- Outcome already computed by server (passed in)
  -- ========================================
  v_actual_payout := ROUND(p_bet_amount * p_actual_multiplier, 2);
  v_profit := v_actual_payout - p_bet_amount;
  
  -- ========================================
  -- STEP 7: Pay user from pool
  -- ========================================
  UPDATE game_balances SET
    balance = balance + v_actual_payout,
    total_wagered = total_wagered + p_bet_amount,
    total_won = total_won + v_actual_payout,
    play_count = play_count + 1,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Get new pool balance after payout
  v_new_pool_balance := v_pool_balance + p_bet_amount - v_actual_payout;
  
  UPDATE games_pool SET
    balance = v_new_pool_balance,
    reserved_liability = reserved_liability - v_max_payout, -- Release hold
    total_payouts_made = total_payouts_made + v_actual_payout,
    total_profit = total_profit + (p_bet_amount - v_actual_payout),
    play_count = play_count + 1,
    last_updated = NOW()
  WHERE id = (SELECT id FROM games_pool LIMIT 1);
  
  -- ========================================
  -- STEP 8: Update session nonce
  -- ========================================
  UPDATE plinko_sessions SET
    nonce = p_nonce + 1
  WHERE id = p_session_id;
  
  -- ========================================
  -- STEP 9: Record the play
  -- ========================================
  INSERT INTO plinko_plays (
    user_id, session_id, mode, bet_amount, max_potential_payout,
    slot, multiplier, actual_payout, profit,
    server_seed_hash, client_seed, nonce, outcome_hex, random_float,
    pool_balance_before, pool_balance_after
  ) VALUES (
    p_user_id, p_session_id, p_mode, p_bet_amount, v_max_payout,
    p_slot, p_actual_multiplier, v_actual_payout, v_profit,
    p_server_seed_hash, p_client_seed, p_nonce, p_outcome_hex, p_random_float,
    v_pool_balance, v_new_pool_balance
  )
  RETURNING id INTO v_play_id;
  
  -- ========================================
  -- STEP 10: Get final user balance and return
  -- ========================================
  SELECT balance INTO v_user_balance
  FROM game_balances
  WHERE user_id = p_user_id;
  
  RETURN json_build_object(
    'success', true,
    'play_id', v_play_id,
    'slot', p_slot,
    'multiplier', p_actual_multiplier,
    'payout', v_actual_payout,
    'profit', v_profit,
    'user_balance', v_user_balance,
    'pool_balance', v_new_pool_balance
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Fail closed - return error, transaction auto-rolls back
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- =============================================================================
-- ADMIN FUNCTIONS (for treasury management)
-- =============================================================================

-- Function to add funds to pool (admin only, via service role)
CREATE OR REPLACE FUNCTION add_pool_funds(p_amount DECIMAL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance DECIMAL;
BEGIN
  IF p_amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Amount must be positive');
  END IF;
  
  UPDATE games_pool SET
    balance = balance + p_amount,
    last_updated = NOW()
  WHERE id = (SELECT id FROM games_pool LIMIT 1)
  RETURNING balance INTO v_new_balance;
  
  RETURN json_build_object('success', true, 'new_balance', v_new_balance);
END;
$$;

-- Function to withdraw from pool (only free funds, not reserved)
CREATE OR REPLACE FUNCTION withdraw_pool_funds(p_amount DECIMAL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance DECIMAL;
  v_reserved DECIMAL;
  v_buffer DECIMAL;
  v_free_funds DECIMAL;
  v_new_balance DECIMAL;
BEGIN
  IF p_amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Amount must be positive');
  END IF;
  
  SELECT balance, reserved_liability, safety_buffer
  INTO v_balance, v_reserved, v_buffer
  FROM games_pool
  FOR UPDATE;
  
  v_free_funds := v_balance - v_reserved - v_buffer;
  
  IF p_amount > v_free_funds THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Cannot withdraw more than free funds',
      'free_funds', v_free_funds,
      'requested', p_amount
    );
  END IF;
  
  UPDATE games_pool SET
    balance = balance - p_amount,
    last_updated = NOW()
  WHERE id = (SELECT id FROM games_pool LIMIT 1)
  RETURNING balance INTO v_new_balance;
  
  RETURN json_build_object('success', true, 'new_balance', v_new_balance, 'withdrawn', p_amount);
END;
$$;

-- =============================================================================
-- USER BALANCE FUNCTIONS
-- =============================================================================

-- Function to add user game balance (for deposits/demo credits)
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
