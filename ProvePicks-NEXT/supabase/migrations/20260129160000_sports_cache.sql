-- =====================================================
-- SPORTS CACHE TABLE
-- Persistent cache for SportsDataIO data
-- Ensures reliable imports on serverless platforms
-- =====================================================

CREATE TABLE IF NOT EXISTS public.sports_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL DEFAULT 'sportsdataio',
    league TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    cache_date DATE NULL,
    cache_key TEXT NOT NULL UNIQUE,  -- format: provider:league:endpoint:YYYY-MM-DD
    payload JSONB NOT NULL,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NULL,
    status TEXT NOT NULL DEFAULT 'ok',
    error TEXT NULL
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_sports_cache_cache_key ON public.sports_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_sports_cache_league_endpoint ON public.sports_cache(league, endpoint);
CREATE INDEX IF NOT EXISTS idx_sports_cache_expires_at ON public.sports_cache(expires_at);

-- Enable RLS
ALTER TABLE public.sports_cache ENABLE ROW LEVEL SECURITY;

-- No public access policies - only service role can access
-- This ensures the table is only accessible server-side via service role key

-- Grant usage to service role (implicitly has full access)
-- No grants to anon or authenticated - they should not access this table
