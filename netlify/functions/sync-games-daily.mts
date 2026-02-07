/**
 * Netlify Scheduled Function: Daily Games Sync (Discover)
 * 
 * Runs every 15 minutes to keep upcoming games up-to-date.
 * Also calls the lifecycle discover job for rolling window ingestion.
 * 
 * Schedule: Every 15 minutes
 * Env: INTERNAL_CRON_SECRET, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import type { Config, Context } from "@netlify/functions";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SITE_URL = process.env.URL || process.env.DEPLOY_URL || "https://provepicks.com";
const INTERNAL_CRON_SECRET = process.env.INTERNAL_CRON_SECRET;
const JOB_SECRET = process.env.SPORTS_JOB_SECRET || INTERNAL_CRON_SECRET;
const JOB_NAME = "sync-games-daily";

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
  console.log(`[CRON:${JOB_NAME}] SITE_URL=${SITE_URL}`);
  console.log("========================================");

  if (!INTERNAL_CRON_SECRET) {
    const duration_ms = Date.now() - startTime;
    console.error(`[CRON:${JOB_NAME}] ERROR: INTERNAL_CRON_SECRET not set`);
    await finishJobRun(client, runId, "error", duration_ms, null, "INTERNAL_CRON_SECRET not set");
    return new Response(JSON.stringify({ 
      ok: false, jobName: JOB_NAME, startedAt, error: "INTERNAL_CRON_SECRET not configured" 
    }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  let totalGames = 0, totalInserted = 0, totalUpdated = 0;
  let lifecycleOk = false;

  try {
    console.log(`[CRON:${JOB_NAME}] Calling /api/internal/sports/sync-games...`);
    const response = await fetch(`${SITE_URL}/api/internal/sports/sync-games`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-cron-secret": INTERNAL_CRON_SECRET,
      },
      body: JSON.stringify({ mode: "daily" }),
    });

    const data = await response.json();
    totalGames = data.totalGames || 0;
    totalInserted = data.totalInserted || 0;
    totalUpdated = data.totalUpdated || 0;
    
    console.log(`[CRON:${JOB_NAME}] Sync response: ok=${response.ok} games=${totalGames} inserted=${totalInserted} updated=${totalUpdated}`);

    if (JOB_SECRET) {
      try {
        console.log(`[CRON:${JOB_NAME}] Calling /api/jobs/lifecycle discover...`);
        const lcRes = await fetch(`${SITE_URL}/api/jobs/lifecycle`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-job-secret": JOB_SECRET },
          body: JSON.stringify({ job: "discover" }),
        });
        lifecycleOk = lcRes.ok;
        console.log(`[CRON:${JOB_NAME}] Lifecycle discover: ok=${lcRes.ok}`);
      } catch (e) {
        console.warn(`[CRON:${JOB_NAME}] Lifecycle discover failed:`, e);
      }
    }

    const duration_ms = Date.now() - startTime;
    const finishedAt = new Date().toISOString();
    const counts = { games: totalGames, inserted: totalInserted, updated: totalUpdated, lifecycleOk };
    
    console.log("========================================");
    console.log(`[CRON:${JOB_NAME}] COMPLETED in ${duration_ms}ms`);
    console.log(`[CRON:${JOB_NAME}] games=${totalGames} inserted=${totalInserted} updated=${totalUpdated}`);
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
    console.error(`[CRON:${JOB_NAME}] FAILED after ${duration_ms}ms`);
    console.error(`[CRON:${JOB_NAME}] Error: ${errorMsg}`);
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
  schedule: "*/15 * * * *",
};
