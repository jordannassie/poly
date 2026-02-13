/**
 * Netlify Function: Job Status
 * 
 * Returns the latest run status for each scheduled job.
 * GET /.netlify/functions/job-status
 * 
 * HARDENED: Always returns JSON, never crashes.
 */

import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

const JOB_NAMES = [
  "sync-games-daily",
  "sync-games-live",
  "lifecycle-finalize",
  "sync-games-backfill",
];

// Helper to create JSON response
function jsonResponse(body: object, statusCode = 200) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return jsonResponse({
        ok: false,
        error: "Supabase not configured",
        jobs: JOB_NAMES.map(name => ({
          job_name: name,
          status: "unknown",
          started_at: null,
          finished_at: null,
          duration_ms: null,
          counts: null,
          error: null,
        })),
      }, 200);
    }

    // Dynamic import to avoid import-time crashes
    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient(url, key, { auth: { persistSession: false } });

    // Get latest run for each job
    const jobs = await Promise.all(
      JOB_NAMES.map(async (jobName) => {
        try {
          const { data, error } = await client
            .from("job_runs")
            .select("*")
            .eq("job_name", jobName)
            .order("started_at", { ascending: false })
            .limit(1)
            .single();

          if (error || !data) {
            return {
              job_name: jobName,
              status: "never",
              started_at: null,
              finished_at: null,
              duration_ms: null,
              counts: null,
              error: null,
            };
          }

          return {
            job_name: data.job_name,
            status: data.status,
            started_at: data.started_at,
            finished_at: data.finished_at,
            duration_ms: data.duration_ms,
            counts: data.counts,
            error: data.error,
          };
        } catch (err) {
          return {
            job_name: jobName,
            status: "error",
            started_at: null,
            finished_at: null,
            duration_ms: null,
            counts: null,
            error: err instanceof Error ? err.message : "Unknown error",
          };
        }
      })
    );

    const locksStatus = {
      reachable: false,
      fail_open: false,
    };
    try {
      await client
        .from('job_locks')
        .select('key')
        .limit(1);
      locksStatus.reachable = true;
    } catch (err) {
      locksStatus.fail_open = true;
      console.warn(`[job-status] job_locks check failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    return jsonResponse({
      ok: true,
      jobs,
      fetched_at: new Date().toISOString(),
      locks: locksStatus,
    }, 200);

  } catch (error) {
    console.error("[job-status] Error:", error);
    return jsonResponse({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
      jobs: [],
    }, 500);
  }
};
