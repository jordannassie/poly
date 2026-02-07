/**
 * Admin Settlement Queue API
 * 
 * GET /api/admin/lifecycle/settlements - List queue items and stats
 * POST /api/admin/lifecycle/settlements - Process settlements
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import {
  listSettlementQueue,
  getQueueStats,
  processAllSettlements,
  lockNextQueueItem,
  processSettlement,
} from "@/lib/lifecycle";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  // Require admin auth
  const authResult = requireAdmin(request);
  if (!authResult.authenticated) {
    return authResult.error || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const url = new URL(request.url);
    
    const status = url.searchParams.get("status");
    const league = url.searchParams.get("league");
    const limit = parseInt(url.searchParams.get("limit") || "50");

    // Get queue items
    const items = await listSettlementQueue(adminClient, {
      status: status ? status.split(",") : undefined,
      league: league || undefined,
      limit,
    });

    // Get stats
    const stats = await getQueueStats(adminClient);

    // Get recent game info for items
    const gameIds = items.map(i => i.game_id);
    let games: any[] = [];
    
    if (gameIds.length > 0) {
      const { data } = await adminClient
        .from("sports_games")
        .select("id, home_team, away_team, starts_at, status_norm, winner_side")
        .in("id", gameIds);
      games = data || [];
    }

    const gamesMap = new Map(games.map(g => [g.id, g]));

    // Enrich items with game info
    const enrichedItems = items.map(item => ({
      ...item,
      game: gamesMap.get(item.game_id) || null,
    }));

    return NextResponse.json({
      stats,
      items: enrichedItems,
    });

  } catch (err) {
    console.error("[admin:settlements] List error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Require admin auth
  const authResult = requireAdmin(request);
  if (!authResult.authenticated) {
    return authResult.error || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const action = body.action as string;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    if (action === "process-one") {
      // Process a single item
      const item = await lockNextQueueItem(adminClient);
      
      if (!item) {
        return NextResponse.json({
          success: true,
          message: "No items available for processing",
          processed: 0,
        });
      }

      const result = await processSettlement(adminClient, item);
      
      return NextResponse.json({
        success: result.success,
        result,
      });

    } else if (action === "process-all" || action === "process-batch") {
      // Process all available items
      const maxItems = body.maxItems || 50;
      const results = await processAllSettlements(adminClient, { maxItems });

      return NextResponse.json({
        success: true,
        ...results,
      });

    } else if (action === "retry-failed") {
      // Reset failed items to QUEUED for retry
      const { data, error } = await adminClient
        .from("settlement_queue")
        .update({
          status: "QUEUED",
          next_attempt_at: new Date().toISOString(),
          locked_by: null,
          locked_at: null,
        })
        .eq("status", "FAILED")
        .select("id");

      if (error) {
        throw new Error(error.message);
      }

      return NextResponse.json({
        success: true,
        reset: data?.length || 0,
      });

    } else {
      return NextResponse.json({
        error: "Unknown action. Options: process-one, process-all, process-batch, retry-failed",
      }, { status: 400 });
    }

  } catch (err) {
    console.error("[admin:settlements] Action error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
