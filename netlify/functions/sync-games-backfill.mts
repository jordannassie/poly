/**
 * Netlify Scheduled Function: Backfill Games Sync
 * 
 * Runs once daily to ensure season games are complete.
 * Will skip if backfill is already complete for the season.
 * 
 * Schedule: 0 4 * * * (4 AM UTC daily)
 * Env: INTERNAL_CRON_SECRET, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import type { Config, Context } from "@netlify/functions";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SITE_URL = process.env.URL || process.env.DEPLOY_URL || "https://provepicks.com";
const INTERNAL_CRON_SECRET = process.env.INTERNAL_CRON_SECRET;
const JOB_NAME = "sync-games-backfill";

function getClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function startJobRun(client: SupabaseClient | null): Promise<string | null> {
  if (!client) return null;
  try {
    const { data, error } = await client
      .from("job_runs")
      .insert({ job_name: JOB_NAME, run_type: "scheduled", status: "running" })
      .select("id")
      .single();
    return error ? null : data?.id;
  } catch { return null; }
}

async function finishJobRun(
  client: SupabaseClient | null, 
  runId: string | null, 
  status: "ok" | "error", 
  duration_ms: number, 
  counts: Record<string, unknown> | null, 
  error: string | null
) {
  if (!client || !runId) return;
  try {
    await client.from("job_runs").update({
      status,
      finished_at: new Date().toISOString(),
      duration_ms,
      counts,
      error,
    }).eq("id", runId);
  } catch {}
}

export default async (request: Request, context: Context) => {
  const startedAt = new Date().toISOString();
  const startTime = Date.now();
  const client = getClient();
  const runId = await startJobRun(client);
  
  console.log("========================================");
  console.log(`[CRON:${JOB_NAME}] STARTED at ${startedAt}`);
  console.log("========================================");
  
  if (!INTERNAL_CRON_SECRET) {
    const duration_ms = Date.now() - startTime;
    console.error(`[CRON:${JOB_NAME}] ERROR: INTERNAL_CRON_SECRET not set`);
    await finishJobRun(client, runId, "error", duration_ms, null, "INTERNAL_CRON_SECRET not set");
    return new Response(JSON.stringify({ 
      ok: false, jobName: JOB_NAME, startedAt, error: "INTERNAL_CRON_SECRET not configured" 
    }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  try {
    const response = await fetch(`${SITE_URL}/api/internal/sports/sync-games`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-cron-secret": INTERNAL_CRON_SECRET,
      },
      body: JSON.stringify({
        mode: "backfill",
        force: false,
      }),
    });

    const data = await response.json();
    const duration_ms = Date.now() - startTime;
    const finishedAt = new Date().toISOString();
    const counts = { games: data.totalGames || 0, inserted: data.totalInserted || 0, updated: data.totalUpdated || 0 };
    
    console.log("========================================");
    console.log(`[CRON:${JOB_NAME}] COMPLETED in ${duration_ms}ms`);
    console.log(`[CRON:${JOB_NAME}] games=${counts.games} inserted=${counts.inserted} updated=${counts.updated}`);
    console.log("========================================");

    await finishJobRun(client, runId, "ok", duration_ms, counts, null);

    return new Response(JSON.stringify({ 
      ok: data.success, 
      jobName: JOB_NAME, 
      startedAt, 
      finishedAt,
      duration_ms,
      counts,
    }), { 
      status: response.ok ? 200 : 500,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    const duration_ms = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    
    console.error("========================================");
    console.error(`[CRON:${JOB_NAME}] FAILED after ${duration_ms}ms: ${errorMsg}`);
    console.error("========================================");

    await finishJobRun(client, runId, "error", duration_ms, null, errorMsg);

    return new Response(JSON.stringify({ 
      ok: false, 
      jobName: JOB_NAME, 
      startedAt,
      finishedAt: new Date().toISOString(),
      duration_ms,
      error: errorMsg,
    }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};

export const config: Config = {
  schedule: "0 4 * * *",
};
