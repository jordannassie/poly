/**
 * GET /api/admin/api-sports/teams
 * Fetch teams from API-Sports
 * 
 * For NFL: Try without season first, fallback to 2025 if empty
 * For NBA: Use league + season as normal
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const COOKIE_NAME = "pp_admin";
const API_SPORTS_KEY = process.env.API_SPORTS_KEY;

function isAuthorized(request: NextRequest): boolean {
  if (!ADMIN_TOKEN) return false;
  
  const cookieStore = cookies();
  const adminCookie = cookieStore.get(COOKIE_NAME);
  if (adminCookie?.value === ADMIN_TOKEN) return true;
  
  const headerToken = request.headers.get("x-admin-token");
  if (headerToken === ADMIN_TOKEN) return true;
  
  return false;
}

async function fetchWithKey(url: string): Promise<Response> {
  return fetch(url, {
    headers: {
      "x-apisports-key": API_SPORTS_KEY!,
    },
  });
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!API_SPORTS_KEY) {
    return NextResponse.json({
      ok: false,
      status: 500,
      ms: 0,
      error: "API_SPORTS_KEY not configured",
      data: null,
    });
  }

  const url = new URL(request.url);
  const sport = (url.searchParams.get("sport") || "nfl").toLowerCase();
  const league = url.searchParams.get("league") || (sport === "nfl" ? "1" : "12"); // NFL=1, NBA=12
  const season = url.searchParams.get("season") || new Date().getFullYear().toString();
  
  // Select base URL based on sport
  const baseUrl = sport === "nba" 
    ? "https://v1.basketball.api-sports.io"
    : "https://v1.american-football.api-sports.io";

  const startTime = Date.now();
  const triedEndpoints: string[] = [];
  
  try {
    // For NFL: Try without season first, then fallback to 2025
    if (sport === "nfl") {
      // First try: No season parameter
      const endpoint1 = `/teams?league=${league}`;
      triedEndpoints.push(`${baseUrl}${endpoint1}`);
      
      const res1 = await fetchWithKey(`${baseUrl}${endpoint1}`);
      const data1 = await res1.json();
      
      // Check if we got results
      if (data1.results && data1.results > 0) {
        const ms = Date.now() - startTime;
        return NextResponse.json({
          ok: res1.ok,
          status: res1.status,
          ms,
          sport,
          endpoint: `${baseUrl}${endpoint1}`,
          triedEndpoints,
          data: data1,
        });
      }
      
      // Fallback: Try with season=2025
      const endpoint2 = `/teams?league=${league}&season=2025`;
      triedEndpoints.push(`${baseUrl}${endpoint2}`);
      
      const res2 = await fetchWithKey(`${baseUrl}${endpoint2}`);
      const data2 = await res2.json();
      const ms = Date.now() - startTime;
      
      return NextResponse.json({
        ok: res2.ok,
        status: res2.status,
        ms,
        sport,
        endpoint: `${baseUrl}${endpoint2}`,
        triedEndpoints,
        note: "Fallback to season=2025 after empty response without season",
        data: data2,
      });
    }
    
    // For NBA and others: Use league + season
    const endpoint = `/teams?league=${league}&season=${season}`;
    triedEndpoints.push(`${baseUrl}${endpoint}`);
    
    const res = await fetchWithKey(`${baseUrl}${endpoint}`);
    const ms = Date.now() - startTime;
    const data = await res.json();
    
    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      ms,
      sport,
      endpoint: `${baseUrl}${endpoint}`,
      triedEndpoints,
      data,
    });
  } catch (error) {
    const ms = Date.now() - startTime;
    return NextResponse.json({
      ok: false,
      status: 500,
      ms,
      triedEndpoints,
      error: error instanceof Error ? error.message : "Unknown error",
      data: null,
    });
  }
}
