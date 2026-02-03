-- Create sports_teams table for all leagues (NFL, NBA, MLB, NHL, Soccer)
-- This table stores team data synced from API-Sports

-- Drop existing table if it has wrong schema
DROP TABLE IF EXISTS public.sports_teams CASCADE;

-- Create the table with correct schema
CREATE TABLE public.sports_teams (
  id BIGINT NOT NULL,                                    -- API-Sports team ID
  league TEXT NOT NULL,                                  -- nfl | nba | mlb | nhl | soccer
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  country TEXT,
  logo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Composite primary key
  PRIMARY KEY (league, id)
);

-- Unique constraint on slug
ALTER TABLE public.sports_teams ADD CONSTRAINT uq_sports_teams_slug UNIQUE (slug);

-- Create indexes
CREATE INDEX idx_sports_teams_league ON public.sports_teams(league);
CREATE INDEX idx_sports_teams_slug ON public.sports_teams(slug);
CREATE INDEX idx_sports_teams_id ON public.sports_teams(id);

-- Enable Row Level Security
ALTER TABLE public.sports_teams ENABLE ROW LEVEL SECURITY;

-- SELECT for anon
CREATE POLICY "sports_teams_select_anon"
  ON public.sports_teams
  FOR SELECT
  TO anon
  USING (true);

-- SELECT for authenticated
CREATE POLICY "sports_teams_select_authenticated"
  ON public.sports_teams
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT for service_role only
CREATE POLICY "sports_teams_insert_service"
  ON public.sports_teams
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- UPDATE for service_role only
CREATE POLICY "sports_teams_update_service"
  ON public.sports_teams
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_sports_teams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sports_teams_updated_at
  BEFORE UPDATE ON public.sports_teams
  FOR EACH ROW
  EXECUTE FUNCTION update_sports_teams_updated_at();

-- Comments
COMMENT ON TABLE public.sports_teams IS 'Teams from all sports leagues synced from API-Sports';
COMMENT ON COLUMN public.sports_teams.id IS 'API-Sports team ID';
COMMENT ON COLUMN public.sports_teams.league IS 'Sport code: nfl, nba, mlb, nhl, soccer';
COMMENT ON COLUMN public.sports_teams.slug IS 'URL-friendly slug for team pages';
COMMENT ON COLUMN public.sports_teams.logo IS 'Team logo URL from API-Sports';
