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
import { createClient } from "@supabase/supabase-js";

const SITE_URL = process.env.URL || process.env.DEPLOY_URL || "https://provepicks.com";
const INTERNAL_CRON_SECRET = process.env.INTERNAL_CRON_SECRET;
const JOB_SECRET = process.env.SPORTS_JOB_SECRET || INTERNAL_CRON_SECRET;
const JOB_NAME = "sync-games-daily";

async function logToDb(event: {
  type: string;
  status: string;
  duration_ms?: number;
  payload?: Record<string, unknown>;
}) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return;
    
    const client = createClient(url, key, { auth: { persistSession: false } });
    await client.from("system_events").insert({
      event_type: event.type,
      severity: event.status === "error" ? "error" : "info",
      payload: {
        job_name: JOB_NAME,
        ...event.payload,
        duration_ms: event.duration_ms,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (e) {
    console.warn("[cron] DB log failed:", e);
  }
}

export default async (request: Request, context: Context) => {
  const startedAt = new Date().toISOString();
  const startTime = Date.now();
  
  console.log("========================================");
  console.log(`[CRON:${JOB_NAME}] STARTED at ${startedAt}`);
  console.log(`[CRON:${JOB_NAME}] SITE_URL=${SITE_URL}`);
  console.log("========================================");
  
  await logToDb({ type: "CRON_JOB_START", status: "info", payload: { startedAt } });

  if (!INTERNAL_CRON_SECRET) {
    console.error(`[CRON:${JOB_NAME}] ERROR: INTERNAL_CRON_SECRET not set`);
    await logToDb({ type: "CRON_JOB_ERROR", status: "error", payload: { error: "INTERNAL_CRON_SECRET not set" } });
    return new Response(JSON.stringify({ 
      ok: false, jobName: JOB_NAME, startedAt, error: "INTERNAL_CRON_SECRET not configured" 
    }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  let totalGames = 0, totalInserted = 0, totalUpdated = 0;
  let lifecycleOk = false;
  let errorMsg: string | null = null;

  try {
    // Call existing sync endpoint
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

    // Also call lifecycle discover job
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
    
    console.log("========================================");
    console.log(`[CRON:${JOB_NAME}] COMPLETED in ${duration_ms}ms`);
    console.log(`[CRON:${JOB_NAME}] games=${totalGames} inserted=${totalInserted} updated=${totalUpdated}`);
    console.log("========================================");

    await logToDb({ 
      type: "CRON_JOB_COMPLETE", 
      status: data.success ? "success" : "error", 
      duration_ms,
      payload: { games: totalGames, inserted: totalInserted, updated: totalUpdated, lifecycleOk }
    });

    return new Response(JSON.stringify({ 
      ok: data.success, 
      jobName: JOB_NAME, 
      startedAt, 
      finishedAt,
      duration_ms,
      counts: { games: totalGames, inserted: totalInserted, updated: totalUpdated },
      lifecycleOk,
    }), { 
      status: response.ok ? 200 : 500,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    const duration_ms = Date.now() - startTime;
    errorMsg = error instanceof Error ? error.message : "Unknown error";
    
    console.error("========================================");
    console.error(`[CRON:${JOB_NAME}] FAILED after ${duration_ms}ms`);
    console.error(`[CRON:${JOB_NAME}] Error: ${errorMsg}`);
    console.error("========================================");

    await logToDb({ 
      type: "CRON_JOB_ERROR", 
      status: "error", 
      duration_ms,
      payload: { error: errorMsg }
    });

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
