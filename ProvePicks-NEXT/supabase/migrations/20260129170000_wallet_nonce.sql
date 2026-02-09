-- =====================================================
-- WALLET NONCES TABLE
-- Stores one-time nonces for wallet signature verification
-- =====================================================

CREATE TABLE IF NOT EXISTS public.wallet_nonces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nonce TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    used_at TIMESTAMPTZ NULL
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_wallet_nonces_user_id ON public.wallet_nonces(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_nonces_created_at ON public.wallet_nonces(created_at);

-- Enable RLS
ALTER TABLE public.wallet_nonces ENABLE ROW LEVEL SECURITY;

-- Users can insert their own nonce rows
CREATE POLICY "Users can insert own nonces"
    ON public.wallet_nonces
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Users can select their own nonce rows
CREATE POLICY "Users can select own nonces"
    ON public.wallet_nonces
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Users can update their own nonce rows (mark as used)
CREATE POLICY "Users can update own nonces"
    ON public.wallet_nonces
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Clean up old unused nonces (optional maintenance query)
-- DELETE FROM public.wallet_nonces WHERE used_at IS NULL AND created_at < NOW() - INTERVAL '1 hour';
