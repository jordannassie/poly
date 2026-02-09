-- =====================================================
-- WALLET LOGIN NONCES TABLE
-- Stores one-time nonces for wallet-first authentication
-- (login/signup via Phantom without existing session)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.wallet_login_nonces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT NOT NULL,
    nonce TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    used_at TIMESTAMPTZ NULL,
    
    CONSTRAINT wallet_login_nonces_address_nonce_unique UNIQUE (wallet_address, nonce)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_wallet_login_nonces_wallet_address ON public.wallet_login_nonces(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallet_login_nonces_created_at ON public.wallet_login_nonces(created_at);

-- Enable RLS - no public access, server-only via service role
ALTER TABLE public.wallet_login_nonces ENABLE ROW LEVEL SECURITY;

-- No policies = no access for anon/authenticated
-- Only service role can access this table
