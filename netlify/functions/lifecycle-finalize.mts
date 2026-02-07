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
import { createClient } from "@supabase/supabase-js";

const SITE_URL = process.env.URL || process.env.DEPLOY_URL || "https://provepicks.com";
const JOB_SECRET = process.env.SPORTS_JOB_SECRET || process.env.INTERNAL_CRON_SECRET;
const JOB_NAME = "lifecycle-finalize";

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
  console.log("========================================");
  
  await logToDb({ type: "CRON_JOB_START", status: "info", payload: { startedAt } });

  if (!JOB_SECRET) {
    console.error(`[CRON:${JOB_NAME}] ERROR: JOB_SECRET not set`);
    await logToDb({ type: "CRON_JOB_ERROR", status: "error", payload: { error: "JOB_SECRET not set" } });
    return new Response(JSON.stringify({ 
      ok: false, jobName: JOB_NAME, startedAt, error: "JOB_SECRET not configured" 
    }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  let finalized = 0, enqueued = 0, settled = 0, settleFailed = 0;

  try {
    // Call the finalize job
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
    
    // Call the settle job
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
    
    console.log("========================================");
    console.log(`[CRON:${JOB_NAME}] COMPLETED in ${duration_ms}ms`);
    console.log(`[CRON:${JOB_NAME}] finalized=${finalized} enqueued=${enqueued} settled=${settled}`);
    console.log("========================================");

    await logToDb({ 
      type: "CRON_JOB_COMPLETE", 
      status: "success", 
      duration_ms,
      payload: { finalized, enqueued, settled, settleFailed }
    });

    return new Response(JSON.stringify({ 
      ok: true, 
      jobName: JOB_NAME, 
      startedAt, 
      finishedAt,
      duration_ms,
      counts: { finalized, enqueued, settled, settleFailed },
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

    await logToDb({ 
      type: "CRON_JOB_ERROR", 
      status: "error", 
      duration_ms,
      payload: { error: errorMsg, finalized, enqueued, settled }
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
  schedule: "*/10 * * * *",
};
