/**
 * GET /api/sports/teams
 * Returns teams for a league with logo URLs.
 * 
 * Query params:
 * - league: "nfl" | "nba" | "mlb" | "nhl" | "soccer" (required)
 * 
 * Response: { league, count, teams: [{teamId, name, city, abbreviation, logoUrl, primaryColor, secondaryColor}] }
 * 
 * Data sources:
 * - NFL: API-Sports cache (api_sports_nfl_teams table)
 * - NBA, Soccer: Sports teams cache (sports_teams table)
 * - MLB, NHL: SportsDataIO API
 */

import { NextRequest, NextResponse } from "next/server";
import { getTeams, getTeamLogoUrl, SUPPORTED_LEAGUES, type League } from "@/lib/sportsdataio/client";
import { usesApiSportsCache, usesSportsTeamsCache } from "@/lib/sports/providers";
import { getNflTeamsFromCache, transformCachedTeamToLegacyFormat } from "@/lib/sports/nfl-cache";
import { getSimplifiedTeamsFromCache, getTeamCountFromCache } from "@/lib/sports/sports-teams-cache";

// Extended list of supported leagues (includes soccer)
const EXTENDED_LEAGUES = [...SUPPORTED_LEAGUES, "soccer"] as const;
type ExtendedLeague = (typeof EXTENDED_LEAGUES)[number];

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const leagueParam = url.searchParams.get("league")?.toLowerCase() || "nfl";

    // Validate league (including soccer)
    if (!EXTENDED_LEAGUES.includes(leagueParam as ExtendedLeague)) {
      return NextResponse.json(
        { error: `Invalid league. Must be one of: ${EXTENDED_LEAGUES.join(", ")}` },
        { status: 400 }
      );
    }

    const league = leagueParam as ExtendedLeague;

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

    // NBA and Soccer use sports_teams cache from Supabase
    if (usesSportsTeamsCache(league)) {
      const simplifiedTeams = await getSimplifiedTeamsFromCache(league);
      const teamCount = simplifiedTeams.length;
      
      // Expected counts per league
      const expectedCounts: Record<string, number> = {
        nba: 30,
        soccer: 20, // Just Premier League by default
      };
      const expectedCount = expectedCounts[league] || 0;
      const isMissingTeams = teamCount === 0;
      
      console.log(`[/api/sports/teams] ${league.toUpperCase()} (sports-teams-cache): ${teamCount} teams`);

      // If no teams synced yet, return empty with helpful message
      if (teamCount === 0) {
        return NextResponse.json({
          league,
          source: "sports-teams-cache",
          count: 0,
          expectedCount,
          isMissingTeams: true,
          syncRequired: true,
          teams: [],
          message: `No ${league.toUpperCase()} teams found. Run team sync from Admin panel.`,
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

    // Other leagues (MLB, NHL) use SportsDataIO
    const teams = await getTeams(league as League);

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
