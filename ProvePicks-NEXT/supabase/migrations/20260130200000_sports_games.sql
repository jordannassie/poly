-- Sports Games table for storing games across all leagues
-- Unified schema for NFL, NBA, MLB, NHL, Soccer

CREATE TABLE IF NOT EXISTS public.sports_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league TEXT NOT NULL,
  api_game_id INT NOT NULL,
  home_team_id INT,
  away_team_id INT,
  start_time TIMESTAMPTZ,
  status TEXT,
  home_score INT,
  away_score INT,
  season INT,
  raw JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint on league + api_game_id
  CONSTRAINT uq_sports_games_league_api_game_id UNIQUE (league, api_game_id)
);

-- Enable RLS
ALTER TABLE public.sports_games ENABLE ROW LEVEL SECURITY;

-- Public read access for game data
CREATE POLICY "Sports games are publicly readable"
  ON public.sports_games
  FOR SELECT
  TO public
  USING (true);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sports_games_league ON public.sports_games(league);
CREATE INDEX IF NOT EXISTS idx_sports_games_api_game_id ON public.sports_games(api_game_id);
CREATE INDEX IF NOT EXISTS idx_sports_games_start_time ON public.sports_games(start_time);
CREATE INDEX IF NOT EXISTS idx_sports_games_league_start_time ON public.sports_games(league, start_time);
CREATE INDEX IF NOT EXISTS idx_sports_games_home_team_id ON public.sports_games(home_team_id);
CREATE INDEX IF NOT EXISTS idx_sports_games_away_team_id ON public.sports_games(away_team_id);
CREATE INDEX IF NOT EXISTS idx_sports_games_status ON public.sports_games(status);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_sports_games_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sports_games_updated_at ON public.sports_games;
CREATE TRIGGER trigger_sports_games_updated_at
  BEFORE UPDATE ON public.sports_games
  FOR EACH ROW EXECUTE FUNCTION update_sports_games_updated_at();
