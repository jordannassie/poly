-- Migration: Fix team slug constraints
-- 
-- Changes:
-- 1. Drop the existing UNIQUE constraint on slug (sports_teams_slug_key)
-- 2. Normalize slugs: remove league prefix (e.g., "nfl-arizona-cardinals" -> "arizona-cardinals")
-- 3. Add UNIQUE constraint on (league, slug) instead
-- 4. Handle any duplicates by appending -id
--
-- Safe to run on production - uses transactions, no deletes

BEGIN;

-- Step 1: Drop the existing unique constraint on slug (if exists)
ALTER TABLE public.sports_teams 
DROP CONSTRAINT IF EXISTS sports_teams_slug_key;

-- Step 2: Normalize slugs - remove league prefix
-- Pattern: "{league}-{rest}" becomes "{rest}"
UPDATE public.sports_teams 
SET slug = CASE
  WHEN slug LIKE league || '-%' THEN SUBSTRING(slug FROM LENGTH(league) + 2)
  ELSE slug
END
WHERE slug LIKE league || '-%';

-- Step 3: Handle any duplicates within same league by appending -id
-- First, identify duplicates
WITH duplicates AS (
  SELECT id, league, slug,
         ROW_NUMBER() OVER (PARTITION BY league, slug ORDER BY id) as rn
  FROM public.sports_teams
)
UPDATE public.sports_teams t
SET slug = t.slug || '-' || t.id
FROM duplicates d
WHERE t.id = d.id 
  AND t.league = d.league
  AND d.rn > 1;

-- Step 4: Add composite unique constraint on (league, slug)
ALTER TABLE public.sports_teams
ADD CONSTRAINT sports_teams_league_slug_unique UNIQUE (league, slug);

-- Step 5: Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_sports_teams_league_slug 
ON public.sports_teams (league, slug);

COMMIT;

-- Verification query (run manually to check):
-- SELECT league, slug, count(*) 
-- FROM sports_teams 
-- GROUP BY league, slug 
-- HAVING count(*) > 1;
