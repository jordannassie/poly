-- =====================================================
-- JOB RUNS TABLE
-- Track scheduled job executions for admin visibility
-- =====================================================

CREATE TABLE IF NOT EXISTS public.job_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  run_type TEXT NOT NULL DEFAULT 'scheduled',
  status TEXT NOT NULL CHECK (status IN ('running', 'ok', 'error')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,
  counts JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_job_runs_job_started ON public.job_runs(job_name, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_runs_job_finished ON public.job_runs(job_name, finished_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_runs_status ON public.job_runs(status);

-- Enable RLS
ALTER TABLE public.job_runs ENABLE ROW LEVEL SECURITY;

-- Service role can manage job runs
CREATE POLICY "Service role can manage job_runs"
  ON public.job_runs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users can read job runs (for admin UI)
CREATE POLICY "Authenticated can read job_runs"
  ON public.job_runs
  FOR SELECT
  TO authenticated
  USING (true);

-- Grant permissions
GRANT SELECT ON public.job_runs TO service_role, authenticated;
GRANT INSERT, UPDATE ON public.job_runs TO service_role;

COMMENT ON TABLE public.job_runs IS 'Tracks scheduled job executions for admin observability';
