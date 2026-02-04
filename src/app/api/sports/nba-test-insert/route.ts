/**
 * GET /api/sports/nba-test-insert
 * 
 * Test endpoint to try inserting an NBA game and show any errors.
 * TEMPORARY - remove after debugging.
 */

import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { apiSportsFetchSafe, buildApiSportsUrl } from "@/lib/apiSports/client";

const API_SPORTS_KEY = process.env.API_SPORTS_KEY;

export async function GET() {
  const results: any = {
    step1_apiKey: !!API_SPORTS_KEY,
    step2_adminClient: false,
    step3_fetchGames: null,
    step4_normalize: null,
    step5_insert: null,
    step6_verify: null,
  };

  if (!API_SPORTS_KEY) {
    return NextResponse.json({ ...results, error: "No API key" });
  }

  const adminClient = getAdminClient();
  results.step2_adminClient = !!adminClient;
  
  if (!adminClient) {
    return NextResponse.json({ ...results, error: "No admin client - check SUPABASE_SERVICE_ROLE_KEY" });
  }

  // Step 3: Fetch games from NBA API
  const today = new Date().toISOString().split("T")[0];
  const baseUrl = "https://v1.basketball.api-sports.io";
  const season = "2025-2026";
  const endpoint = `/games?date=${today}&league=12&season=${season}`;
  const url = buildApiSportsUrl(baseUrl, endpoint);
  
  const fetchResult = await apiSportsFetchSafe<any>(url, API_SPORTS_KEY);
  
  if (!fetchResult.ok) {
    results.step3_fetchGames = { ok: false, error: fetchResult.message };
    return NextResponse.json(results);
  }
  
  const games = fetchResult.data.response || [];
  results.step3_fetchGames = { ok: true, count: games.length };
  
  if (games.length === 0) {
    return NextResponse.json({ ...results, error: "No games returned from API" });
  }

  // Step 4: Normalize first game
  const game = games[0];
  const normalized = {
    league: "nba",
    external_game_id: String(game.id),
    provider: "api-sports",
    season: 2025,
    starts_at: game.date,
    status: game.status?.long || "scheduled",
    home_team: game.teams?.home?.name || "Unknown",
    away_team: game.teams?.away?.name || "Unknown",
    home_score: game.scores?.home?.total ?? null,
    away_score: game.scores?.away?.total ?? null,
  };
  
  results.step4_normalize = normalized;

  // Step 5: Try to insert
  const { data: insertData, error: insertError } = await adminClient
    .from("sports_games")
    .upsert(normalized, {
      onConflict: "league,external_game_id",
    })
    .select();
  
  results.step5_insert = {
    data: insertData,
    error: insertError ? { message: insertError.message, code: insertError.code, details: insertError.details } : null,
  };

  // Step 6: Verify it was inserted
  const { data: verifyData, error: verifyError } = await adminClient
    .from("sports_games")
    .select("*")
    .eq("league", "nba")
    .eq("external_game_id", String(game.id))
    .single();
  
  results.step6_verify = {
    found: !!verifyData,
    data: verifyData,
    error: verifyError ? { message: verifyError.message, code: verifyError.code } : null,
  };

  return NextResponse.json(results);
}
