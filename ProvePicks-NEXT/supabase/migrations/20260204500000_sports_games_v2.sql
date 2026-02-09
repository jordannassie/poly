-- Sports Games table v2
-- Unified schema for all leagues without foreign keys
-- This replaces the previous sports_games table with a cleaner schema

-- Drop existing table and recreate with new schema
DROP TABLE IF EXISTS public.sports_games CASCADE;

CREATE TABLE public.sports_games (
  id BIGSERIAL PRIMARY KEY,
  league TEXT NOT NULL,  -- 'nfl', 'nba', 'mlb', 'nhl', 'soccer'
  external_game_id TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'api-sports',
  season INT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_score INT,
  away_score INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Unique constraint on league + external_game_id
  CONSTRAINT uq_sports_games_league_external_game_id UNIQUE (league, external_game_id)
);

-- Enable RLS
ALTER TABLE public.sports_games ENABLE ROW LEVEL SECURITY;

-- Public read access for game data
CREATE POLICY "Sports games are publicly readable"
  ON public.sports_games
  FOR SELECT
  TO public
  USING (true);

-- Service role can insert/update
CREATE POLICY "Service role can manage sports games"
  ON public.sports_games
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create indexes for common queries
CREATE INDEX idx_sports_games_league ON public.sports_games(league);
CREATE INDEX idx_sports_games_external_game_id ON public.sports_games(external_game_id);
CREATE INDEX idx_sports_games_starts_at ON public.sports_games(starts_at);
CREATE INDEX idx_sports_games_league_starts_at ON public.sports_games(league, starts_at);
CREATE INDEX idx_sports_games_status ON public.sports_games(status);
CREATE INDEX idx_sports_games_season ON public.sports_games(season);

COMMENT ON TABLE public.sports_games IS 'Unified sports games table for NFL, NBA, MLB, NHL, Soccer';
COMMENT ON COLUMN public.sports_games.external_game_id IS 'Game ID from the data provider (e.g., API-Sports)';
COMMENT ON COLUMN public.sports_games.provider IS 'Data provider name (api-sports, sportsdataio, etc)';
COMMENT ON COLUMN public.sports_games.home_team IS 'Home team name (no FK to sports_teams yet)';
COMMENT ON COLUMN public.sports_games.away_team IS 'Away team name (no FK to sports_teams yet)';
