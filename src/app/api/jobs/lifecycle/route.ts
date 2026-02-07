/**
 * Internal Lifecycle Jobs Endpoint
 * 
 * Protected by SPORTS_JOB_SECRET
 * Called by Netlify scheduled functions
 * 
 * Features:
 * - Job locking to prevent concurrent execution
 * - Automatic lock cleanup
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  discoverGamesRollingWindow,
  syncLiveAndWindowGames,
  finalizeAndEnqueueSettlements,
  processAllSettlements,
  acquireJobLock,
  releaseJobLock,
  cleanupExpiredLocks,
} from "@/lib/lifecycle";
import type { JobName } from "@/lib/lifecycle";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const JOB_SECRET = process.env.SPORTS_JOB_SECRET || process.env.INTERNAL_CRON_SECRET;

export async function POST(request: NextRequest) {
  // Verify secret
  const authHeader = request.headers.get("x-job-secret") || 
                     request.headers.get("x-internal-cron-secret");
  
  if (!JOB_SECRET || authHeader !== JOB_SECRET) {
    console.error("[jobs:lifecycle] Unauthorized request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  try {
    const body = await request.json();
    const job = body.job as string;
    const skipLock = body.skipLock === true; // Allow bypassing lock for admin testing

    if (!job) {
      return NextResponse.json({ error: "Missing job parameter" }, { status: 400 });
    }

    // Clean up expired locks first
    await cleanupExpiredLocks(adminClient);

    const startTime = Date.now();
    let result: any;
    let skipped = false;

    // Map job name to lock name
    const lockName = getLockName(job);

    // Acquire lock if needed (not for 'full' which uses multiple locks)
    if (!skipLock && lockName && job !== 'full') {
      const lockResult = await acquireJobLock(adminClient, lockName, { ttlMinutes: 5 });
      
      if (!lockResult.acquired) {
        console.log(`[jobs:lifecycle] Job ${job} skipped - already running`);
        return NextResponse.json({
          success: true,
          job,
          skipped: true,
          reason: `Job already running (locked by ${lockResult.existingLock?.locked_by})`,
          lockExpires: lockResult.existingLock?.expires_at,
        });
      }
    }

    console.log(`[jobs:lifecycle] Starting job: ${job}`);

    try {
      switch (job) {
        case "discover":
          result = await discoverGamesRollingWindow(adminClient);
          break;

        case "sync":
          result = await syncLiveAndWindowGames(adminClient);
          break;

        case "finalize":
          result = await finalizeAndEnqueueSettlements(adminClient);
          break;

        case "settle":
          result = await processAllSettlements(adminClient, { maxItems: 25 });
          break;

        case "full":
          // Run full lifecycle with individual locks
          result = await runFullLifecycle(adminClient, skipLock);
          break;

        default:
          return NextResponse.json(
            { error: `Unknown job: ${job}. Options: discover, sync, finalize, settle, full` },
            { status: 400 }
          );
      }
    } finally {
      // Release lock
      if (!skipLock && lockName && job !== 'full') {
        await releaseJobLock(adminClient, lockName);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[jobs:lifecycle] Completed ${job} in ${duration}ms`);

    return NextResponse.json({
      success: true,
      job,
      duration,
      skipped,
      result,
    });

  } catch (err) {
    console.error("[jobs:lifecycle] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

function getLockName(job: string): JobName | null {
  switch (job) {
    case 'discover':
      return 'discover';
    case 'sync':
      return 'sync';
    case 'finalize':
      return 'finalize';
    case 'settle':
      return 'settle';
    default:
      return null;
  }
}

async function runFullLifecycle(adminClient: any, skipLock: boolean) {
  const results: any = {
    discover: null,
    sync: null,
    finalize: null,
    settle: null,
    skipped: [] as string[],
    totals: {
      fetched: 0,
      upserted: 0,
      finalized: 0,
      enqueued: 0,
      settled: 0,
    },
  };

  // Run each job with its own lock
  const jobs: { name: JobName; fn: () => Promise<any> }[] = [
    { name: 'discover', fn: () => discoverGamesRollingWindow(adminClient) },
    { name: 'sync', fn: () => syncLiveAndWindowGames(adminClient) },
    { name: 'finalize', fn: () => finalizeAndEnqueueSettlements(adminClient) },
    { name: 'settle', fn: () => processAllSettlements(adminClient, { maxItems: 25 }) },
  ];

  for (const job of jobs) {
    if (!skipLock) {
      const lockResult = await acquireJobLock(adminClient, job.name, { ttlMinutes: 5 });
      if (!lockResult.acquired) {
        results.skipped.push(job.name);
        continue;
      }
    }

    try {
      const jobResult = await job.fn();
      results[job.name] = jobResult.success ?? jobResult.succeeded ?? true;

      // Aggregate totals
      if (job.name === 'discover' || job.name === 'sync') {
        results.totals.fetched += jobResult.totalFetched || 0;
        results.totals.upserted += jobResult.totalUpserted || 0;
      }
      if (job.name === 'sync' || job.name === 'finalize') {
        results.totals.finalized += jobResult.totalFinalized || 0;
        results.totals.enqueued += jobResult.totalEnqueued || 0;
      }
      if (job.name === 'settle') {
        results.totals.settled += jobResult.succeeded || 0;
      }
    } finally {
      if (!skipLock) {
        await releaseJobLock(adminClient, job.name);
      }
    }
  }

  return results;
}
