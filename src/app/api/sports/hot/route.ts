/**
 * GET /api/sports/hot
 * Returns games for homepage sections with guaranteed fallback:
 * - LIVE games (normalized status)
 * - UPCOMING games (starts_at >= now, not final/cancelled)
 * - RECENT past games (starts_at < now, sorted desc)
 *
 * Uses service-role Supabase client to bypass RLS.
 * Window: PAST_DAYS back, FUTURE_DAYS forward.
 *
 * Home client derives Hot/Live/Starting Soon tabs from this data.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/serverServiceClient";
import { PAST_DAYS, FUTURE_DAYS } from "@/lib/sports/window";
import { getLogoUrl } from "@/lib/images/getLogoUrl";
import { isRealGame } from "@/lib/sports/placeholderTeams";
import { ENABLED_SPORTS } from "@/config/sports";

export const dynamic = "force-dynamic";

interface HotGame {
  id: string;
  title: string;
  league: string;
  team1: {
    abbr: string;
    name: string;
    odds: number;
    color: string;
    logoUrl: string | null;
  };
  team2: {
    abbr: string;
    name: string;
    odds: number;
    color: string;
    logoUrl: string | null;
  };
  startTime: string;
  starts_at: string;
  status: string;
  isLive: boolean;
  volumeToday: number;
  volume10m: number;
  activeBettors: number;
}

function getAbbr(name: string): string {
  if (!name) return "";
  const words = name.split(" ");
  if (words.length > 1) {
    return words[words.length - 1].slice(0, 3).toUpperCase();
  }
  return name.slice(0, 3).toUpperCase();
}

function isGameLive(status: string): boolean {
  const s = (status || "").toLowerCase();
  return (
    s.includes("1h") || s.includes("2h") || s === "ht" ||
    s.includes("second half") || s.includes("half") ||
    s.includes("q1") || s.includes("q2") || s.includes("q3") || s.includes("q4") ||
    s.includes("ot") || s.includes("p1") || s.includes("p2") || s.includes("p3") ||
    s.includes("in progress") || s.includes("inprogress") || s.includes("live")
  );
}

function isFinalOrCancelled(status: string): boolean {
  const s = (status || "").toLowerCase();
  return s.includes("final") || s === "ft" || s.includes("finished") ||
    s.includes("cancel") || s.includes("postpone");
}

function generateOdds(): [number, number] {
  const t1 = Math.floor(Math.random() * 40) + 30;
  return [t1, 100 - t1];
}

function generateMockActivity() {
  return {
    volumeToday: Math.floor(Math.random() * 5000000) + 500000,
    volume10m: Math.floor(Math.random() * 100000) + 10000,
    activeBettors: Math.floor(Math.random() * 500) + 50,
  };
}

export async function GET(request: NextRequest) {
  try {
    const client = getServiceClient();
    const nowMs = Date.now();
    const pastIso = new Date(nowMs - PAST_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const futureIso = new Date(nowMs + FUTURE_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const nowIso = new Date(nowMs).toISOString();

    // Single wide query: past PAST_DAYS to future FUTURE_DAYS
    const { data: rawGames, error: gamesError } = await client
      .from("sports_games")
      .select("*")
      .gte("starts_at", pastIso)
      .lt("starts_at", futureIso)
      .order("starts_at", { ascending: true })
      .limit(500);

    if (gamesError) {
      console.error("[/api/sports/hot] games query error:", gamesError.message);
      return NextResponse.json({ error: gamesError.message, games: [], count: 0 }, { status: 500 });
    }

    const allRows = rawGames || [];

    // Filter out placeholder teams and disabled sports
    const realGames = allRows.filter((g) => 
      isRealGame(g.home_team, g.away_team) && 
      ENABLED_SPORTS.includes(g.league?.toLowerCase() as any)
    );

    // Load team map (service role)
    const { data: teamsData } = await client
      .from("sports_teams")
      .select("id, name, logo, slug, league");

    const teamMap = new Map<string, { id: number; name: string; logo: string | null; slug: string }>();
    for (const t of teamsData || []) {
      if (t?.name && t?.league) {
        teamMap.set(`${t.league.toLowerCase()}:${t.name.toLowerCase()}`, {
          id: t.id, name: t.name, logo: t.logo, slug: t.slug,
        });
      }
    }

    // Transform
    const transform = (g: any): HotGame => {
      const league = (g.league || "").toLowerCase();
      const home = teamMap.get(`${league}:${(g.home_team || "").toLowerCase()}`);
      const away = teamMap.get(`${league}:${(g.away_team || "").toLowerCase()}`);
      const [o1, o2] = generateOdds();
      const isLive = isGameLive(g.status);
      return {
        id: g.external_game_id || String(g.id),
        title: `${g.away_team} vs ${g.home_team}`,
        league: league.toUpperCase(),
        team1: {
          abbr: getAbbr(g.away_team),
          name: g.away_team,
          odds: o1,
          color: "#6366f1",
          logoUrl: getLogoUrl(away?.logo),
        },
        team2: {
          abbr: getAbbr(g.home_team),
          name: g.home_team,
          odds: o2,
          color: "#6366f1",
          logoUrl: getLogoUrl(home?.logo),
        },
        startTime: g.starts_at,
        starts_at: g.starts_at,
        status: isLive ? "in_progress" : g.status || "scheduled",
        isLive,
        ...generateMockActivity(),
      };
    };

    // Split into LIVE, UPCOMING, RECENT
    const live: HotGame[] = [];
    const upcoming: HotGame[] = [];
    const recent: HotGame[] = [];

    for (const g of realGames) {
      const startsAt = g.starts_at;
      if (!startsAt) continue;
      const isLive = isGameLive(g.status);
      const isFinal = isFinalOrCancelled(g.status);

      if (isLive) {
        live.push(transform(g));
      } else if (!isFinal && startsAt >= nowIso) {
        upcoming.push(transform(g));
      } else {
        recent.push(transform(g));
      }
    }

    // Sort recent descending
    recent.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

    // Build final list: live first, then upcoming, then recent as fallback
    const seen = new Set<string>();
    const dedupe = (list: HotGame[]): HotGame[] => {
      const out: HotGame[] = [];
      for (const g of list) {
        if (seen.has(g.id)) continue;
        seen.add(g.id);
        out.push(g);
      }
      return out;
    };

    let games: HotGame[];
    if (live.length > 0 || upcoming.length > 0) {
      games = dedupe([...live, ...upcoming.slice(0, 50)]);
    } else {
      games = dedupe(recent.slice(0, 20));
    }

    console.log(
      `[/api/sports/hot] window=${pastIso} -> ${futureIso} ` +
      `total=${allRows.length} real=${realGames.length} ` +
      `live=${live.length} upcoming=${upcoming.length} recent=${recent.length} ` +
      `returned=${games.length}`
    );

    return NextResponse.json({
      games,
      count: games.length,
      meta: {
        live: live.length,
        upcoming: upcoming.length,
        recent: recent.length,
        totalInWindow: realGames.length,
      },
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/sports/hot] error:", msg);
    return NextResponse.json(
      { error: msg, games: [], count: 0 },
      { status: 500 }
    );
  }
}
