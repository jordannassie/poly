/**
 * GET /api/sports/teams
 * Returns teams for a league with logo URLs.
 * 
 * Query params:
 * - league: "nfl" | "nba" | "mlb" | "nhl" (required)
 * 
 * Response: { league, count, teams: [{teamId, name, city, abbreviation, logoUrl, primaryColor, secondaryColor}] }
 * 
 * NFL uses API-Sports cache (Supabase), other leagues use SportsDataIO.
 */

import { NextRequest, NextResponse } from "next/server";
import { getTeams, getTeamLogoUrl, SUPPORTED_LEAGUES, type League } from "@/lib/sportsdataio/client";
import { usesApiSportsCache } from "@/lib/sports/providers";
import { getNflTeamsFromCache, transformCachedTeamToLegacyFormat } from "@/lib/sports/nfl-cache";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const leagueParam = url.searchParams.get("league")?.toLowerCase() || "nfl";

    // Validate league
    if (!SUPPORTED_LEAGUES.includes(leagueParam as League)) {
      return NextResponse.json(
        { error: `Invalid league. Must be one of: ${SUPPORTED_LEAGUES.join(", ")}` },
        { status: 400 }
      );
    }

    const league = leagueParam as League;

    // NFL uses API-Sports cache from Supabase
    if (usesApiSportsCache(league)) {
      const cachedTeams = await getNflTeamsFromCache();
      const simplifiedTeams = cachedTeams.map(transformCachedTeamToLegacyFormat);
      
      // NFL has 32 teams
      const expectedCount = 32;
      const isMissingTeams = simplifiedTeams.length < expectedCount;
      
      console.log(`[/api/sports/teams] ${league.toUpperCase()} (cache): ${simplifiedTeams.length}/${expectedCount} teams`);

      return NextResponse.json({
        league,
        source: "api-sports-cache",
        count: simplifiedTeams.length,
        expectedCount,
        isMissingTeams,
        teams: simplifiedTeams,
      });
    }

    // Other leagues use SportsDataIO
    const teams = await getTeams(league);

    // Transform to simplified format for frontend
    const simplifiedTeams = teams.map((team) => ({
      teamId: team.TeamID,
      name: team.Name,
      city: team.City,
      fullName: team.FullName || `${team.City} ${team.Name}`,
      abbreviation: team.Key,
      logoUrl: getTeamLogoUrl(team),
      primaryColor: team.PrimaryColor ? `#${team.PrimaryColor}` : null,
      secondaryColor: team.SecondaryColor ? `#${team.SecondaryColor}` : null,
      conference: team.Conference,
      division: team.Division,
    }));
    
    // Log for debugging
    const teamsWithLogos = simplifiedTeams.filter(t => t.logoUrl).length;
    console.log(`[/api/sports/teams] ${league.toUpperCase()}: ${simplifiedTeams.length} teams, ${teamsWithLogos} with logos`);

    return NextResponse.json({
      league,
      source: "sportsdataio",
      count: simplifiedTeams.length,
      teams: simplifiedTeams,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/sports/teams] Error:", message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
