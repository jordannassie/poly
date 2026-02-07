/**
 * Job Last Run API
 * 
 * GET /api/jobs/last-run
 * Returns the last run time and status for scheduled jobs.
 * Reads from system_events table where event_type starts with CRON_JOB_.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const JOB_NAMES = [
  "sync-games-daily",
  "sync-games-live", 
  "lifecycle-finalize",
];

export async function GET(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return NextResponse.json({
      status: "unknown",
      message: "Supabase not configured",
      jobs: JOB_NAMES.map(name => ({
        job_name: name,
        last_run: null,
        last_status: "unknown",
      })),
    });
  }

  const client = createClient(url, key, { auth: { persistSession: false } });

  try {
    // Get latest CRON_JOB_COMPLETE or CRON_JOB_ERROR for each job
    const results = await Promise.all(
      JOB_NAMES.map(async (jobName) => {
        const { data, error } = await client
          .from("system_events")
          .select("event_type, created_at, payload")
          .in("event_type", ["CRON_JOB_COMPLETE", "CRON_JOB_ERROR", "CRON_JOB_START"])
          .contains("payload", { job_name: jobName })
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (error || !data) {
          return {
            job_name: jobName,
            last_run: null,
            last_status: "never",
            minutes_ago: null,
          };
        }

        const lastRun = new Date(data.created_at);
        const minutesAgo = Math.floor((Date.now() - lastRun.getTime()) / 60000);

        return {
          job_name: jobName,
          last_run: data.created_at,
          last_status: data.event_type === "CRON_JOB_COMPLETE" ? "success" : 
                       data.event_type === "CRON_JOB_ERROR" ? "error" : "running",
          minutes_ago: minutesAgo,
          payload: data.payload,
        };
      })
    );

    // Determine overall status
    const hasNeverRun = results.some(r => r.last_status === "never");
    const hasError = results.some(r => r.last_status === "error");
    const allHealthy = results.every(r => r.last_status === "success" && (r.minutes_ago || 999) < 30);

    let overallStatus = "healthy";
    if (hasNeverRun) overallStatus = "unknown";
    else if (hasError) overallStatus = "warning";
    else if (!allHealthy) overallStatus = "stale";

    return NextResponse.json({
      status: overallStatus,
      checked_at: new Date().toISOString(),
      jobs: results,
    });

  } catch (error) {
    console.error("[jobs/last-run] Error:", error);
    return NextResponse.json({
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
      jobs: JOB_NAMES.map(name => ({
        job_name: name,
        last_run: null,
        last_status: "unknown",
      })),
    }, { status: 500 });
  }
}
