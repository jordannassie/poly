/**
 * GET /api/sports/nba-sync-debug
 * 
 * Debug the actual sync flow for NBA to see what's failing.
 * TEMPORARY - remove after debugging.
 */

import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { fetchGamesForDate, seasonForDate } from "@/lib/apiSports/gameSync";
import { SupportedLeague } from "@/lib/apiSports/leagueConfig";

export async function GET() {
  const results: any = {
    adminClient: false,
    fetchResult: null,
    normalizedGames: [],
    insertResults: [],
    verifyCount: null,
  };

  const adminClient = getAdminClient();
  results.adminClient = !!adminClient;
  
  if (!adminClient) {
    return NextResponse.json({ ...results, error: "No admin client - check SUPABASE_SERVICE_ROLE_KEY" });
  }

  const today = new Date().toISOString().split("T")[0];
  
  // Step 1: Fetch raw games
  try {
    const rawGames = await fetchGamesForDate("NBA" as SupportedLeague, today);
    results.fetchResult = { count: rawGames.length };
    
    // Step 2: Manually normalize each game and try to insert
    for (const game of rawGames.slice(0, 3)) { // Only first 3 for testing
      const dateObj = game.game?.date ?? game.date;
      const gameId = game.game?.id ?? game.id;
      const statusObj = game.game?.status ?? game.status;
      
      // Parse date
      let startTime: string | null = null;
      if (dateObj) {
        if (dateObj.timestamp) {
          startTime = new Date(Number(dateObj.timestamp) * 1000).toISOString();
        } else if (dateObj.date && dateObj.time) {
          startTime = new Date(`${dateObj.date}T${dateObj.time}:00Z`).toISOString();
        } else if (typeof dateObj === "string") {
          startTime = new Date(dateObj).toISOString();
        } else if (dateObj.date && typeof dateObj.date === "string") {
          startTime = new Date(dateObj.date).toISOString();
        }
      }
      
      // Parse status
      let status: string | null = null;
      if (statusObj) {
        if (typeof statusObj === "string") status = statusObj;
        else if (statusObj.long) status = statusObj.long;
        else if (statusObj.short) status = statusObj.short;
      }
      
      const normalized = {
        league: "nba",
        external_game_id: String(gameId),
        provider: "api-sports",
        season: seasonForDate("NBA", new Date(today)),
        starts_at: startTime,
        status: status ?? "scheduled",
        home_team: game.teams?.home?.name ?? "Unknown",
        away_team: game.teams?.away?.name ?? "Unknown",
        home_score: game.scores?.home?.total ?? null,
        away_score: game.scores?.away?.total ?? null,
      };
      
      // Check for issues
      const issues = [];
      if (!gameId) issues.push("no gameId");
      if (!startTime) issues.push("no startTime");
      if (!normalized.home_team || normalized.home_team === "Unknown") issues.push("no home_team");
      if (!normalized.away_team || normalized.away_team === "Unknown") issues.push("no away_team");
      
      // Try to insert
      const { data: insertData, error: insertError } = await adminClient
        .from("sports_games")
        .upsert(normalized, { onConflict: "league,external_game_id" })
        .select();
      
      results.normalizedGames.push({
        rawId: game.id,
        rawDate: game.date,
        rawDateType: typeof game.date,
        parsedStartTime: startTime,
        parsedStatus: status,
        normalized,
        issues,
        insertResult: {
          success: !insertError,
          data: insertData,
          error: insertError ? { message: insertError.message, code: insertError.code, hint: insertError.hint } : null,
        },
      });
    }
  } catch (err) {
    results.fetchError = err instanceof Error ? err.message : "Unknown";
  }

  // Verify count
  const { count } = await adminClient
    .from("sports_games")
    .select("id", { count: "exact", head: true })
    .eq("league", "nba");
  
  results.verifyCount = count;

  return NextResponse.json(results);
}
