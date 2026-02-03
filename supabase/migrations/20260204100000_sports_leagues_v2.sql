-- Sports Leagues v2 - Updated schema with api_provider, type, coverage, etc.
-- This migration drops and recreates the sports_leagues table with the correct schema.

-- Drop existing table and dependencies
DROP TRIGGER IF EXISTS trigger_sports_leagues_updated_at ON public.sports_leagues;
DROP FUNCTION IF EXISTS update_sports_leagues_updated_at();
DROP TABLE IF EXISTS public.sports_leagues CASCADE;

-- Create the new table with correct schema
CREATE TABLE IF NOT EXISTS public.sports_leagues (
  id bigserial primary key,
  sport text not null,
  api_provider text not null default 'api-sports',
  league_id integer not null,
  name text not null,
  type text,
  country text,
  country_code text,
  season text,
  logo_url text,
  coverage jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (api_provider, sport, league_id, season)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS sports_leagues_sport_idx ON public.sports_leagues (sport);
CREATE INDEX IF NOT EXISTS sports_leagues_league_id_idx ON public.sports_leagues (league_id);

-- Enable RLS
ALTER TABLE public.sports_leagues ENABLE ROW LEVEL SECURITY;

-- Public read access for league data
CREATE POLICY "Sports leagues are publicly readable"
  ON public.sports_leagues
  FOR SELECT
  TO public
  USING (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_sports_leagues_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sports_leagues_updated_at
  BEFORE UPDATE ON public.sports_leagues
  FOR EACH ROW EXECUTE FUNCTION update_sports_leagues_updated_at();

-- Add comments for documentation
COMMENT ON TABLE public.sports_leagues IS 'Stores league information from API-Sports across all supported sports';
COMMENT ON COLUMN public.sports_leagues.id IS 'Auto-generated primary key';
COMMENT ON COLUMN public.sports_leagues.sport IS 'Sport type: nba, soccer, baseball, nfl, nhl, etc.';
COMMENT ON COLUMN public.sports_leagues.api_provider IS 'Data provider: api-sports, etc.';
COMMENT ON COLUMN public.sports_leagues.league_id IS 'League ID from the API provider';
COMMENT ON COLUMN public.sports_leagues.name IS 'Official league name';
COMMENT ON COLUMN public.sports_leagues.type IS 'League type (e.g., League, Cup)';
COMMENT ON COLUMN public.sports_leagues.country IS 'Country where the league operates';
COMMENT ON COLUMN public.sports_leagues.country_code IS 'ISO country code';
COMMENT ON COLUMN public.sports_leagues.season IS 'Season identifier (e.g., 2024, 2024-2025)';
COMMENT ON COLUMN public.sports_leagues.logo_url IS 'Logo URL from the API provider';
COMMENT ON COLUMN public.sports_leagues.coverage IS 'JSON object describing API coverage for this league';
