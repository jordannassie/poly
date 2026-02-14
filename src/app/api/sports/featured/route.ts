/**
 * GET /api/sports/featured
 * Returns the featured game for a league.
 * 
 * Logic:
 * - Returns the next upcoming game for the league.
 * 
 * Query params:
 * - league: "nfl" | "nba" | "mlb" | "nhl" | "soccer" (required)
 * 
 * Response:
 * {
 *   featured: {
 *     gameId, name, startTime, status,
 *     homeTeam: { name, city, abbreviation, logoUrl, primaryColor },
 *     awayTeam: { name, city, abbreviation, logoUrl, primaryColor },
 *     venue, week, channel
 *   } | null,
 *   reason: "championship" | "next_game" | "no_games"
 * }
 * 
 * All leagues use sports_games table (v2 schema).
 */

import { NextRequest, NextResponse } from "next/server";
import { getUntypedSupabaseClient } from "@/lib/supabase";
import { getFromCache, setInCache, getCacheKey } from "@/lib/sportsdataio/cache";
import {
  filterRealGames,
  getEnabledSoccerLeagueIds,
  getAllTeamMapsFromCache,
} from "@/lib/sports/games-cache";

const CACHE_KEY = getCacheKey("global", "featured", "all");
const CACHE_TTL_ACTIVE = 5 * 60 * 1000;
const CACHE_TTL_IDLE = 30 * 60 * 1000;
const FEATURED_LEAGUES = ["nfl", "nba", "mlb", "nhl"];

interface TeamMeta {
  teamId: number;
  name: string;
  city: string;
  abbreviation: string;
  fullName: string;
  logoUrl: string | null;
  primaryColor: string | null;
}

interface FeaturedItem {
  league: string;
  gameId: string;
  externalGameId: string;
  startsAt: string;
  status: string;
  homeTeam: TeamMeta;
  awayTeam: TeamMeta;
  homeScore: number | null;
  awayScore: number | null;
  channel: string | null;
}

interface FeaturedListResponse {
  ok: true;
  items: FeaturedItem[];
}

function getAbbreviation(name?: string) {
  if (!name) {
    return "";
  }
  const words = name.split(" ");
  const candidate = words[words.length - 1];
  return candidate.slice(0, 3).toUpperCase();
}

export async function GET() {
  try {
    const cached = getFromCache<FeaturedListResponse>(CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached);
    }

    const client = getUntypedSupabaseClient();
    if (!client) {
      return NextResponse.json({ ok: true, items: [] });
    }

    const now = new Date().toISOString();
    const { data, error } = await client
      .from("sports_games")
      .select("*")
      .in("league", FEATURED_LEAGUES)
      .gte("starts_at", now)
      .order("starts_at", { ascending: true })
      .limit(60);

    if (error) {
      console.error("[/api/sports/featured] Supabase error:", error.message);
      return NextResponse.json({ ok: true, items: [] });
    }

    let games = data || [];
    const enabledSoccerLeagues = await getEnabledSoccerLeagueIds();
    if (enabledSoccerLeagues.length > 0) {
      games = games.filter((game) => {
        if (game.league === "soccer") {
          return Boolean(game.league_id && enabledSoccerLeagues.includes(game.league_id));
        }
        return true;
      });
    } else {
      games = games.filter((game) => game.league !== "soccer");
    }

    games = filterRealGames(games);

    const teamMap = await getAllTeamMapsFromCache();

    const items: FeaturedItem[] = games
      .map((game) => {
        const league = (game.league || "").toLowerCase();
        const statusNorm = (game.status_norm || game.status || "").toUpperCase();
        const normalizedStatus =
          statusNorm === "LIVE"
            ? "in_progress"
            : statusNorm === "FINAL"
              ? "final"
              : statusNorm === "CANCELED" || statusNorm === "POSTPONED"
                ? "canceled"
                : "scheduled";
        if (normalizedStatus === "final" || normalizedStatus === "canceled") {
          return null;
        }

        const makeTeam = (teamName?: string) => {
          const nameLower = (teamName || "").toLowerCase();
          const lookupKey = `${league}:${nameLower}`;
          let meta = teamMap.get(lookupKey);
          // Fallback: try stripping/adding common suffixes
          if (!meta) {
            const stripped = nameLower.replace(/\s+(fc|cf|sc|afc|sfc)$/i, "").trim();
            if (stripped !== nameLower) meta = teamMap.get(`${league}:${stripped}`);
            if (!meta) {
              for (const suffix of [" fc", " cf", " sc", " afc"]) {
                meta = teamMap.get(`${league}:${nameLower}${suffix}`);
                if (meta) break;
              }
            }
          }
          return {
            teamId: meta?.id ?? 0,
            name: teamName || "Team",
            city: teamName || "Team",
            abbreviation: getAbbreviation(teamName),
            fullName: teamName || "Team",
            logoUrl: meta?.logo || null,
            primaryColor: null,
          };
        };

        return {
          league,
          gameId: game.external_game_id || String(game.id),
          externalGameId: game.external_game_id || String(game.id),
          startsAt: game.starts_at,
          status: normalizedStatus,
          homeTeam: makeTeam(game.home_team),
          awayTeam: makeTeam(game.away_team),
          homeScore: game.home_score,
          awayScore: game.away_score,
          channel: null,
        };
      })
      .filter(Boolean) as FeaturedItem[];

    // Priority selection: NFL > NBA > MLB > NHL (pick best from highest priority league)
    // Group games by league
    const byLeague = new Map<string, FeaturedItem[]>();
    for (const item of items) {
      const bucket = byLeague.get(item.league) || [];
      bucket.push(item);
      byLeague.set(item.league, bucket);
    }

    // Select games by priority order: prefer NFL, then NBA, then MLB, then NHL
    const selected: FeaturedItem[] = [];
    const MAX_TOTAL = 12;
    
    for (const league of FEATURED_LEAGUES) {
      const bucket = byLeague.get(league) || [];
      // Take up to 3 games from this league
      for (let i = 0; i < Math.min(3, bucket.length) && selected.length < MAX_TOTAL; i++) {
        selected.push(bucket[i]);
      }
      if (selected.length >= MAX_TOTAL) break;
    }

    const result: FeaturedListResponse = {
      ok: true,
      items: selected,
    };

    const cacheTtl = items.length > 0 ? CACHE_TTL_ACTIVE : CACHE_TTL_IDLE;
    setInCache(CACHE_KEY, result, cacheTtl);

    console.log(`[/api/sports/featured] returning ${result.items.length} items`);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/sports/featured] Error:", message);
    return NextResponse.json({ ok: true, items: [] });
  }
}
