/**
 * Netlify Scheduled Function: Finalize and Settle
 * 
 * Runs every 10 minutes to:
 * 1. Finalize stuck/completed games
 * 2. Process settlement queue
 * 
 * Schedule: Every 10 minutes
 * Env: INTERNAL_CRON_SECRET or SPORTS_JOB_SECRET, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import type { Config, Context } from "@netlify/functions";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SITE_URL = process.env.URL || process.env.DEPLOY_URL || "https://provepicks.com";
const JOB_SECRET = process.env.SPORTS_JOB_SECRET || process.env.INTERNAL_CRON_SECRET;
const JOB_NAME = "lifecycle-finalize";

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

  if (!JOB_SECRET) {
    const duration_ms = Date.now() - startTime;
    console.error(`[CRON:${JOB_NAME}] ERROR: JOB_SECRET not set`);
    await finishJobRun(client, runId, "error", duration_ms, null, "JOB_SECRET not set");
    return new Response(JSON.stringify({ 
      ok: false, jobName: JOB_NAME, startedAt, error: "JOB_SECRET not configured" 
    }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  let finalized = 0, enqueued = 0, settled = 0, settleFailed = 0;

  try {
    console.log(`[CRON:${JOB_NAME}] Calling /api/jobs/lifecycle finalize...`);
    const finalizeResponse = await fetch(`${SITE_URL}/api/jobs/lifecycle`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-job-secret": JOB_SECRET },
      body: JSON.stringify({ job: "finalize" }),
    });

    let finalizeData: any = {};
    try { finalizeData = await finalizeResponse.json(); } catch {}
    finalized = finalizeData.result?.totalFinalized || 0;
    enqueued = finalizeData.result?.totalEnqueued || 0;
    
    console.log(`[CRON:${JOB_NAME}] Finalize: ok=${finalizeResponse.ok} finalized=${finalized} enqueued=${enqueued}`);
    
    console.log(`[CRON:${JOB_NAME}] Calling /api/jobs/lifecycle settle...`);
    const settleResponse = await fetch(`${SITE_URL}/api/jobs/lifecycle`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-job-secret": JOB_SECRET },
      body: JSON.stringify({ job: "settle" }),
    });

    let settleData: any = {};
    try { settleData = await settleResponse.json(); } catch {}
    settled = settleData.result?.succeeded || 0;
    settleFailed = settleData.result?.failed || 0;
    
    console.log(`[CRON:${JOB_NAME}] Settle: ok=${settleResponse.ok} settled=${settled} failed=${settleFailed}`);

    const duration_ms = Date.now() - startTime;
    const finishedAt = new Date().toISOString();
    const counts = { finalized, enqueued, settled, settleFailed };
    
    console.log("========================================");
    console.log(`[CRON:${JOB_NAME}] COMPLETED in ${duration_ms}ms`);
    console.log(`[CRON:${JOB_NAME}] finalized=${finalized} enqueued=${enqueued} settled=${settled}`);
    console.log("========================================");

    await finishJobRun(client, runId, "ok", duration_ms, counts, null);

    return new Response(JSON.stringify({ 
      ok: true, 
      jobName: JOB_NAME, 
      startedAt, 
      finishedAt,
      duration_ms,
      counts,
    }), { 
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    const duration_ms = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    
    console.error("========================================");
    console.error(`[CRON:${JOB_NAME}] FAILED after ${duration_ms}ms: ${errorMsg}`);
    console.error("========================================");

    await finishJobRun(client, runId, "error", duration_ms, { finalized, enqueued, settled }, errorMsg);

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
  schedule: "*/10 * * * *",
};
