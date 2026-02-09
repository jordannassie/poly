/**
 * GET /api/admin/api-sports/[league]/test
 * 
 * Test connection to API-Sports for any league.
 * Returns account status and remaining requests.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getLeagueConfigByString } from "@/lib/apiSports/leagueConfig";
import { apiSportsFetch, buildApiSportsUrl } from "@/lib/apiSports/client";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const COOKIE_NAME = "pp_admin";
const API_SPORTS_KEY = process.env.API_SPORTS_KEY || "";

function isAuthorized(request: NextRequest): boolean {
  if (!ADMIN_TOKEN) return false;
  
  const cookieStore = cookies();
  const adminCookie = cookieStore.get(COOKIE_NAME);
  if (adminCookie?.value === ADMIN_TOKEN) return true;
  
  const headerToken = request.headers.get("x-admin-token");
  if (headerToken === ADMIN_TOKEN) return true;
  
  return false;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { league: string } }
) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const leagueConfig = getLeagueConfigByString(params.league);
  if (!leagueConfig) {
    return NextResponse.json({
      ok: false,
      error: `Invalid league: ${params.league}. Supported: nfl, nba, mlb, nhl, soccer`,
    }, { status: 400 });
  }

  if (!API_SPORTS_KEY) {
    return NextResponse.json({
      ok: false,
      error: "API_SPORTS_KEY not configured",
    }, { status: 500 });
  }

  const startTime = Date.now();

  try {
    // Call the status endpoint for the league
    const statusUrl = buildApiSportsUrl(leagueConfig.baseUrl, "/status");
    
    interface StatusResponse {
      response: {
        account?: { firstname?: string; lastname?: string; email?: string };
        subscription?: { plan?: string; end?: string; active?: boolean };
        requests?: { current?: number; limit_day?: number };
      };
    }
    
    const data = await apiSportsFetch<StatusResponse>(statusUrl, API_SPORTS_KEY);
    const latency = Date.now() - startTime;

    // Extract account info from response
    const account = data.response?.account || {};
    const subscription = data.response?.subscription || {};
    const requests = data.response?.requests || {};

    return NextResponse.json({
      ok: true,
      league: params.league.toUpperCase(),
      endpoint: statusUrl,
      status: 200,
      latencyMs: latency,
      account: {
        firstname: account.firstname,
        lastname: account.lastname,
        email: account.email,
      },
      subscription: {
        plan: subscription.plan,
        end: subscription.end,
        active: subscription.active,
      },
      requests: {
        current: requests.current,
        limit_day: requests.limit_day,
        remaining: (requests.limit_day || 0) - (requests.current || 0),
      },
    });
  } catch (error) {
    const latency = Date.now() - startTime;
    const message = error instanceof Error ? error.message : "Unknown error";
    
    return NextResponse.json({
      ok: false,
      league: params.league.toUpperCase(),
      latencyMs: latency,
      error: message,
    }, { status: 500 });
  }
}
