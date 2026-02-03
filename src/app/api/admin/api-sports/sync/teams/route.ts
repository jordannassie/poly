/**
 * POST /api/admin/api-sports/sync/teams?sport=nfl|nba|mlb|nhl|soccer
 * 
 * Per-sport team sync with retry logic and timeout handling.
 * Fetches teams from API-Sports and stores in DB with logo URLs.
 * 
 * Features:
 * - Fetches latest season from /seasons endpoint for NBA/NHL/NFL
 * - 20 second timeout per upstream call (AbortController)
 * - 3 retries with exponential backoff
 * - Proper non-JSON response handling
 * - Per-sport results
 * 
 * Response:
 * { ok, league, inserted, updated, errors, total }
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase/admin";
import { SOCCER_LEAGUES } from "@/lib/apiSports/leagueConfig";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const COOKIE_NAME = "pp_admin";
const API_SPORTS_KEY = process.env.API_SPORTS_KEY || process.env.APISPORTS_KEY || "";

const VALID_SPORTS = ["nfl", "nba", "mlb", "nhl", "soccer"] as const;
type ValidSport = typeof VALID_SPORTS[number];

// Base URLs for each sport (API-Sports)
const SPORT_BASE_URLS: Record<ValidSport, string> = {
  nfl: "https://v1.american-football.api-sports.io",
  nba: "https://v1.basketball.api-sports.io",
  mlb: "https://v1.baseball.api-sports.io",
  nhl: "https://v1.hockey.api-sports.io",
  soccer: "https://v3.football.api-sports.io",
};

// League IDs for each sport
const SPORT_LEAGUE_IDS: Record<ValidSport, number[]> = {
  nfl: [1],
  nba: [12],
  mlb: [1],
  nhl: [57],
  soccer: [
    SOCCER_LEAGUES.PREMIER_LEAGUE,   // 39
    SOCCER_LEAGUES.LA_LIGA,          // 140
    SOCCER_LEAGUES.SERIE_A,          // 135
    SOCCER_LEAGUES.BUNDESLIGA,       // 78
    SOCCER_LEAGUES.LIGUE_1,          // 61
    SOCCER_LEAGUES.MLS,              // 253
    SOCCER_LEAGUES.CHAMPIONS_LEAGUE, // 2
  ],
};

// Sports that require fetching season from /seasons endpoint
const SPORTS_REQUIRING_SEASON_FETCH: ValidSport[] = ["nfl", "nba", "nhl"];

// Config
const FETCH_TIMEOUT_MS = 20000;  // 20 second timeout
const MAX_RETRIES = 3;
const RETRY_BACKOFF_MS = 1000;   // Base backoff (doubles each retry)

// In-memory season cache (per sport, per request)
const seasonCache: Record<string, string> = {};

function isAuthorized(request: NextRequest): boolean {
  if (!ADMIN_TOKEN) return false;
  const cookieStore = cookies();
  const adminCookie = cookieStore.get(COOKIE_NAME);
  if (adminCookie?.value === ADMIN_TOKEN) return true;
  const headerToken = request.headers.get("x-admin-token");
  if (headerToken === ADMIN_TOKEN) return true;
  return false;
}

interface ApiTeam {
  id: number;
  name: string;
  code?: string | null;
  logo?: string | null;
  team?: {
    id: number;
    name: string;
    code?: string | null;
    logo?: string | null;
  };
}

interface TeamsApiResponse {
  response: ApiTeam[];
  results?: number;
  errors?: Record<string, unknown> | unknown[];
}

interface SeasonsApiResponse {
  response: (string | number)[];
  errors?: Record<string, unknown> | unknown[];
}

interface FetchResult<T = TeamsApiResponse> {
  ok: boolean;
  data?: T;
  error?: string;
  status?: number;
  contentType?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch with timeout, retry, and non-JSON handling
 */
async function fetchWithRetry<T>(
  url: string,
  apiKey: string,
  retries = MAX_RETRIES
): Promise<FetchResult<T>> {
  let lastError = "";
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    
    try {
      console.log(`[fetchWithRetry] Attempt ${attempt}/${retries}: ${url}`);
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "x-apisports-key": apiKey,
        },
        signal: controller.signal,
        cache: "no-store",
      });
      
      clearTimeout(timeoutId);
      
      const contentType = response.headers.get("content-type") || "";
      const status = response.status;
      
      // Read body as text first
      const bodyText = await response.text();
      
      // Log non-200 or non-JSON responses
      if (!response.ok || !contentType.includes("application/json")) {
        console.error(`[fetchWithRetry] Non-OK response:`, {
          status,
          contentType,
          bodySnippet: bodyText.substring(0, 200),
        });
        
        if (!response.ok) {
          lastError = `Upstream returned ${status}: ${bodyText.substring(0, 100)}`;
          
          // Retry on 5xx errors
          if (status >= 500 && attempt < retries) {
            await sleep(RETRY_BACKOFF_MS * Math.pow(2, attempt - 1));
            continue;
          }
          
          return { ok: false, error: lastError, status, contentType };
        }
        
        if (!contentType.includes("application/json")) {
          return { 
            ok: false, 
            error: `Upstream returned HTML instead of JSON (status ${status})`,
            status,
            contentType,
          };
        }
      }
      
      // Parse JSON
      try {
        const data = JSON.parse(bodyText) as T;
        return { ok: true, data };
      } catch {
        return { 
          ok: false, 
          error: `JSON parse error: ${bodyText.substring(0, 100)}`,
          status,
          contentType,
        };
      }
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          lastError = `Request timed out after ${FETCH_TIMEOUT_MS}ms`;
        } else {
          lastError = error.message;
        }
      } else {
        lastError = "Unknown fetch error";
      }
      
      console.error(`[fetchWithRetry] Attempt ${attempt} failed:`, lastError);
      
      // Retry on network errors
      if (attempt < retries) {
        await sleep(RETRY_BACKOFF_MS * Math.pow(2, attempt - 1));
        continue;
      }
    }
  }
  
  return { ok: false, error: lastError };
}

/**
 * Get latest season from API-Sports /seasons endpoint
 * Returns the highest season value (handles both "2024-2025" and 2024 formats)
 */
async function getLatestSeason(
  baseUrl: string,
  apiKey: string,
  sport: string
): Promise<{ ok: boolean; season?: string; error?: string }> {
  // Check cache first
  if (seasonCache[sport]) {
    console.log(`[getLatestSeason] Using cached season for ${sport}: ${seasonCache[sport]}`);
    return { ok: true, season: seasonCache[sport] };
  }

  const url = `${baseUrl}/seasons`;
  console.log(`[getLatestSeason] Fetching seasons for ${sport}: ${url}`);

  const result = await fetchWithRetry<SeasonsApiResponse>(url, apiKey);

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  const seasons = result.data?.response;
  
  // Check for errors in response
  if (result.data?.errors && Object.keys(result.data.errors).length > 0) {
    const errStr = JSON.stringify(result.data.errors);
    console.error(`[getLatestSeason] API errors for ${sport}:`, errStr);
    return { ok: false, error: `API errors: ${errStr}` };
  }

  if (!seasons || seasons.length === 0) {
    return { ok: false, error: "No seasons returned from API" };
  }

  // Sort seasons to find the latest
  // Handles both string ("2024-2025") and number (2024) formats
  const sorted = [...seasons].sort((a, b) => {
    const aStr = String(a);
    const bStr = String(b);
    
    // Extract the first year for comparison
    const aYear = parseInt(aStr.split("-")[0], 10);
    const bYear = parseInt(bStr.split("-")[0], 10);
    
    if (isNaN(aYear) || isNaN(bYear)) {
      return bStr.localeCompare(aStr); // Fallback to string comparison
    }
    
    return bYear - aYear; // Descending (latest first)
  });

  const latestSeason = String(sorted[0]);
  console.log(`[getLatestSeason] ${sport} latest season: ${latestSeason} (from ${seasons.length} seasons)`);

  // Cache for this request
  seasonCache[sport] = latestSeason;

  return { ok: true, season: latestSeason };
}

/**
 * Check if API response has errors
 */
function hasApiErrors(errors: Record<string, unknown> | unknown[] | undefined): boolean {
  if (!errors) return false;
  if (Array.isArray(errors)) return errors.length > 0;
  return Object.keys(errors).length > 0;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    if (!isAuthorized(request)) {
      return NextResponse.json({ 
        ok: false, 
        error: "Unauthorized" 
      }, { status: 401 });
    }

    // Get sport from query
    const url = new URL(request.url);
    const sport = url.searchParams.get("sport")?.toLowerCase() as ValidSport | null;

    if (!sport || !VALID_SPORTS.includes(sport)) {
      return NextResponse.json({ 
        ok: false, 
        error: `Invalid sport. Use: ${VALID_SPORTS.join(", ")}` 
      }, { status: 400 });
    }

    // Check API key
    if (!API_SPORTS_KEY) {
      return NextResponse.json({ 
        ok: false, 
        league: sport,
        error: "Missing APISPORTS_KEY env var" 
      }, { status: 500 });
    }

    const adminClient = getAdminClient();
    if (!adminClient) {
      return NextResponse.json({ 
        ok: false, 
        league: sport,
        error: "Database not configured" 
      }, { status: 500 });
    }

    console.log(`[sync/teams] Starting ${sport.toUpperCase()} sync...`);

    const baseUrl = SPORT_BASE_URLS[sport];
    const leagueIds = SPORT_LEAGUE_IDS[sport];
    
    // Determine season to use
    let season: string;
    
    if (SPORTS_REQUIRING_SEASON_FETCH.includes(sport)) {
      // Fetch latest season from API for NFL/NBA/NHL
      const seasonResult = await getLatestSeason(baseUrl, API_SPORTS_KEY, sport);
      
      if (!seasonResult.ok || !seasonResult.season) {
        console.error(`[sync/teams] Failed to get season for ${sport}:`, seasonResult.error);
        return NextResponse.json({
          ok: false,
          league: sport,
          total: 0,
          inserted: 0,
          updated: 0,
          errors: [`Failed to fetch season: ${seasonResult.error}`],
        });
      }
      
      season = seasonResult.season;
      console.log(`[sync/teams] ${sport.toUpperCase()} using season: ${season}`);
    } else {
      // Use current year for MLB and Soccer
      season = String(new Date().getFullYear());
    }
    
    const allTeams: Array<{ id: number; name: string; logo: string | null; leagueId: number }> = [];
    const errors: string[] = [];

    for (const leagueId of leagueIds) {
      const endpoint = `${baseUrl}/teams?league=${leagueId}&season=${season}`;
      
      console.log(`[sync/teams] Fetching league ${leagueId}: ${endpoint}`);
      
      const result = await fetchWithRetry<TeamsApiResponse>(endpoint, API_SPORTS_KEY);
      
      if (!result.ok) {
        const errMsg = `League ${leagueId}: ${result.error}`;
        console.error(`[sync/teams] ${errMsg}`);
        errors.push(errMsg);
        continue;
      }

      // Check for API errors in response
      if (hasApiErrors(result.data?.errors)) {
        const errStr = JSON.stringify(result.data?.errors);
        console.error(`[sync/teams] API errors for league ${leagueId}:`, errStr);
        errors.push(`League ${leagueId}: API error - ${errStr}`);
        continue;
      }

      const teamsInResponse = result.data?.response || [];
      
      // Log if 0 teams returned
      if (teamsInResponse.length === 0) {
        console.warn(`[sync/teams] 0 teams for ${sport}`, {
          sport,
          leagueId,
          season,
          status: result.status,
          contentType: result.contentType,
          errors: result.data?.errors,
        });
      }

      // Normalize teams
      for (const item of teamsInResponse) {
        // Soccer wraps in { team: {...} }
        const team = item.team || item;
        if (team.id && team.name) {
          allTeams.push({
            id: team.id,
            name: team.name,
            logo: team.logo || null,
            leagueId,
          });
        }
      }
      
      console.log(`[sync/teams] League ${leagueId}: ${teamsInResponse.length} teams`);
      
      // Small delay between leagues to avoid rate limiting
      if (leagueIds.indexOf(leagueId) < leagueIds.length - 1) {
        await sleep(200);
      }
    }

    console.log(`[sync/teams] ${sport.toUpperCase()}: Found ${allTeams.length} total teams`);

    // Return ok:false if no teams found
    if (allTeams.length === 0) {
      return NextResponse.json({
        ok: false,
        league: sport,
        total: 0,
        inserted: 0,
        updated: 0,
        errors: errors.length > 0 
          ? errors 
          : [`No teams found for ${sport} (season: ${season})`],
      });
    }

    // Get existing teams to track inserted vs updated
    const teamIds = allTeams.map(t => t.id);
    const { data: existingTeams } = await adminClient
      .from("sports_teams")
      .select("id")
      .eq("league", sport.toLowerCase())
      .in("id", teamIds);
    
    const existingIds = new Set(existingTeams?.map(t => t.id) || []);

    // Prepare records for upsert
    const records = allTeams.map(team => ({
      id: team.id,
      league: sport.toLowerCase(),
      name: team.name,
      slug: `${sport.toLowerCase()}-${slugify(team.name)}`,
      logo: team.logo,
      country: null,
      updated_at: new Date().toISOString(),
    }));

    // Batch upsert using composite primary key
    const { error: upsertError } = await adminClient
      .from("sports_teams")
      .upsert(records, {
        onConflict: "league,id",
        ignoreDuplicates: false,
      });

    if (upsertError) {
      console.error(`[sync/teams] Upsert error:`, upsertError.message);
      return NextResponse.json({
        ok: false,
        league: sport,
        error: `Database error: ${upsertError.message}`,
        errors,
      }, { status: 500 });
    }

    // Count inserted vs updated
    let inserted = 0;
    let updated = 0;
    for (const team of allTeams) {
      if (existingIds.has(team.id)) {
        updated++;
      } else {
        inserted++;
      }
    }

    console.log(`[sync/teams] ${sport.toUpperCase()}: ${inserted} inserted, ${updated} updated (season: ${season})`);

    return NextResponse.json({
      ok: true,
      league: sport,
      total: allTeams.length,
      inserted,
      updated,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[sync/teams] Uncaught error:", msg);
    return NextResponse.json({
      ok: false,
      error: msg.substring(0, 200),
    }, { status: 500 });
  }
}
