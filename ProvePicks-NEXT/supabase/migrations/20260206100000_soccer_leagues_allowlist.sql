-- Soccer Leagues Allowlist Migration
-- Adds enabled column to sports_leagues for public visibility control
-- Adds league_id column to sports_games for filtering

-- ============================================================================
-- 1) ADD ENABLED COLUMN TO sports_leagues
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sports_leagues' 
    AND column_name = 'enabled'
  ) THEN
    ALTER TABLE public.sports_leagues ADD COLUMN enabled BOOLEAN NOT NULL DEFAULT false;
    COMMENT ON COLUMN public.sports_leagues.enabled IS 'Whether this league is enabled for public display';
  END IF;
END $$;

-- Index for filtering enabled leagues
CREATE INDEX IF NOT EXISTS idx_sports_leagues_enabled ON public.sports_leagues(enabled);
CREATE INDEX IF NOT EXISTS idx_sports_leagues_sport_enabled ON public.sports_leagues(sport, enabled);

-- ============================================================================
-- 2) ADD league_id COLUMN TO sports_games
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sports_games' 
    AND column_name = 'league_id'
  ) THEN
    ALTER TABLE public.sports_games ADD COLUMN league_id INTEGER;
    COMMENT ON COLUMN public.sports_games.league_id IS 'API provider league ID (e.g., API-Sports league ID)';
  END IF;
END $$;

-- Index for filtering by league_id
CREATE INDEX IF NOT EXISTS idx_sports_games_league_id ON public.sports_games(league_id);
CREATE INDEX IF NOT EXISTS idx_sports_games_league_league_id ON public.sports_games(league, league_id);

-- ============================================================================
-- 3) SEED TOP SOCCER LEAGUES AS ENABLED
-- API-Sports league IDs for major soccer leagues
-- ============================================================================

-- Insert or update top soccer leagues with enabled=true
-- These IDs match API-Sports soccer (v3.football.api-sports.io)
INSERT INTO public.sports_leagues (sport, api_provider, league_id, name, type, country, season, enabled)
VALUES 
  ('soccer', 'api-sports', 39, 'Premier League', 'League', 'England', '2026', true),
  ('soccer', 'api-sports', 140, 'La Liga', 'League', 'Spain', '2026', true),
  ('soccer', 'api-sports', 135, 'Serie A', 'League', 'Italy', '2026', true),
  ('soccer', 'api-sports', 78, 'Bundesliga', 'League', 'Germany', '2026', true),
  ('soccer', 'api-sports', 61, 'Ligue 1', 'League', 'France', '2026', true),
  ('soccer', 'api-sports', 253, 'Major League Soccer', 'League', 'USA', '2026', true),
  ('soccer', 'api-sports', 2, 'UEFA Champions League', 'Cup', 'World', '2026', true)
ON CONFLICT (api_provider, sport, league_id, season) 
DO UPDATE SET 
  enabled = EXCLUDED.enabled,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  country = EXCLUDED.country,
  updated_at = NOW();

-- ============================================================================
-- 4) GRANT PERMISSIONS FOR UPDATING ENABLED STATUS
-- ============================================================================

-- Allow service role to update enabled status
-- (This is already covered by existing service_role policies, but just in case)

COMMENT ON TABLE public.sports_leagues IS 'Stores league information from API-Sports. enabled=true for public visibility.';
