export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isValidFrontendLeague, ALL_FRONTEND_LEAGUES } from "@/lib/sports/providers";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const leagueParam = url.searchParams.get("league")?.toLowerCase() || null;

    if (leagueParam && !isValidFrontendLeague(leagueParam)) {
      return NextResponse.json(
        { error: `Invalid league. Must be one of: ${ALL_FRONTEND_LEAGUES.join(", ")}` },
        { status: 400 },
      );
    }

    const client = getServiceClient();
    if (!client) {
      const msg = "Service role key not configured";
      console.error("[/api/sports/games] ERROR:", msg);
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    const now = new Date();
    const start = new Date(now.getTime() - 36 * 60 * 60 * 1000);
    const end = new Date(now.getTime() + 36 * 60 * 60 * 1000);

    let query = client
      .from("sports_games")
      .select("*")
      .gte("starts_at", start.toISOString())
      .lte("starts_at", end.toISOString())
      .order("starts_at", { ascending: true })
      .limit(200);

    if (leagueParam) {
      query = query.eq("league", leagueParam);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[/api/sports/games] Supabase error:", error.message);
      return NextResponse.json({ error: error.message, games: [] }, { status: 500 });
    }

    const games = data || [];
    console.log(
      `[/api/sports/games] count=${games.length} first=${games[0]?.starts_at ?? "none"}`,
    );

    return NextResponse.json({
      league: leagueParam ?? "all",
      source: "sports_games",
      count: games.length,
      games,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/sports/games] Error:", message);
    
    // Return empty result instead of error for frontend
    return NextResponse.json({
      league: request.url.includes("league=") ? new URL(request.url).searchParams.get("league") : "unknown",
      source: "error",
      count: 0,
      games: [],
      message: "Games will appear once synced from Admin.",
    });
  }
}
