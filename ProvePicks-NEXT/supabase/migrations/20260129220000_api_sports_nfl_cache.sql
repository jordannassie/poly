-- API-Sports NFL Teams cache table
-- Drop existing table if structure changed
DROP TABLE IF EXISTS public.api_sports_nfl_teams CASCADE;

CREATE TABLE public.api_sports_nfl_teams (
  team_id INT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT,
  city TEXT,
  logo TEXT,
  raw JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- API-Sports NFL Games cache table
DROP TABLE IF EXISTS public.api_sports_nfl_games CASCADE;

CREATE TABLE public.api_sports_nfl_games (
  game_id INT PRIMARY KEY,
  game_date TIMESTAMPTZ,
  status TEXT,
  league_id INT,
  season INT,
  home_team_id INT,
  away_team_id INT,
  home_score INT,
  away_score INT,
  raw JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on both tables
ALTER TABLE public.api_sports_nfl_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_sports_nfl_games ENABLE ROW LEVEL SECURITY;

-- No public policies - server-only access via service role

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_api_sports_nfl_games_game_date ON public.api_sports_nfl_games(game_date);
CREATE INDEX IF NOT EXISTS idx_api_sports_nfl_games_season ON public.api_sports_nfl_games(season);
CREATE INDEX IF NOT EXISTS idx_api_sports_nfl_games_home_team_id ON public.api_sports_nfl_games(home_team_id);
CREATE INDEX IF NOT EXISTS idx_api_sports_nfl_games_away_team_id ON public.api_sports_nfl_games(away_team_id);

-- Trigger function to update updated_at
CREATE OR REPLACE FUNCTION update_api_sports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS trigger_api_sports_nfl_teams_updated_at ON public.api_sports_nfl_teams;
CREATE TRIGGER trigger_api_sports_nfl_teams_updated_at
  BEFORE UPDATE ON public.api_sports_nfl_teams
  FOR EACH ROW EXECUTE FUNCTION update_api_sports_updated_at();

DROP TRIGGER IF EXISTS trigger_api_sports_nfl_games_updated_at ON public.api_sports_nfl_games;
CREATE TRIGGER trigger_api_sports_nfl_games_updated_at
  BEFORE UPDATE ON public.api_sports_nfl_games
  FOR EACH ROW EXECUTE FUNCTION update_api_sports_updated_at();
