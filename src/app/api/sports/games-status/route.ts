/**
 * GET /api/sports/games-status
 * 
 * Public endpoint to check game counts by league.
 * Helps diagnose sync issues.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export async function GET(request: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const client = createClient(supabaseUrl, supabaseAnonKey);
  const now = new Date().toISOString();
  const leagues = ["nfl", "nba", "nhl", "mlb", "soccer"];

  const results: Record<string, any> = {
    timestamp: now,
    leagues: {},
  };

  for (const league of leagues) {
    // Count total games
    const { count: totalCount } = await client
      .from("sports_games")
      .select("id", { count: "exact", head: true })
      .eq("league", league);

    // Count upcoming games
    const { count: upcomingCount } = await client
      .from("sports_games")
      .select("id", { count: "exact", head: true })
      .eq("league", league)
      .gte("starts_at", now);

    // Count today's games
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const { count: todayCount } = await client
      .from("sports_games")
      .select("id", { count: "exact", head: true })
      .eq("league", league)
      .gte("starts_at", todayStart.toISOString())
      .lte("starts_at", todayEnd.toISOString());

    // Count live games (status contains 'live' or 'in_progress')
    const { data: liveGames } = await client
      .from("sports_games")
      .select("id, external_game_id, home_team, away_team, status, starts_at")
      .eq("league", league)
      .or("status.ilike.%live%,status.ilike.%in_progress%,status.ilike.%1H%,status.ilike.%2H%,status.ilike.%Q%")
      .limit(5);

    // Get next 3 upcoming games
    const { data: nextGames } = await client
      .from("sports_games")
      .select("id, external_game_id, home_team, away_team, status, starts_at")
      .eq("league", league)
      .gte("starts_at", now)
      .order("starts_at", { ascending: true })
      .limit(3);

    results.leagues[league.toUpperCase()] = {
      total: totalCount || 0,
      upcoming: upcomingCount || 0,
      today: todayCount || 0,
      liveCount: liveGames?.length || 0,
      liveGames: liveGames || [],
      nextGames: nextGames || [],
    };
  }

  return NextResponse.json(results);
}
