-- Ensure public read access for sports_games table
-- This migration adds SELECT policies for anon and authenticated users
-- Safe to run multiple times (uses IF NOT EXISTS pattern via DROP/CREATE)

-- First, ensure RLS is enabled
ALTER TABLE public.sports_games ENABLE ROW LEVEL SECURITY;

-- Drop existing public read policy if it exists (to recreate cleanly)
DROP POLICY IF EXISTS "Sports games are publicly readable" ON public.sports_games;
DROP POLICY IF EXISTS "Anyone can read sports games" ON public.sports_games;
DROP POLICY IF EXISTS "Public read access to sports games" ON public.sports_games;

-- Create fresh public read policy
-- This allows anonymous and authenticated users to read all games
CREATE POLICY "Public read access to sports games"
  ON public.sports_games
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Also ensure service role has full access for sync operations
DROP POLICY IF EXISTS "Service role can manage sports games" ON public.sports_games;
CREATE POLICY "Service role can manage sports games"
  ON public.sports_games
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant usage on schema if needed
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant SELECT on the table to anon and authenticated
GRANT SELECT ON public.sports_games TO anon, authenticated;

-- Log for verification
DO $$
BEGIN
  RAISE NOTICE 'RLS policies for sports_games created successfully';
END $$;
