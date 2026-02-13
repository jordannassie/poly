export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { usesApiSportsCache, usesSportsTeamsCache, isValidFrontendLeague, ALL_FRONTEND_LEAGUES } from "@/lib/sports/providers";
import { getNflTeamsFromCache, transformCachedTeamToLegacyFormat } from "@/lib/sports/nfl-cache";
import { getSimplifiedTeamsFromCache } from "@/lib/sports/sports-teams-cache";

export async function GET(request: NextRequest) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const msg = "Service role key not configured";
      console.error("[/api/sports/teams] ERROR:", msg);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
    const url = new URL(request.url);
    const leagueParam = url.searchParams.get("league")?.toLowerCase() || "nfl";

    // Validate league (includes soccer)
    if (!isValidFrontendLeague(leagueParam)) {
      return NextResponse.json(
        { error: `Invalid league. Must be one of: ${ALL_FRONTEND_LEAGUES.join(", ")}` },
        { status: 400 }
      );
    }

    const league = leagueParam;

    // NFL uses API-Sports cache from Supabase (api_sports_nfl_teams table)
    if (usesApiSportsCache(league)) {
      const cachedTeams = await getNflTeamsFromCache();
      const simplifiedTeams = cachedTeams.map(transformCachedTeamToLegacyFormat);
      
      // NFL has 32 teams
      const expectedCount = 32;
      const isMissingTeams = simplifiedTeams.length < expectedCount;
      
      console.log(`[/api/sports/teams] ${league.toUpperCase()} (api-sports-cache): ${simplifiedTeams.length}/${expectedCount} teams`);

      return NextResponse.json({
        league,
        source: "api-sports-cache",
        count: simplifiedTeams.length,
        expectedCount,
        isMissingTeams,
        teams: simplifiedTeams,
      });
    }

    // All non-NFL leagues use sports_teams cache from Supabase
    if (usesSportsTeamsCache(league)) {
      const simplifiedTeams = await getSimplifiedTeamsFromCache(league);
      const teamCount = simplifiedTeams.length;
      
      // Expected counts per league
      const expectedCounts: Record<string, number> = {
        nba: 30,
        mlb: 30,
        nhl: 32,
        soccer: 20, // Just Premier League by default
      };
      const expectedCount = expectedCounts[league] || 0;
      const isMissingTeams = teamCount === 0;
      
      console.log(`[/api/sports/teams] ${league.toUpperCase()} (sports-teams-cache): ${teamCount} teams`);

      // If no teams synced yet, return empty with helpful message (not an error)
      if (teamCount === 0) {
        return NextResponse.json({
          league,
          source: "sports-teams-cache",
          count: 0,
          expectedCount,
          isMissingTeams: true,
          syncRequired: true,
          teams: [],
          message: `Teams will appear once synced from Admin.`,
        });
      }

      return NextResponse.json({
        league,
        source: "sports-teams-cache",
        count: teamCount,
        expectedCount,
        isMissingTeams: teamCount < expectedCount,
        teams: simplifiedTeams,
      });
    }

    // Fallback: return empty (no live API calls)
    console.log(`[/api/sports/teams] ${league.toUpperCase()}: no data source configured`);

    return NextResponse.json({
      league,
      source: "none",
      count: 0,
      teams: [],
      message: "Teams will appear once synced from Admin.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/sports/teams] Error:", message);
    
    // Return empty instead of error for frontend
    return NextResponse.json({
      league: "unknown",
      source: "error",
      count: 0,
      teams: [],
      message: "Teams will appear once synced from Admin.",
    });
  }
}
