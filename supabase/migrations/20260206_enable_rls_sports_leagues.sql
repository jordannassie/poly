-- Enable Row Level Security
ALTER TABLE public.sports_leagues ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Public read access to sports_leagues"
ON public.sports_leagues
FOR SELECT
USING (true);

-- Restrict insert/update/delete to service role only
CREATE POLICY "Service role write access to sports_leagues"
ON public.sports_leagues
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
