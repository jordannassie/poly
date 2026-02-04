/**
 * GET /api/sports/nba-sync-debug
 * 
 * Debug the actual sync flow for NBA to see what's failing.
 * TEMPORARY - remove after debugging.
 */

import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { syncGamesForDateRange } from "@/lib/apiSports/gameSync";
import { SupportedLeague } from "@/lib/apiSports/leagueConfig";

export async function GET() {
  const results: any = {
    adminClient: false,
    syncResult: null,
    verifyCount: null,
  };

  const adminClient = getAdminClient();
  results.adminClient = !!adminClient;
  
  if (!adminClient) {
    return NextResponse.json({ ...results, error: "No admin client - check SUPABASE_SERVICE_ROLE_KEY" });
  }

  // Run actual sync for today only
  const today = new Date().toISOString().split("T")[0];
  
  console.log(`[nba-sync-debug] Starting sync for ${today}`);
  
  const syncResult = await syncGamesForDateRange(
    adminClient,
    "NBA" as SupportedLeague,
    today,
    today
  );
  
  results.syncResult = syncResult;
  
  // Verify how many NBA games are in the database now
  const { count, error } = await adminClient
    .from("sports_games")
    .select("id", { count: "exact", head: true })
    .eq("league", "nba");
  
  results.verifyCount = { count, error: error?.message };
  
  // Get a few NBA games to show
  const { data: sampleGames } = await adminClient
    .from("sports_games")
    .select("*")
    .eq("league", "nba")
    .order("starts_at", { ascending: true })
    .limit(5);
  
  results.sampleGames = sampleGames;
  
  return NextResponse.json(results);
}
