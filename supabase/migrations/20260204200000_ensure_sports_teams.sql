-- Ensure sports_teams table exists with all required columns
-- This migration is idempotent - safe to run multiple times

-- Create table if not exists (full schema)
CREATE TABLE IF NOT EXISTS public.sports_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league TEXT NOT NULL,                              -- nfl | nba | mlb | nhl | soccer
  api_team_id INT NOT NULL,                          -- API-Sports team ID
  name TEXT NOT NULL,
  slug TEXT,                                         -- URL-friendly slug
  country TEXT,                                      -- Country name
  logo_path TEXT,                                    -- Supabase storage path for cached logo
  logo_url_original TEXT,                            -- Original logo URL from API
  league_id INT,                                     -- FK to sports_leagues.league_id
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint on league + api_team_id
  CONSTRAINT uq_sports_teams_league_api_team_id UNIQUE (league, api_team_id)
);

-- Add missing columns if table already exists
DO $$ 
BEGIN
  -- Add slug column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'sports_teams' 
                 AND column_name = 'slug') THEN
    ALTER TABLE public.sports_teams ADD COLUMN slug TEXT;
  END IF;

  -- Add country column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'sports_teams' 
                 AND column_name = 'country') THEN
    ALTER TABLE public.sports_teams ADD COLUMN country TEXT;
  END IF;

  -- Add created_at column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'sports_teams' 
                 AND column_name = 'created_at') THEN
    ALTER TABLE public.sports_teams ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;

  -- Add league_id column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'sports_teams' 
                 AND column_name = 'league_id') THEN
    ALTER TABLE public.sports_teams ADD COLUMN league_id INT;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.sports_teams ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Sports teams are publicly readable" ON public.sports_teams;
DROP POLICY IF EXISTS "Sports teams select for anon" ON public.sports_teams;
DROP POLICY IF EXISTS "Sports teams select for authenticated" ON public.sports_teams;
DROP POLICY IF EXISTS "Sports teams insert for service" ON public.sports_teams;
DROP POLICY IF EXISTS "Sports teams update for service" ON public.sports_teams;

-- Read access for anon and authenticated
CREATE POLICY "Sports teams select for anon"
  ON public.sports_teams
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Sports teams select for authenticated"
  ON public.sports_teams
  FOR SELECT
  TO authenticated
  USING (true);

-- Write access for service role only
CREATE POLICY "Sports teams insert for service"
  ON public.sports_teams
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Sports teams update for service"
  ON public.sports_teams
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create indexes (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_sports_teams_league ON public.sports_teams(league);
CREATE INDEX IF NOT EXISTS idx_sports_teams_api_team_id ON public.sports_teams(api_team_id);
CREATE INDEX IF NOT EXISTS idx_sports_teams_league_api_team_id ON public.sports_teams(league, api_team_id);
CREATE INDEX IF NOT EXISTS idx_sports_teams_slug ON public.sports_teams(slug);
CREATE INDEX IF NOT EXISTS idx_sports_teams_league_id ON public.sports_teams(league_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_sports_teams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sports_teams_updated_at ON public.sports_teams;
CREATE TRIGGER trigger_sports_teams_updated_at
  BEFORE UPDATE ON public.sports_teams
  FOR EACH ROW EXECUTE FUNCTION update_sports_teams_updated_at();

-- Add comments
COMMENT ON TABLE public.sports_teams IS 'Teams from all sports leagues - synced from API-Sports';
COMMENT ON COLUMN public.sports_teams.league IS 'Sport/league code: NFL, NBA, MLB, NHL, SOCCER';
COMMENT ON COLUMN public.sports_teams.api_team_id IS 'Team ID from API-Sports';
COMMENT ON COLUMN public.sports_teams.slug IS 'URL-friendly slug for team pages';
COMMENT ON COLUMN public.sports_teams.logo_path IS 'Supabase storage path for cached team logo';
COMMENT ON COLUMN public.sports_teams.logo_url_original IS 'Original logo URL from API-Sports';
COMMENT ON COLUMN public.sports_teams.league_id IS 'League ID from API-Sports (references sports_leagues.league_id)';
