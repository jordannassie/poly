/**
 * GET /api/admin/api-sports/test
 * Test API-Sports connection
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const COOKIE_NAME = "pp_admin";
const API_SPORTS_KEY = process.env.API_SPORTS_KEY;
const API_SPORTS_BASE_URL = process.env.API_SPORTS_BASE_URL || "https://v1.american-football.api-sports.io";

function isAuthorized(request: NextRequest): boolean {
  if (!ADMIN_TOKEN) return false;
  
  const cookieStore = cookies();
  const adminCookie = cookieStore.get(COOKIE_NAME);
  if (adminCookie?.value === ADMIN_TOKEN) return true;
  
  const headerToken = request.headers.get("x-admin-token");
  if (headerToken === ADMIN_TOKEN) return true;
  
  return false;
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
  const sport = url.searchParams.get("sport") || "nfl";
  
  // Select base URL based on sport
  const baseUrl = sport === "nba" 
    ? "https://v1.basketball.api-sports.io"
    : "https://v1.american-football.api-sports.io";

  const startTime = Date.now();
  
  try {
    const res = await fetch(`${baseUrl}/status`, {
      headers: {
        "x-apisports-key": API_SPORTS_KEY,
      },
    });
    
    const ms = Date.now() - startTime;
    const data = await res.json();
    
    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      ms,
      sport,
      baseUrl,
      data,
    });
  } catch (error) {
    const ms = Date.now() - startTime;
    return NextResponse.json({
      ok: false,
      status: 500,
      ms,
      error: error instanceof Error ? error.message : "Unknown error",
      data: null,
    });
  }
}
