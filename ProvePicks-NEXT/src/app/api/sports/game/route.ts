/**
 * GET /api/sports/game
 * Returns a single game by ID with team data.
 * 
 * Query params:
 * - league: "nfl" | "nba" | "mlb" | "nhl" | "soccer" (required)
 * - gameId: string (required) - The external game ID
 * 
 * Response:
 * {
 *   game: {
 *     gameId, name, startTime, status,
 *     homeTeam: { name, city, abbreviation, logoUrl, primaryColor },
 *     awayTeam: { name, city, abbreviation, logoUrl, primaryColor },
 *     homeScore, awayScore, venue, week, channel
 *   } | null
 * }
 * 
 * All leagues use sports_games table (v2 schema).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getFromCache, setInCache, getCacheKey } from "@/lib/sportsdataio/cache";
import { isValidFrontendLeague, ALL_FRONTEND_LEAGUES } from "@/lib/sports/providers";
import { getGameFromCache, getTeamMapFromCache } from "@/lib/sports/games-cache";
import { getLogoUrl } from "@/lib/images/getLogoUrl";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function getSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createClient(supabaseUrl, supabaseAnonKey);
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface GameTeam {
  teamId: number;
  name: string;
  city: string;
  abbreviation: string;
  fullName: string;
  logoUrl: string | null;
  primaryColor: string | null;
}

interface GameDetails {
  gameId: string;
  name: string;
  startTime: string;
  status: "scheduled" | "in_progress" | "final" | "postponed" | "canceled";
  homeTeam: GameTeam;
  awayTeam: GameTeam;
  homeScore: number | null;
  awayScore: number | null;
  venue: string | null;
  week: number;
  channel: string | null;
  // Market lock status (from database)
  isLocked?: boolean;
  lockReason?: string;
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const leagueParam = url.searchParams.get("league")?.toLowerCase() || "nfl";
    const gameId = url.searchParams.get("gameId");

    // Validate params
    if (!isValidFrontendLeague(leagueParam)) {
      return NextResponse.json(
        { error: `Invalid league. Must be one of: ${ALL_FRONTEND_LEAGUES.join(", ")}` },
        { status: 400 }
      );
    }

    if (!gameId) {
      return NextResponse.json(
        { error: "Missing required parameter: gameId" },
        { status: 400 }
      );
    }

    const league = leagueParam;

    // Check in-memory cache
    const cacheKey = getCacheKey(league, "game", gameId);
    const cached = getFromCache<{ game: GameDetails }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Fetch game from sports_games table (gameId is now external_game_id as string)
    const [cachedGame, teamMap] = await Promise.all([
      getGameFromCache(league, gameId),
      getTeamMapFromCache(league),
    ]);

    if (!cachedGame) {
      return NextResponse.json(
        { game: null, message: "Game not found or not yet synced" },
        { status: 404 }
      );
    }

    // Look up team data by name
    const homeTeam = teamMap.get(cachedGame.home_team.toLowerCase());
    const awayTeam = teamMap.get(cachedGame.away_team.toLowerCase());

    // Use status_norm from database as single source of truth
    // Fallback to parsing raw status only if status_norm is not set
    let gameStatus: GameDetails["status"] = "scheduled";
    const statusNorm = (cachedGame.status_norm || "").toUpperCase();
    
    if (statusNorm) {
      // Use normalized status from database
      switch (statusNorm) {
        case "FINAL":
          gameStatus = "final";
          break;
        case "LIVE":
          gameStatus = "in_progress";
          break;
        case "CANCELED":
          gameStatus = "canceled";
          break;
        case "POSTPONED":
          gameStatus = "postponed";
          break;
        case "SCHEDULED":
        default:
          gameStatus = "scheduled";
          break;
      }
    } else {
      // Fallback: parse from raw status for legacy data
      const statusLower = (cachedGame.status || "").toLowerCase();
      const isOver = statusLower.includes("final") || statusLower.includes("finished") || statusLower === "ft";
      const isInProgress = statusLower.includes("progress") || statusLower.includes("live") ||
                          statusLower.includes("1h") || statusLower.includes("2h");
      const isCanceled = statusLower.includes("cancel") || statusLower.includes("postpone");
      
      if (isCanceled) {
        gameStatus = "canceled";
      } else if (isOver) {
        gameStatus = "final";
      } else if (isInProgress) {
        gameStatus = "in_progress";
      }
    }

    const getAbbr = (name: string) => {
      if (!name) return "";
      const words = name.split(" ");
      if (words.length > 1) {
        return words[words.length - 1].slice(0, 3).toUpperCase();
      }
      return name.slice(0, 3).toUpperCase();
    };

    // Fetch market lock status from database
    let isLocked = false;
    let lockReason: string | undefined = undefined;
    
    const supabase = getSupabaseClient();
    if (supabase && cachedGame.id) {
      // Try to find market by sports_game_id first (new binding)
      const { data: market } = await supabase
        .from('markets')
        .select('is_locked, lock_reason')
        .eq('sports_game_id', cachedGame.id)
        .maybeSingle();
      
      if (market) {
        isLocked = market.is_locked || false;
        lockReason = market.lock_reason || undefined;
      } else {
        // Fallback: Check if game status implies locked (no market record yet)
        if (statusNorm === 'FINAL' || statusNorm === 'CANCELED' || statusNorm === 'POSTPONED') {
          isLocked = true;
          lockReason = 'GAME_FINAL';
        }
      }
    } else {
      // No database access - derive from game status
      if (statusNorm === 'FINAL' || statusNorm === 'CANCELED' || statusNorm === 'POSTPONED' || statusNorm === 'LIVE') {
        isLocked = true;
        lockReason = statusNorm === 'LIVE' ? 'GAME_LIVE' : 'GAME_FINAL';
      }
    }

    const gameDetails: GameDetails = {
      gameId: cachedGame.external_game_id,
      name: `${cachedGame.away_team} @ ${cachedGame.home_team}`,
      startTime: cachedGame.starts_at,
      status: gameStatus,
      homeTeam: {
        teamId: homeTeam?.id || 0,
        name: cachedGame.home_team,
        city: "",
        abbreviation: getAbbr(cachedGame.home_team),
        fullName: cachedGame.home_team,
        logoUrl: getLogoUrl(homeTeam?.logo),
        primaryColor: null,
      },
      awayTeam: {
        teamId: awayTeam?.id || 0,
        name: cachedGame.away_team,
        city: "",
        abbreviation: getAbbr(cachedGame.away_team),
        fullName: cachedGame.away_team,
        logoUrl: getLogoUrl(awayTeam?.logo),
        primaryColor: null,
      },
      homeScore: cachedGame.home_score,
      awayScore: cachedGame.away_score,
      venue: null,
      week: 0,
      channel: null,
      isLocked,
      lockReason,
    };

    const response = { game: gameDetails };
    setInCache(cacheKey, response, CACHE_TTL);

    console.log(`[/api/sports/game] ${league.toUpperCase()} game ${gameId} found`);

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/sports/game] Error:", message);
    
    // Return null game instead of error for frontend
    return NextResponse.json({
      game: null,
      message: "Game data unavailable",
    });
  }
}
