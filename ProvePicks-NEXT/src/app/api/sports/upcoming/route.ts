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

function getDateRange(days: number): string[] {
  const dates: string[] = [];
  const today = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push(date.toISOString().split("T")[0]);
  }
  
  return dates;
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const leagueParam = url.searchParams.get("league")?.toLowerCase() || "nfl";
    const league = leagueParam;
    const days = 7; // fixed window per requirements

    // Validate league
    if (!isValidFrontendLeague(leagueParam)) {
      return NextResponse.json(
        { error: `Invalid league. Must be one of: ${ALL_FRONTEND_LEAGUES.join(", ")}` },
        { status: 400 }
      );
    }

    const client = getServiceClient();
    if (!client) {
      const msg = "Service role key not configured";
      console.error("[/api/sports/upcoming] ERROR:", msg);
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    const now = new Date();
    const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    let query = client
      .from("sports_games")
      .select("*")
      .eq("league", league)
      .gte("starts_at", now.toISOString())
      .lte("starts_at", end.toISOString())
      .order("starts_at", { ascending: true })
      .limit(100);

    const { data, error } = await query;
    if (error) {
      console.error("[/api/sports/upcoming] Supabase error:", error.message);
      return NextResponse.json({ error: error.message, games: [] }, { status: 500 });
    }

    const games = data || [];
    console.log(
      `[/api/sports/upcoming] league=${league.toUpperCase()} count=${games.length} first=${games[0]?.starts_at ?? "none"}`,
    );

    return NextResponse.json({
      range: { startDate: now.toISOString(), endDate: end.toISOString() },
      count: games.length,
      games,
    });
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
