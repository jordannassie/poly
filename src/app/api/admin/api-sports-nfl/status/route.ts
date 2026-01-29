/**
 * GET /api/admin/api-sports-nfl/status
 * Check API-Sports NFL connection status
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

  // Check env vars
  if (!API_SPORTS_KEY) {
    return NextResponse.json({
      ok: false,
      status: 500,
      ms: 0,
      error: "API_SPORTS_KEY environment variable is not configured",
      data: null,
    });
  }

  if (!API_SPORTS_BASE_URL) {
    return NextResponse.json({
      ok: false,
      status: 500,
      ms: 0,
      error: "API_SPORTS_BASE_URL environment variable is not configured",
      data: null,
    });
  }

  const startTime = Date.now();
  
  // 10s timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  
  try {
    const res = await fetch(`${API_SPORTS_BASE_URL}/status`, {
      headers: {
        "x-apisports-key": API_SPORTS_KEY,
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    const ms = Date.now() - startTime;
    const data = await res.json();
    
    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      ms,
      data,
    });
  } catch (error) {
    clearTimeout(timeoutId);
    const ms = Date.now() - startTime;
    
    const errorMessage = error instanceof Error 
      ? (error.name === "AbortError" ? "Request timed out after 10 seconds" : error.message)
      : "Unknown error";
    
    return NextResponse.json({
      ok: false,
      status: 500,
      ms,
      error: errorMessage,
      data: null,
    });
  }
}
