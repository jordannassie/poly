-- Add league_id column to sports_teams for proper league linking
-- This allows teams to be associated with their specific league from sports_leagues

-- Add league_id column (nullable initially to allow backfill)
ALTER TABLE public.sports_teams 
ADD COLUMN IF NOT EXISTS league_id INT;

-- Add foreign key constraint (optional, as we may have teams without leagues initially)
-- Note: Not enforced as FK to avoid issues during sync
-- ALTER TABLE public.sports_teams 
-- ADD CONSTRAINT fk_sports_teams_league_id 
-- FOREIGN KEY (league_id) REFERENCES public.sports_leagues(id);

-- Add index for league_id lookups
CREATE INDEX IF NOT EXISTS idx_sports_teams_league_id ON public.sports_teams(league_id);

-- Add composite index for sport + league_id queries
CREATE INDEX IF NOT EXISTS idx_sports_teams_league_league_id ON public.sports_teams(league, league_id);

-- Add comment
COMMENT ON COLUMN public.sports_teams.league_id IS 'API-Sports league ID, references sports_leagues.id';
