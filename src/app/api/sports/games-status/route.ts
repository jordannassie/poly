/**
 * GET /api/sports/games-status
 * 
 * Public endpoint to check game counts by league.
 * Helps diagnose sync issues.
 * 
 * Note: This route must NOT be evaluated at build time.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Force dynamic rendering - this route queries the database
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Ensure Next.js treats this as a runtime-only route
export const fetchCache = 'force-no-store';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export async function GET(request: NextRequest) {
  // Early return for build-time - don't query DB
  if (process.env.NODE_ENV === 'production' && !supabaseUrl) {
    return NextResponse.json({ 
      message: "Status endpoint - use at runtime",
      timestamp: new Date().toISOString()
    });
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const client = createClient(supabaseUrl, supabaseAnonKey);
  const now = new Date().toISOString();
  const leagues = ["nfl", "nba", "nhl", "mlb", "soccer"];

  // Run all queries in parallel for speed
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // Get total count and league queries in parallel
  const [
    { count: totalTableCount },
    ...leagueResults
  ] = await Promise.all([
    // Total count
    client.from("sports_games").select("id", { count: "exact", head: true }),
    // Per-league queries (5 leagues, 4 queries each = 20 queries in parallel)
    ...leagues.flatMap(league => [
      client.from("sports_games").select("id", { count: "exact", head: true }).eq("league", league),
      client.from("sports_games").select("id", { count: "exact", head: true }).eq("league", league).gte("starts_at", now),
      client.from("sports_games").select("id", { count: "exact", head: true }).eq("league", league).gte("starts_at", todayStart.toISOString()).lte("starts_at", todayEnd.toISOString()),
      client.from("sports_games").select("id, external_game_id, home_team, away_team, status, starts_at").eq("league", league).gte("starts_at", now).order("starts_at", { ascending: true }).limit(3),
    ])
  ]);

  const results: Record<string, any> = {
    timestamp: now,
    leagues: {},
  };

  // Process parallel results (4 results per league)
  for (let i = 0; i < leagues.length; i++) {
    const league = leagues[i];
    const baseIdx = i * 4;
    
    const totalCount = leagueResults[baseIdx]?.count || 0;
    const upcomingCount = leagueResults[baseIdx + 1]?.count || 0;
    const todayCount = leagueResults[baseIdx + 2]?.count || 0;
    const nextGames = leagueResults[baseIdx + 3]?.data || [];

    results.leagues[league.toUpperCase()] = {
      total: totalCount,
      upcoming: upcomingCount,
      today: todayCount,
      nextGames,
    };
  }

  results.debug = {
    totalGamesInTable: totalTableCount || 0,
    supabaseUrl: supabaseUrl.split('.')[0] + "..."
  };

  return NextResponse.json(results);
}
