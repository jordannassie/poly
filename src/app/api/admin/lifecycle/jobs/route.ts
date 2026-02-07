/**
 * Admin Lifecycle Jobs API (BATCHED)
 * 
 * POST /api/admin/lifecycle/jobs
 * 
 * Trigger lifecycle jobs manually with batch limits to prevent 504 timeouts.
 * - discover: Ingest games for rolling window (1 league per call)
 * - sync: Update live games (max 25 games per call)
 * - finalize: Mark games FINAL (max 25 games per call)
 * - all: Run one batch of each step
 * 
 * Returns immediately with progress info. Call again to continue processing.
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

// Batch limits to prevent timeouts (each request should complete in ~2-5s)
const BATCH_LIMITS = {
  discoverLeaguesPerBatch: 1,   // Process 1 league at a time
  syncGamesPerBatch: 25,        // Max games per sync batch
  finalizeGamesPerBatch: 25,    // Max games per finalize batch
};

// League order for cursor-based processing
const ENABLED_LEAGUES = ['NFL', 'NBA', 'NHL', 'MLB', 'SOCCER'] as const;

export async function POST(request: NextRequest) {
  // Require admin auth
  const authResult = requireAdmin(request);
  if (!authResult.authenticated) {
    return authResult.error || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const job = body.job as string;
    const cursor = body.cursor as { leagueIndex?: number; step?: string } | undefined;

    if (!job) {
      return NextResponse.json(
        { error: "Missing 'job' parameter. Options: discover, sync, finalize, all" },
        { status: 400 }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const results: any = {};
    const startTime = Date.now();
    let nextCursor: any = null;
    let hasMore = false;

    if (job === "all") {
      // Run one batch of each step in sequence
      // Step 1: Discover (one league at a time)
      const currentStep = cursor?.step || 'discover';
      const leagueIndex = cursor?.leagueIndex || 0;
      
      if (currentStep === 'discover') {
        if (leagueIndex < ENABLED_LEAGUES.length) {
          const league = ENABLED_LEAGUES[leagueIndex];
          console.log(`[admin:lifecycle] BATCH discover league=${league} index=${leagueIndex}/${ENABLED_LEAGUES.length}`);
          
          results.discover = await discoverGamesRollingWindow(adminClient, { 
            leagues: [league] as any,
            maxGamesPerLeague: 100, // Limit games per league
          });
          
          if (leagueIndex + 1 < ENABLED_LEAGUES.length) {
            nextCursor = { step: 'discover', leagueIndex: leagueIndex + 1 };
            hasMore = true;
          } else {
            nextCursor = { step: 'sync', leagueIndex: 0 };
            hasMore = true;
          }
        } else {
          nextCursor = { step: 'sync', leagueIndex: 0 };
          hasMore = true;
        }
      }
      
      if (currentStep === 'sync') {
        if (leagueIndex < ENABLED_LEAGUES.length) {
          const league = ENABLED_LEAGUES[leagueIndex];
          console.log(`[admin:lifecycle] BATCH sync league=${league} index=${leagueIndex}/${ENABLED_LEAGUES.length}`);
          
          results.sync = await syncLiveAndWindowGames(adminClient, { 
            leagues: [league] as any,
            maxGames: BATCH_LIMITS.syncGamesPerBatch,
          });
          
          if (leagueIndex + 1 < ENABLED_LEAGUES.length) {
            nextCursor = { step: 'sync', leagueIndex: leagueIndex + 1 };
            hasMore = true;
          } else {
            nextCursor = { step: 'finalize', leagueIndex: 0 };
            hasMore = true;
          }
        } else {
          nextCursor = { step: 'finalize', leagueIndex: 0 };
          hasMore = true;
        }
      }
      
      if (currentStep === 'finalize') {
        if (leagueIndex < ENABLED_LEAGUES.length) {
          const league = ENABLED_LEAGUES[leagueIndex];
          console.log(`[admin:lifecycle] BATCH finalize league=${league} index=${leagueIndex}/${ENABLED_LEAGUES.length}`);
          
          results.finalize = await finalizeAndEnqueueSettlements(adminClient, { 
            leagues: [league] as any,
            maxGames: BATCH_LIMITS.finalizeGamesPerBatch,
          });
          
          if (leagueIndex + 1 < ENABLED_LEAGUES.length) {
            nextCursor = { step: 'finalize', leagueIndex: leagueIndex + 1 };
            hasMore = true;
          } else {
            // All done
            nextCursor = null;
            hasMore = false;
          }
        } else {
          nextCursor = null;
          hasMore = false;
        }
      }
    } else {
      // Single job - process one league at a time
      const leagueIndex = cursor?.leagueIndex || 0;
      
      if (leagueIndex >= ENABLED_LEAGUES.length) {
        return NextResponse.json({
          success: true,
          complete: true,
          message: "All leagues processed",
        });
      }
      
      const league = ENABLED_LEAGUES[leagueIndex];
      
      if (job === "discover") {
        console.log(`[admin:lifecycle] BATCH discover league=${league}`);
        results.discover = await discoverGamesRollingWindow(adminClient, { 
          leagues: [league] as any,
          maxGamesPerLeague: 100,
        });
      } else if (job === "sync") {
        console.log(`[admin:lifecycle] BATCH sync league=${league}`);
        results.sync = await syncLiveAndWindowGames(adminClient, { 
          leagues: [league] as any,
          maxGames: BATCH_LIMITS.syncGamesPerBatch,
        });
      } else if (job === "finalize") {
        console.log(`[admin:lifecycle] BATCH finalize league=${league}`);
        results.finalize = await finalizeAndEnqueueSettlements(adminClient, { 
          leagues: [league] as any,
          maxGames: BATCH_LIMITS.finalizeGamesPerBatch,
        });
      } else {
        return NextResponse.json(
          { error: `Unknown job: ${job}. Options: discover, sync, finalize, all` },
          { status: 400 }
        );
      }
      
      if (leagueIndex + 1 < ENABLED_LEAGUES.length) {
        nextCursor = { leagueIndex: leagueIndex + 1 };
        hasMore = true;
      }
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
            allErrors.push(...leagueResult.errors.slice(0, 3));
          }
        }
      }
    }

    // Summary
    const summary = {
      job,
      duration,
      fetched: (results.discover?.totalFetched || 0) + (results.sync?.totalFetched || 0),
      upserted: (results.discover?.totalUpserted || 0) + (results.sync?.totalUpserted || 0),
      finalized: (results.sync?.totalFinalized || 0) + (results.finalize?.totalFinalized || 0),
      enqueued: (results.sync?.totalEnqueued || 0) + (results.finalize?.totalEnqueued || 0),
    };

    console.log(`[admin:lifecycle] BATCH complete:`, { ...summary, hasMore, nextCursor });

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
      errors: allErrors.slice(0, 10),
      // Batch info for UI
      hasMore,
      nextCursor,
      batchInfo: {
        currentStep: cursor?.step || job,
        leagueIndex: cursor?.leagueIndex || 0,
        totalLeagues: ENABLED_LEAGUES.length,
        currentLeague: ENABLED_LEAGUES[cursor?.leagueIndex || 0],
      },
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
