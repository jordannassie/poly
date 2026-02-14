/**
 * GET /api/search?q=<query>
 * 
 * Global search across teams and upcoming games.
 * Returns matching teams (with logos) and upcoming games.
 * 
 * Response: { teams: [...], games: [...] }
 */

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/serverServiceClient";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("q")?.trim();

    if (!query || query.length < 2) {
      return NextResponse.json({ teams: [], games: [] });
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

    // Search upcoming games: home_team or away_team matches query
    const now = new Date().toISOString();
    const { data: gameData } = await client
      .from("sports_games")
      .select("id, external_game_id, league, home_team, away_team, starts_at, status, status_norm")
      .or(`home_team.ilike.%${query}%,away_team.ilike.%${query}%`)
      .gte("starts_at", now)
      .order("starts_at", { ascending: true })
      .limit(5);

    // Build a quick team map for logos
    const teamNames = new Set<string>();
    (gameData || []).forEach((g) => {
      if (g.home_team) teamNames.add(g.home_team);
      if (g.away_team) teamNames.add(g.away_team);
    });

    const logoMap = new Map<string, string | null>();
    if (teamNames.size > 0) {
      // Get logos for teams appearing in games
      for (const t of teams) {
        logoMap.set(t.name.toLowerCase(), t.logo);
      }
      // Also check the team results we already have
      if (teamData) {
        for (const t of teamData) {
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

    return NextResponse.json({ teams, games });
  } catch (error) {
    console.error("[/api/search] Error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ teams: [], games: [] });
  }
}
