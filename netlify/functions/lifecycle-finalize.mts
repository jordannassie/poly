/**
 * Netlify Scheduled Function: Finalize and Settle - HARDENED
 * 
 * Runs every 10 minutes to:
 * 1. Finalize stuck/completed games
 * 2. Process settlement queue
 * 
 * Schedule: Every 10 minutes
 * Env: INTERNAL_CRON_SECRET or SPORTS_JOB_SECRET, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * 
 * HARDENED: Always returns JSON, never crashes without logging.
 */

import type { Config, Context } from "@netlify/functions";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const JOB_NAME = "lifecycle-finalize";

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
  let finalized = 0, enqueued = 0, settled = 0, settleFailed = 0;

  try {
    console.log("========================================");
    console.log(`[CRON:${JOB_NAME}] STARTED at ${startedAt}`);
    console.log("========================================");

    // === ENV VAR VALIDATION ===
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const JOB_SECRET = process.env.SPORTS_JOB_SECRET || process.env.INTERNAL_CRON_SECRET;
    const SITE_URL = process.env.URL || process.env.DEPLOY_URL || "https://provepicks.com";

    const missingVars: string[] = [];
    if (!SUPABASE_URL) missingVars.push("NEXT_PUBLIC_SUPABASE_URL");
    if (!SUPABASE_KEY) missingVars.push("SUPABASE_SERVICE_ROLE_KEY");
    if (!JOB_SECRET) missingVars.push("SPORTS_JOB_SECRET or INTERNAL_CRON_SECRET");

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
    
    // Step 1: Finalize games
    console.log(`[CRON:${JOB_NAME}] Calling ${SITE_URL}/api/jobs/lifecycle finalize...`);
    const finalizeResponse = await fetch(`${SITE_URL}/api/jobs/lifecycle`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-job-secret": JOB_SECRET },
      body: JSON.stringify({ job: "finalize" }),
    });

    let finalizeData: any = {};
    try {
      const text = await finalizeResponse.text();
      finalizeData = text ? JSON.parse(text) : {};
    } catch (parseErr) {
      console.warn(`[CRON:${JOB_NAME}] Failed to parse finalize response as JSON`);
    }
    
    finalized = finalizeData.result?.totalFinalized || 0;
    enqueued = finalizeData.result?.totalEnqueued || 0;
    console.log(`[CRON:${JOB_NAME}] Finalize: status=${finalizeResponse.status} finalized=${finalized} enqueued=${enqueued}`);
    
    // Step 2: Process settlements
    console.log(`[CRON:${JOB_NAME}] Calling ${SITE_URL}/api/jobs/lifecycle settle...`);
    const settleResponse = await fetch(`${SITE_URL}/api/jobs/lifecycle`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-job-secret": JOB_SECRET },
      body: JSON.stringify({ job: "settle" }),
    });

    let settleData: any = {};
    try {
      const text = await settleResponse.text();
      settleData = text ? JSON.parse(text) : {};
    } catch (parseErr) {
      console.warn(`[CRON:${JOB_NAME}] Failed to parse settle response as JSON`);
    }
    
    settled = settleData.result?.succeeded || 0;
    settleFailed = settleData.result?.failed || 0;
    console.log(`[CRON:${JOB_NAME}] Settle: status=${settleResponse.status} settled=${settled} failed=${settleFailed}`);

    // === FINISH JOB RUN ===
    const duration_ms = Date.now() - startTime;
    const finishedAt = new Date().toISOString();
    const counts = { finalized, enqueued, settled, settleFailed };
    
    console.log("========================================");
    console.log(`[CRON:${JOB_NAME}] COMPLETED in ${duration_ms}ms`);
    console.log(`[CRON:${JOB_NAME}] finalized=${finalized} enqueued=${enqueued} settled=${settled}`);
    console.log("========================================");

    await finishJobRun(client, runId, "ok", duration_ms, counts, null);

    return jsonResponse({
      ok: true,
      job: JOB_NAME,
      startedAt,
      finishedAt,
      duration_ms,
      counts,
    }, 200);

  } catch (error) {
    const duration_ms = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);
    const stack = shortStack(error);
    
    console.error("========================================");
    console.error(`[CRON:${JOB_NAME}] CRASHED after ${duration_ms}ms`);
    console.error(`[CRON:${JOB_NAME}] Error: ${errorMsg}`);
    console.error(`[CRON:${JOB_NAME}] Stack: ${stack}`);
    console.error("========================================");

    await finishJobRun(client, runId, "error", duration_ms, { finalized, enqueued, settled }, errorMsg);

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
  schedule: "*/10 * * * *",
};
