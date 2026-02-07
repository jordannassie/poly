/**
 * Admin Lifecycle Jobs API
 * 
 * POST /api/admin/lifecycle/jobs
 * 
 * Trigger lifecycle jobs manually:
 * - discover: Ingest games for rolling window
 * - sync: Update live games
 * - finalize: Mark games FINAL and enqueue settlements
 * - all: Run all three in sequence
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import {
  discoverGamesRollingWindow,
  syncLiveAndWindowGames,
  finalizeAndEnqueueSettlements,
} from "@/lib/lifecycle";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  // Require admin auth
  const authResult = requireAdmin(request);
  if (!authResult.authenticated) {
    return authResult.error || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const job = body.job as string;
    const leagues = body.leagues as string[] | undefined;

    if (!job) {
      return NextResponse.json(
        { error: "Missing 'job' parameter. Options: discover, sync, finalize, all" },
        { status: 400 }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const results: any = {};
    const startTime = Date.now();

    // Run requested job(s)
    if (job === "discover" || job === "all") {
      console.log("[admin:lifecycle] Running discover job...");
      results.discover = await discoverGamesRollingWindow(adminClient, { 
        leagues: leagues as any 
      });
    }

    if (job === "sync" || job === "all") {
      console.log("[admin:lifecycle] Running sync job...");
      results.sync = await syncLiveAndWindowGames(adminClient, { 
        leagues: leagues as any 
      });
    }

    if (job === "finalize" || job === "all") {
      console.log("[admin:lifecycle] Running finalize job...");
      results.finalize = await finalizeAndEnqueueSettlements(adminClient, { 
        leagues: leagues as any 
      });
    }

    if (!results.discover && !results.sync && !results.finalize) {
      return NextResponse.json(
        { error: `Unknown job: ${job}. Options: discover, sync, finalize, all` },
        { status: 400 }
      );
    }

    const duration = Date.now() - startTime;

    // Collect first error from any job result
    const firstError = 
      results.discover?.firstError || 
      results.sync?.firstError || 
      results.finalize?.firstError;

    // Collect all errors from league results
    const allErrors: string[] = [];
    for (const jobResult of [results.discover, results.sync, results.finalize]) {
      if (jobResult?.results) {
        for (const leagueResult of jobResult.results) {
          if (leagueResult.errors?.length > 0) {
            allErrors.push(...leagueResult.errors.slice(0, 3)); // Cap at 3 per league
          }
        }
      }
    }

    // Summary
    const summary = {
      job,
      leagues: leagues || "all",
      duration,
      fetched: (results.discover?.totalFetched || 0) + (results.sync?.totalFetched || 0),
      upserted: (results.discover?.totalUpserted || 0) + (results.sync?.totalUpserted || 0),
      finalized: (results.sync?.totalFinalized || 0) + (results.finalize?.totalFinalized || 0),
      enqueued: (results.sync?.totalEnqueued || 0) + (results.finalize?.totalEnqueued || 0),
    };

    console.log(`[admin:lifecycle] Job complete:`, summary);

    // Determine overall success
    const overallSuccess = 
      (results.discover?.success ?? true) && 
      (results.sync?.success ?? true) && 
      (results.finalize?.success ?? true);

    return NextResponse.json({
      success: overallSuccess,
      summary,
      results,
      firstError,
      errors: allErrors.slice(0, 10), // Return up to 10 errors
    });

  } catch (err) {
    console.error("[admin:lifecycle] Job error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Return job documentation
  return NextResponse.json({
    endpoint: "/api/admin/lifecycle/jobs",
    method: "POST",
    description: "Trigger lifecycle jobs manually",
    body: {
      job: "discover | sync | finalize | all (required)",
      leagues: "['NFL', 'NBA', ...] (optional, defaults to all)",
    },
    jobs: {
      discover: "Ingest games for rolling 72h window (36h back, 36h forward)",
      sync: "Update scores/status for live games, finalize completed games",
      finalize: "Catch stuck games, mark FINAL, enqueue settlements",
      all: "Run discover → sync → finalize in sequence",
    },
  });
}
