/**
 * GET /api/search?q=<query>
 * 
 * Global search across teams, upcoming games, and users.
 * Returns matching teams (with logos), upcoming games, and user profiles.
 * 
 * Response: { teams: [...], games: [...], users: [...] }
 */

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/serverServiceClient";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("q")?.trim();

    if (!query || query.length < 2) {
      return NextResponse.json({ teams: [], games: [], users: [] });
    }

    const client = getServiceClient();

    // Search teams: name matches query (case-insensitive)
    const { data: teamData } = await client
      .from("sports_teams")
      .select("id, name, logo, league, slug")
      .ilike("name", `%${query}%`)
      .limit(8);

    const teams = (teamData || []).map((t) => ({
      id: t.id,
      name: t.name,
      logo: t.logo,
      league: t.league,
      slug: t.slug,
      href: `/teams/${t.league}/${t.slug}`,
    }));

    // Search games: upcoming first, plus recent past games
    // Use * wildcard (PostgREST syntax) instead of % in .or() filters
    const now = new Date();
    const recentPast = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: gameData, error: gameError } = await client
      .from("sports_games")
      .select("id, external_game_id, league, home_team, away_team, starts_at, status, status_norm")
      .or(`home_team.ilike.*${query}*,away_team.ilike.*${query}*`)
      .gte("starts_at", recentPast)
      .order("starts_at", { ascending: true })
      .limit(8);

    if (gameError) {
      console.error("[/api/search] Game query error:", gameError.message);
    }

    // Build logo map for all game teams
    const logoMap = new Map<string, string | null>();
    // Seed from team search results
    if (teamData) {
      for (const t of teamData) {
        logoMap.set(t.name.toLowerCase(), t.logo);
      }
    }
    // Fetch logos for any game teams not already in the map
    const missingTeamNames: string[] = [];
    (gameData || []).forEach((g) => {
      if (g.home_team && !logoMap.has(g.home_team.toLowerCase())) missingTeamNames.push(g.home_team);
      if (g.away_team && !logoMap.has(g.away_team.toLowerCase())) missingTeamNames.push(g.away_team);
    });
    if (missingTeamNames.length > 0) {
      const { data: extraTeams } = await client
        .from("sports_teams")
        .select("name, logo")
        .in("name", [...new Set(missingTeamNames)]);
      if (extraTeams) {
        for (const t of extraTeams) {
          logoMap.set(t.name.toLowerCase(), t.logo);
        }
      }
    }

    const games = (gameData || []).map((g) => ({
      id: g.id,
      gameId: g.external_game_id,
      league: g.league,
      homeTeam: g.home_team,
      awayTeam: g.away_team,
      homeLogo: logoMap.get(g.home_team?.toLowerCase()) || null,
      awayLogo: logoMap.get(g.away_team?.toLowerCase()) || null,
      startsAt: g.starts_at,
      status: g.status_norm || g.status,
      href: `/${g.league}/game/${g.external_game_id}`,
    }));

    // Search users: username or display_name matches query
    const { data: userData } = await client
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .or(`username.ilike.*${query}*,display_name.ilike.*${query}*`)
      .limit(5);

    const users = (userData || [])
      .filter((u) => u.username) // Only users with usernames
      .map((u) => ({
        id: u.id,
        username: u.username,
        displayName: u.display_name,
        avatarUrl: u.avatar_url,
        href: `/u/${u.username}`,
      }));

    return NextResponse.json({ teams, games, users });
  } catch (error) {
    console.error("[/api/search] Error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ teams: [], games: [], users: [] });
  }
}
