/**
 * Netlify Scheduled Function: Backfill Games Sync - HARDENED
 * 
 * Runs once daily to ensure season games are complete.
 * Will skip if backfill is already complete for the season.
 * 
 * Schedule: 0 4 * * * (4 AM UTC daily)
 * Env: INTERNAL_CRON_SECRET, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * 
 * HARDENED: Always returns JSON, never crashes without logging.
 */

import type { Config, Context } from "@netlify/functions";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const JOB_NAME = "sync-games-backfill";

// Helper to create JSON response
function jsonResponse(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Helper to get short stack trace
function shortStack(err: unknown): string {
  if (err instanceof Error && err.stack) {
    return err.stack.split("\n").slice(0, 4).join("\n");
  }
  return String(err);
}

// Safe Supabase client getter
function getClient(): SupabaseClient | null {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    return createClient(url, key, { auth: { persistSession: false } });
  } catch (err) {
    console.error(`[${JOB_NAME}] Failed to create Supabase client:`, err);
    return null;
  }
}

// Safe job run start
async function startJobRun(client: SupabaseClient | null): Promise<string | null> {
  if (!client) return null;
  try {
    const { data, error } = await client
      .from("job_runs")
      .insert({ job_name: JOB_NAME, run_type: "scheduled", status: "running" })
      .select("id")
      .single();
    if (error) {
      console.error(`[${JOB_NAME}] Failed to start job_run:`, error.message);
      return null;
    }
    return data?.id || null;
  } catch (err) {
    console.error(`[${JOB_NAME}] Exception starting job_run:`, err);
    return null;
  }
}

// Safe job run finish
async function finishJobRun(
  client: SupabaseClient | null, 
  runId: string | null, 
  status: "ok" | "error", 
  duration_ms: number, 
  counts: Record<string, unknown> | null, 
  errorMsg: string | null
): Promise<void> {
  if (!client || !runId) return;
  try {
    const { error } = await client.from("job_runs").update({
      status,
      finished_at: new Date().toISOString(),
      duration_ms,
      counts,
      error: errorMsg,
    }).eq("id", runId);
    if (error) {
      console.error(`[${JOB_NAME}] Failed to finish job_run:`, error.message);
    }
  } catch (err) {
    console.error(`[${JOB_NAME}] Exception finishing job_run:`, err);
  }
}

// Main handler - wrapped entirely in try/catch
export default async (request: Request, context: Context): Promise<Response> => {
  const startedAt = new Date().toISOString();
  const startTime = Date.now();
  
  let client: SupabaseClient | null = null;
  let runId: string | null = null;

  try {
    console.log("========================================");
    console.log(`[CRON:${JOB_NAME}] STARTED at ${startedAt}`);
    console.log("========================================");

    // === ENV VAR VALIDATION ===
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const INTERNAL_CRON_SECRET = process.env.INTERNAL_CRON_SECRET;
    const SITE_URL = process.env.URL || process.env.DEPLOY_URL || "https://provepicks.com";

    const missingVars: string[] = [];
    if (!SUPABASE_URL) missingVars.push("NEXT_PUBLIC_SUPABASE_URL");
    if (!SUPABASE_KEY) missingVars.push("SUPABASE_SERVICE_ROLE_KEY");
    if (!INTERNAL_CRON_SECRET) missingVars.push("INTERNAL_CRON_SECRET");

    if (missingVars.length > 0) {
      const errorMsg = `Missing env vars: ${missingVars.join(", ")}`;
      console.error(`[CRON:${JOB_NAME}] ERROR: ${errorMsg}`);
      return jsonResponse({ ok: false, job: JOB_NAME, startedAt, error: errorMsg }, 500);
    }

    // === INITIALIZE CLIENT & START JOB RUN ===
    client = getClient();
    runId = await startJobRun(client);
    console.log(`[CRON:${JOB_NAME}] job_run started: runId=${runId || "none"}, SITE_URL=${SITE_URL}`);

    // === MAIN JOB LOGIC ===
    let totalGames = 0, totalInserted = 0, totalUpdated = 0;
    let syncSuccess = false;

    console.log(`[CRON:${JOB_NAME}] Calling ${SITE_URL}/api/internal/sports/sync-games mode=backfill...`);
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

    // Parse response safely
    let data: any = {};
    try {
      const text = await response.text();
      data = text ? JSON.parse(text) : {};
    } catch (parseErr) {
      console.warn(`[CRON:${JOB_NAME}] Failed to parse sync response as JSON`);
    }

    totalGames = data.totalGames || 0;
    totalInserted = data.totalInserted || 0;
    totalUpdated = data.totalUpdated || 0;
    syncSuccess = response.ok && (data.success !== false);
    
    console.log(`[CRON:${JOB_NAME}] Sync response: status=${response.status} games=${totalGames} inserted=${totalInserted} updated=${totalUpdated}`);

    // === FINISH JOB RUN ===
    const duration_ms = Date.now() - startTime;
    const finishedAt = new Date().toISOString();
    const counts = { games: totalGames, inserted: totalInserted, updated: totalUpdated };
    
    console.log("========================================");
    console.log(`[CRON:${JOB_NAME}] COMPLETED in ${duration_ms}ms`);
    console.log(`[CRON:${JOB_NAME}] games=${totalGames} inserted=${totalInserted} updated=${totalUpdated}`);
    console.log("========================================");

    await finishJobRun(client, runId, "ok", duration_ms, counts, null);

    return jsonResponse({
      ok: syncSuccess,
      job: JOB_NAME,
      startedAt,
      finishedAt,
      duration_ms,
      counts,
    }, syncSuccess ? 200 : 500);

  } catch (error) {
    const duration_ms = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);
    const stack = shortStack(error);
    
    console.error("========================================");
    console.error(`[CRON:${JOB_NAME}] CRASHED after ${duration_ms}ms`);
    console.error(`[CRON:${JOB_NAME}] Error: ${errorMsg}`);
    console.error(`[CRON:${JOB_NAME}] Stack: ${stack}`);
    console.error("========================================");

    await finishJobRun(client, runId, "error", duration_ms, null, errorMsg);

    return jsonResponse({
      ok: false,
      job: JOB_NAME,
      startedAt,
      finishedAt: new Date().toISOString(),
      duration_ms,
      error: errorMsg,
      stack: stack.slice(0, 500),
    }, 500);
  }
};

export const config: Config = {
  schedule: "0 4 * * *",
};
