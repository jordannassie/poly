-- Sports Leagues table for storing league data from API-Sports
-- Stores leagues across all supported sports (NBA, Soccer, Baseball, etc.)

CREATE TABLE IF NOT EXISTS public.sports_leagues (
  id INT PRIMARY KEY,                          -- API-Sports league ID
  sport TEXT NOT NULL,                         -- Sport type: nba, soccer, baseball, nfl, nhl, etc.
  name TEXT NOT NULL,                          -- League name (e.g., "NBA", "Premier League")
  country TEXT,                                -- Country (e.g., "USA", "England")
  season INT,                                  -- Current/active season year
  logo TEXT,                                   -- Logo URL from API-Sports
  active BOOLEAN NOT NULL DEFAULT true,        -- Whether the league is active
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.sports_leagues ENABLE ROW LEVEL SECURITY;

-- Public read access for league data
CREATE POLICY "Sports leagues are publicly readable"
  ON public.sports_leagues
  FOR SELECT
  TO public
  USING (true);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sports_leagues_sport ON public.sports_leagues(sport);
CREATE INDEX IF NOT EXISTS idx_sports_leagues_active ON public.sports_leagues(active);
CREATE INDEX IF NOT EXISTS idx_sports_leagues_sport_active ON public.sports_leagues(sport, active);
CREATE INDEX IF NOT EXISTS idx_sports_leagues_country ON public.sports_leagues(country);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_sports_leagues_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sports_leagues_updated_at ON public.sports_leagues;
CREATE TRIGGER trigger_sports_leagues_updated_at
  BEFORE UPDATE ON public.sports_leagues
  FOR EACH ROW EXECUTE FUNCTION update_sports_leagues_updated_at();

-- Add comments for documentation
COMMENT ON TABLE public.sports_leagues IS 'Stores league information from API-Sports across all supported sports';
COMMENT ON COLUMN public.sports_leagues.id IS 'API-Sports league ID (primary key)';
COMMENT ON COLUMN public.sports_leagues.sport IS 'Sport type: nba, soccer, baseball, nfl, nhl, etc.';
COMMENT ON COLUMN public.sports_leagues.name IS 'Official league name';
COMMENT ON COLUMN public.sports_leagues.country IS 'Country where the league operates';
COMMENT ON COLUMN public.sports_leagues.season IS 'Current or most recent season year';
COMMENT ON COLUMN public.sports_leagues.logo IS 'Logo URL from API-Sports';
COMMENT ON COLUMN public.sports_leagues.active IS 'Whether the league is currently active';
