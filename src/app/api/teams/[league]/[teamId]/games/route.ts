/**
 * GET /api/teams/[league]/[teamId]/games
 * 
 * Fetches upcoming and recent games for a specific team.
 * Uses the sports_games table which contains cached game data.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function getClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

interface GameResponse {
  id: number;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  startTime: string;
  status: string;
  isHome: boolean;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { league: string; teamId: string } }
) {
  const { league, teamId } = params;
  const teamIdNum = parseInt(teamId, 10);

  if (isNaN(teamIdNum)) {
    return NextResponse.json({ error: "Invalid team ID", games: [] }, { status: 400 });
  }

  const client = getClient();
  if (!client) {
    return NextResponse.json({ error: "Database not configured", games: [] }, { status: 500 });
  }

  try {
    // Fetch games where this team is home or away
    const { data: games, error } = await client
      .from("sports_games")
      .select("*")
      .eq("league", league.toUpperCase())
      .or(`home_team_id.eq.${teamIdNum},away_team_id.eq.${teamIdNum}`)
      .order("start_time", { ascending: true })
      .limit(10);

    if (error) {
      console.error("[/api/teams/games] Error:", error.message);
      return NextResponse.json({ error: error.message, games: [] }, { status: 500 });
    }

    if (!games || games.length === 0) {
      return NextResponse.json({ 
        games: [], 
        message: "No games found. Games will appear once synced from Admin." 
      });
    }

    // Get team names for the games
    const teamIds = new Set<number>();
    for (const game of games) {
      if (game.home_team_id) teamIds.add(game.home_team_id);
      if (game.away_team_id) teamIds.add(game.away_team_id);
    }

    const { data: teams } = await client
      .from("sports_teams")
      .select("api_team_id, name")
      .eq("league", league.toUpperCase())
      .in("api_team_id", Array.from(teamIds));

    const teamMap = new Map<number, string>();
    for (const team of teams || []) {
      teamMap.set(team.api_team_id, team.name);
    }

    // Transform games
    const transformedGames: GameResponse[] = games.map(game => ({
      id: game.api_game_id,
      homeTeam: teamMap.get(game.home_team_id) || `Team ${game.home_team_id}`,
      awayTeam: teamMap.get(game.away_team_id) || `Team ${game.away_team_id}`,
      homeScore: game.home_score,
      awayScore: game.away_score,
      startTime: game.start_time,
      status: game.status || "Scheduled",
      isHome: game.home_team_id === teamIdNum,
    }));

    return NextResponse.json({
      games: transformedGames,
      count: transformedGames.length,
      teamId: teamIdNum,
      league: league.toUpperCase(),
    });
  } catch (error) {
    console.error("[/api/teams/games] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch games", games: [] },
      { status: 500 }
    );
  }
}
