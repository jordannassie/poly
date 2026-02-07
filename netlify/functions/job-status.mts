/**
 * Netlify Function: Job Status
 * 
 * Returns the latest run status for each scheduled job.
 * GET /.netlify/functions/job-status
 */

import type { Config, Context } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const JOB_NAMES = [
  "sync-games-daily",
  "sync-games-live",
  "lifecycle-finalize",
  "sync-games-backfill",
];

export default async (request: Request, context: Context) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return new Response(JSON.stringify({
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
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const client = createClient(url, key, { auth: { persistSession: false } });

  try {
    // Get latest run for each job
    const jobs = await Promise.all(
      JOB_NAMES.map(async (jobName) => {
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
      })
    );

    return new Response(JSON.stringify({
      ok: true,
      jobs,
      fetched_at: new Date().toISOString(),
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
      jobs: [],
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
