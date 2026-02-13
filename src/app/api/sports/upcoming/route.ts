/**
 * GET /api/sports/upcoming
 * Returns upcoming games for the next N days.
 * 
 * Query params:
 * - league: "nfl" | "nba" | "mlb" | "nhl" | "soccer" (required)
 * - days: number of days to look ahead (default: 90 for NFL, 30 for others)
 * 
 * Response:
 * {
 *   range: { startDate, endDate },
 *   count: number,
 *   games: [{
 *     gameId, status, startTime,
 *     homeTeam: { teamId, abbreviation, name, logoUrl, primaryColor },
 *     awayTeam: { teamId, abbreviation, name, logoUrl, primaryColor },
 *     homeScore, awayScore, venue
 *   }]
 * }
 * 
 * All leagues use sports_games table (v2 schema).
 */

import { NextRequest, NextResponse } from "next/server";
import { getFromCache, setInCache, getCacheKey } from "@/lib/sportsdataio/cache";
import { isValidFrontendLeague, ALL_FRONTEND_LEAGUES } from "@/lib/sports/providers";
import { transformCachedGame, CachedGame } from "@/lib/sports/games-cache";
import { getLogoUrl } from "@/lib/images/getLogoUrl";
import { FUTURE_DAYS } from "@/lib/sports/window";
import { getServiceClient } from "@/lib/supabase/serverServiceClient";

// Cache TTL
const CACHE_TTL_WITH_GAMES = 30 * 60 * 1000; // 30 minutes
const CACHE_TTL_NO_GAMES = 60 * 60 * 1000;   // 60 minutes

interface NormalizedTeam {
  teamId: number;
  abbreviation: string;
  name: string;
  city: string;
  fullName: string;
  logoUrl: string | null;
  primaryColor: string | null;
}

interface NormalizedGame {
  gameId: string;
  status: "scheduled" | "in_progress" | "final" | "postponed" | "canceled";
  startTime: string;
  homeTeam: NormalizedTeam;
  awayTeam: NormalizedTeam;
  homeScore: number | null;
  awayScore: number | null;
  venue: string | null;
  channel: string | null;
  week: number;
}

interface UpcomingResponse {
  range: { startDate: string; endDate: string };
  count: number;
  games: NormalizedGame[];
  message?: string;
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const leagueParam = url.searchParams.get("league")?.toLowerCase() || "nfl";
    const daysParam = url.searchParams.get("days");
    
    // Default to FUTURE_DAYS window; cap at that window to keep deterministic payload size
    const defaultDays = FUTURE_DAYS;
    const maxDays = FUTURE_DAYS;
    const days = Math.min(Math.max(parseInt(daysParam || String(defaultDays), 10) || defaultDays, 1), maxDays);

    // Validate league
    if (!isValidFrontendLeague(leagueParam)) {
      return NextResponse.json(
        { error: `Invalid league. Must be one of: ${ALL_FRONTEND_LEAGUES.join(", ")}` },
        { status: 400 }
      );
    }

    const league = leagueParam;

    // Check cache
    const cacheKey = getCacheKey(league, "upcoming", `${days}`);
    const cached = getFromCache<UpcomingResponse>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Date bounds
    const nowMs = Date.now();
    const startDate = new Date(nowMs).toISOString();
    const endDate = new Date(nowMs + days * 24 * 60 * 60 * 1000).toISOString();

    const client = getServiceClient();

    const { data, error } = await client
      .from("sports_games")
      .select("*")
      .eq("league", league)
      .gte("starts_at", startDate)
      .lt("starts_at", endDate)
      .order("starts_at", { ascending: true })
      .limit(300);

    if (error) {
      console.error(`[/api/sports/upcoming] ${league.toUpperCase()} query error:`, error.message);
      return NextResponse.json({
        range: { startDate, endDate },
        count: 0,
        games: [],
        message: "Games will appear once synced from Admin.",
      });
    }

    // Team map (service role)
    const { data: teamData, error: teamError } = await client
      .from("sports_teams")
      .select("id, name, logo, slug")
      .eq("league", league);

    if (teamError) {
      console.warn(`[/api/sports/upcoming] ${league.toUpperCase()} team map error:`, teamError.message);
    }

    const teamMap = new Map<string, { id: number; name: string; logo: string | null; slug: string }>();
    (teamData || []).forEach((team) => {
      if (team?.name) {
        teamMap.set(String(team.name).toLowerCase(), {
          id: team.id,
          name: team.name,
          logo: team.logo,
          slug: team.slug,
        });
      }
    });

    // Transform to normalized format
    const allGames: NormalizedGame[] = (data as CachedGame[] || []).map((game) => {
      const simplified = transformCachedGame(game, teamMap);
      return {
        gameId: simplified.GameKey,
        status: simplified.Canceled ? "canceled" : simplified.IsOver ? "final" : simplified.IsInProgress ? "in_progress" : "scheduled",
        startTime: simplified.DateTime,
        homeTeam: {
          teamId: simplified.HomeTeamData?.TeamID || 0,
          abbreviation: simplified.HomeTeam,
          name: simplified.HomeTeamData?.Name || simplified.HomeTeam,
          city: "",
          fullName: simplified.HomeTeamData?.FullName || simplified.HomeTeam,
          logoUrl: getLogoUrl(simplified.HomeTeamData?.WikipediaLogoUrl),
          primaryColor: null,
        },
        awayTeam: {
          teamId: simplified.AwayTeamData?.TeamID || 0,
          abbreviation: simplified.AwayTeam,
          name: simplified.AwayTeamData?.Name || simplified.AwayTeam,
          city: "",
          fullName: simplified.AwayTeamData?.FullName || simplified.AwayTeam,
          logoUrl: getLogoUrl(simplified.AwayTeamData?.WikipediaLogoUrl),
          primaryColor: null,
        },
        homeScore: simplified.HomeScore,
        awayScore: simplified.AwayScore,
        venue: null,
        channel: null,
        week: 0,
      };
    });

    const response: UpcomingResponse = {
      range: { startDate, endDate },
      count: allGames.length,
      games: allGames,
    };

    const cacheTtl = allGames.length > 0 ? CACHE_TTL_WITH_GAMES : CACHE_TTL_NO_GAMES;
    setInCache(cacheKey, response, cacheTtl);

    console.log(`[/api/sports/upcoming] ${league.toUpperCase()} (sports_games): ${allGames.length} games in next ${days} days`);

    if (allGames.length === 0) {
      return NextResponse.json({
        ...response,
        message: `No upcoming ${league.toUpperCase()} games found. Sync games from Admin panel.`,
      });
    }

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/sports/upcoming] Error:", message);
    
    // Return empty response instead of error for frontend
    return NextResponse.json({
      range: { startDate: "", endDate: "" },
      count: 0,
      games: [],
      message: "Games will appear once synced from Admin.",
    });
  }
}
