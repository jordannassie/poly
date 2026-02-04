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
  externalGameId: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamLogo: string | null;
  awayTeamLogo: string | null;
  homeScore: number | null;
  awayScore: number | null;
  startTime: string;
  status: string;
  isHome: boolean;
  league: string;
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
    // Using correct column names: home_team_api_id and away_team_api_id
    const { data: games, error } = await client
      .from("sports_games")
      .select("*")
      .eq("league", league.toLowerCase())
      .or(`home_team_api_id.eq.${teamIdNum},away_team_api_id.eq.${teamIdNum}`)
      .order("starts_at", { ascending: true })
      .limit(20);

    if (error) {
      console.error("[/api/teams/games] Error:", error.message, error.hint);
      return NextResponse.json({ error: error.message, games: [] }, { status: 500 });
    }

    if (!games || games.length === 0) {
      return NextResponse.json({ 
        games: [], 
        message: "No games found. Games will appear once synced from Admin." 
      });
    }

    // Get team info (names and logos) for the games
    const teamIds = new Set<number>();
    for (const game of games) {
      if (game.home_team_api_id) teamIds.add(game.home_team_api_id);
      if (game.away_team_api_id) teamIds.add(game.away_team_api_id);
    }

    const { data: teams } = await client
      .from("sports_teams")
      .select("api_team_id, name, logo_url")
      .eq("league", league.toLowerCase())
      .in("api_team_id", Array.from(teamIds));

    const teamMap = new Map<number, { name: string; logo: string | null }>();
    for (const team of teams || []) {
      teamMap.set(team.api_team_id, { name: team.name, logo: team.logo_url });
    }

    // Transform games
    const transformedGames: GameResponse[] = games.map(game => {
      const homeTeamInfo = teamMap.get(game.home_team_api_id);
      const awayTeamInfo = teamMap.get(game.away_team_api_id);
      
      return {
        id: game.id,
        externalGameId: game.external_game_id,
        homeTeam: homeTeamInfo?.name || game.home_team || `Team ${game.home_team_api_id}`,
        awayTeam: awayTeamInfo?.name || game.away_team || `Team ${game.away_team_api_id}`,
        homeTeamLogo: homeTeamInfo?.logo || null,
        awayTeamLogo: awayTeamInfo?.logo || null,
        homeScore: game.home_score,
        awayScore: game.away_score,
        startTime: game.starts_at,
        status: game.status || "scheduled",
        isHome: game.home_team_api_id === teamIdNum,
        league: league.toLowerCase(),
      };
    });

    return NextResponse.json({
      games: transformedGames,
      count: transformedGames.length,
      teamId: teamIdNum,
      league: league.toLowerCase(),
    });
  } catch (error) {
    console.error("[/api/teams/games] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch games", games: [] },
      { status: 500 }
    );
  }
}
