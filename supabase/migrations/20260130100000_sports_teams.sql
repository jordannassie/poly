-- Sports Teams table for storing team data with Supabase Storage logos
-- This table is league-agnostic and stores teams from any supported sport

CREATE TABLE IF NOT EXISTS public.sports_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league TEXT NOT NULL,
  api_team_id INT NOT NULL,
  name TEXT NOT NULL,
  logo_path TEXT,
  logo_url_original TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint on league + api_team_id
  CONSTRAINT uq_sports_teams_league_api_team_id UNIQUE (league, api_team_id)
);

-- Enable RLS
ALTER TABLE public.sports_teams ENABLE ROW LEVEL SECURITY;

-- Public read access for team data
CREATE POLICY "Sports teams are publicly readable"
  ON public.sports_teams
  FOR SELECT
  TO public
  USING (true);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sports_teams_league ON public.sports_teams(league);
CREATE INDEX IF NOT EXISTS idx_sports_teams_api_team_id ON public.sports_teams(api_team_id);
CREATE INDEX IF NOT EXISTS idx_sports_teams_league_api_team_id ON public.sports_teams(league, api_team_id);

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
