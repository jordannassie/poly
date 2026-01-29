-- =====================================================
-- ADMIN FOUNDATION MIGRATION
-- ProvePicks Admin Console Tables
-- =====================================================

-- 1) system_events (admin visible logs)
CREATE TABLE IF NOT EXISTS public.system_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info',  -- info|warn|error
    actor_user_id UUID NULL REFERENCES auth.users(id),
    actor_wallet TEXT NULL,
    entity_type TEXT NULL,  -- 'market'|'payout'|'user'|'wallet'|'cache'
    entity_id TEXT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_events_created_at ON public.system_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_events_event_type ON public.system_events(event_type);
CREATE INDEX IF NOT EXISTS idx_system_events_severity ON public.system_events(severity);

-- 2) wallet_connections
CREATE TABLE IF NOT EXISTS public.wallet_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    chain TEXT NOT NULL DEFAULT 'solana',
    wallet_address TEXT NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    "primary" BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NULL,
    
    CONSTRAINT wallet_connections_chain_address_unique UNIQUE (chain, wallet_address)
);

CREATE INDEX IF NOT EXISTS idx_wallet_connections_user_id ON public.wallet_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_connections_wallet_address ON public.wallet_connections(wallet_address);

-- 3) markets (maps to SportsDataIO game ids)
CREATE TABLE IF NOT EXISTS public.markets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    league TEXT NOT NULL,
    sportsdata_game_id BIGINT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    home_team TEXT NOT NULL,
    away_team TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    game_status TEXT NOT NULL DEFAULT 'scheduled',  -- scheduled|live|final
    market_status TEXT NOT NULL DEFAULT 'open',      -- open|paused|settling|settled|void
    final_outcome TEXT NULL,                         -- 'HOME'|'AWAY'|'DRAW' etc
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT markets_league_game_unique UNIQUE (league, sportsdata_game_id)
);

CREATE INDEX IF NOT EXISTS idx_markets_league ON public.markets(league);
CREATE INDEX IF NOT EXISTS idx_markets_market_status ON public.markets(market_status);
CREATE INDEX IF NOT EXISTS idx_markets_start_time ON public.markets(start_time);

-- 4) ledger_entries (append-only accounting)
CREATE TABLE IF NOT EXISTS public.ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    market_id UUID NULL REFERENCES public.markets(id),
    entry_type TEXT NOT NULL,   -- deposit|withdrawal|trade_lock|trade_release|payout|fee|adjustment
    direction TEXT NOT NULL,    -- credit|debit
    amount NUMERIC(18,6) NOT NULL CHECK (amount >= 0),
    currency TEXT NOT NULL DEFAULT 'USDC',
    reference_id TEXT NULL,     -- external tx signature or internal reference
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_user_id ON public.ledger_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_created_at ON public.ledger_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_market_id ON public.ledger_entries(market_id);

-- 5) settlements
CREATE TABLE IF NOT EXISTS public.settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_id UUID NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE UNIQUE,
    outcome TEXT NOT NULL,
    settled_by TEXT NOT NULL DEFAULT 'system',  -- system|admin
    settled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    meta JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_settlements_market_id ON public.settlements(market_id);
CREATE INDEX IF NOT EXISTS idx_settlements_settled_at ON public.settlements(settled_at DESC);

-- 6) payouts
CREATE TABLE IF NOT EXISTS public.payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    market_id UUID NULL REFERENCES public.markets(id),
    amount NUMERIC(18,6) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USDC',
    destination_wallet TEXT NULL,
    status TEXT NOT NULL DEFAULT 'queued',  -- queued|sent|failed|canceled
    tx_signature TEXT NULL,
    error TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_payouts_user_id ON public.payouts(user_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON public.payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_created_at ON public.payouts(created_at DESC);

-- updated_at trigger for markets
CREATE OR REPLACE FUNCTION public.handle_markets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_markets_updated_at ON public.markets;
CREATE TRIGGER set_markets_updated_at
    BEFORE UPDATE ON public.markets
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_markets_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

-- system_events: No public access (admin only via service role)
-- No policies = no access for anon/authenticated

-- wallet_connections: Users can manage their own
DROP POLICY IF EXISTS "Users can view own wallets" ON public.wallet_connections;
CREATE POLICY "Users can view own wallets"
    ON public.wallet_connections
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own wallets" ON public.wallet_connections;
CREATE POLICY "Users can insert own wallets"
    ON public.wallet_connections
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own wallets" ON public.wallet_connections;
CREATE POLICY "Users can update own wallets"
    ON public.wallet_connections
    FOR UPDATE
    USING (auth.uid() = user_id);

-- markets: Public read for open markets
DROP POLICY IF EXISTS "Public can view markets" ON public.markets;
CREATE POLICY "Public can view markets"
    ON public.markets
    FOR SELECT
    USING (true);

-- ledger_entries: Users can view their own
DROP POLICY IF EXISTS "Users can view own ledger" ON public.ledger_entries;
CREATE POLICY "Users can view own ledger"
    ON public.ledger_entries
    FOR SELECT
    USING (auth.uid() = user_id);

-- settlements: Public read (for displaying results)
DROP POLICY IF EXISTS "Public can view settlements" ON public.settlements;
CREATE POLICY "Public can view settlements"
    ON public.settlements
    FOR SELECT
    USING (true);

-- payouts: Users can view their own
DROP POLICY IF EXISTS "Users can view own payouts" ON public.payouts;
CREATE POLICY "Users can view own payouts"
    ON public.payouts
    FOR SELECT
    USING (auth.uid() = user_id);

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.markets TO anon, authenticated;
GRANT SELECT ON public.settlements TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.wallet_connections TO authenticated;
GRANT SELECT ON public.ledger_entries TO authenticated;
GRANT SELECT ON public.payouts TO authenticated;
