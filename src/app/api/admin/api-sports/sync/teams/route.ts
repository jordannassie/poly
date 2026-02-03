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
// NBA uses API-NBA (v2.nba.api-sports.io), others use standard API-Sports
const SPORT_BASE_URLS: Record<ValidSport, string> = {
  nfl: "https://v1.american-football.api-sports.io",
  nba: "https://v2.nba.api-sports.io",  // API-NBA, not basketball
  mlb: "https://v1.baseball.api-sports.io",
  nhl: "https://v1.hockey.api-sports.io",
  soccer: "https://v3.football.api-sports.io",
};

// Names to filter out (conferences, not actual teams)
// AFC/NFC for NFL, East/West for NBA
const EXCLUDED_TEAM_NAMES = ["afc", "nfc", "east", "west"];

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

// Sports that use month-based season calculation (NHL seasons span two years)
const SPORTS_WITH_MONTH_BASED_SEASON: ValidSport[] = ["nhl"];

// NBA uses a robust multi-season fallback (tries 5 years + no-season)
const NBA_SPORT: ValidSport = "nba";

// NFL still fetches from /seasons endpoint
const SPORTS_REQUIRING_SEASON_FETCH: ValidSport[] = ["nfl"];

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
 * Get latest VALID season from API-Sports /seasons endpoint
 * Uses SAFE WINDOW logic to avoid future seasons:
 * 1. Filter out seasons > currentYear + 1
 * 2. Pick highest season <= currentYear
 * 3. Fallback to currentYear - 1
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

  const currentYear = new Date().getFullYear();
  const maxAllowedYear = currentYear + 1; // Don't allow seasons more than 1 year in future
  
  console.log(`[getLatestSeason] ${sport}: currentYear=${currentYear}, maxAllowed=${maxAllowedYear}, raw seasons:`, seasons.slice(0, 10));

  // Helper to extract the primary year from a season value
  // Handles: 2024, "2024", "2024-2025"
  const extractYear = (s: string | number): number => {
    const str = String(s);
    const firstPart = str.split("-")[0];
    return parseInt(firstPart, 10);
  };

  // Filter to valid seasons only (not in the future)
  const validSeasons = seasons
    .map(s => ({ original: s, year: extractYear(s) }))
    .filter(s => !isNaN(s.year) && s.year <= maxAllowedYear)
    .sort((a, b) => b.year - a.year); // Descending by year

  console.log(`[getLatestSeason] ${sport}: ${validSeasons.length} valid seasons (filtered from ${seasons.length})`);

  // Pick the best season:
  // 1. Prefer highest season <= currentYear
  // 2. If none, use highest valid season
  // 3. If still none, fallback to currentYear - 1
  let selectedSeason: string | null = null;

  // Try to find season <= currentYear
  const currentOrPast = validSeasons.find(s => s.year <= currentYear);
  if (currentOrPast) {
    selectedSeason = String(currentOrPast.original);
  } else if (validSeasons.length > 0) {
    // Use the highest valid season (might be currentYear + 1)
    selectedSeason = String(validSeasons[0].original);
  } else {
    // Fallback to currentYear - 1
    selectedSeason = String(currentYear - 1);
    console.warn(`[getLatestSeason] ${sport}: No valid seasons found, using fallback: ${selectedSeason}`);
  }

  console.log(`[getLatestSeason] ${sport}: selected season = ${selectedSeason}`);

  // Cache for this request
  seasonCache[sport] = selectedSeason;

  return { ok: true, season: selectedSeason };
}

/**
 * Calculate season for NBA/NHL based on current month
 * NBA/NHL seasons span two years (e.g., 2024-2025 season)
 * - If month <= 6 (Jan-Jun): we're in the second half of previous year's season
 * - If month > 6 (Jul-Dec): we're in the first half of current year's season
 * 
 * Returns { primarySeason, fallbackSeason }
 */
function getMonthBasedSeasons(): { primary: number; fallback: number } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  
  // If Jan-Jun, season started last year; if Jul-Dec, season starts this year
  const primarySeason = month <= 6 ? year - 1 : year;
  const fallbackSeason = primarySeason - 1;
  
  console.log(`[getMonthBasedSeasons] month=${month}, year=${year}, primary=${primarySeason}, fallback=${fallbackSeason}`);
  
  return { primary: primarySeason, fallback: fallbackSeason };
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
    
    const allTeams: Array<{ id: number; name: string; logo: string | null; leagueId: number }> = [];
    const errors: string[] = [];
    const attemptedSeasons: string[] = [];
    let triedNoSeason = false;
    let usedSeason = "";

    // Helper to fetch teams for a given season (or no season if null)
    const fetchTeamsForSeasonOrNoSeason = async (season: string | null): Promise<number> => {
      let teamsFound = 0;
      
      // NBA uses API-NBA which has different endpoint structure (no league param)
      if (sport === NBA_SPORT) {
        const endpoint = season 
          ? `${baseUrl}/teams?season=${season}`
          : `${baseUrl}/teams`;
        
        console.log(`[api-nba] Fetching: ${endpoint}`);
        
        const result = await fetchWithRetry<TeamsApiResponse>(endpoint, API_SPORTS_KEY);
        
        if (!result.ok) {
          console.error(`[api-nba] Error:`, result.error);
          errors.push(`NBA: ${result.error}`);
          return 0;
        }
        
        if (hasApiErrors(result.data?.errors)) {
          const errStr = JSON.stringify(result.data?.errors);
          console.error(`[api-nba] API errors:`, errStr);
          errors.push(`NBA: API error - ${errStr}`);
          return 0;
        }
        
        const teamsInResponse = result.data?.response || [];
        console.log(`[api-nba] season`, season || "none", `teams`, teamsInResponse.length);
        
        // Normalize NBA teams
        for (const item of teamsInResponse) {
          // API-NBA response structure may vary
          const teamId = item.id || item.team?.id;
          const teamName = item.name || item.team?.name;
          const teamLogo = item.logo || item.team?.logo;
          
          if (teamId && teamName) {
            // Filter out AFC/NFC
            if (EXCLUDED_TEAM_NAMES.includes(teamName.toLowerCase())) {
              continue;
            }
            allTeams.push({
              id: teamId,
              name: teamName,
              logo: teamLogo || null,
              leagueId: 0,
            });
            teamsFound++;
          }
        }
        
        return teamsFound;
      }
      
      // All other sports use standard API-Sports with league param
      for (const leagueId of leagueIds) {
        const endpoint = season 
          ? `${baseUrl}/teams?league=${leagueId}&season=${season}`
          : `${baseUrl}/teams?league=${leagueId}`;
        
        console.log(`[sync/teams] Fetching league ${leagueId}${season ? `, season ${season}` : ""}: ${endpoint}`);
        
        const result = await fetchWithRetry<TeamsApiResponse>(endpoint, API_SPORTS_KEY);
        
        if (!result.ok) {
          const errMsg = `League ${leagueId}${season ? ` season ${season}` : ""}: ${result.error}`;
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
        
        // NBA-specific logging
        if (sport === NBA_SPORT) {
          console.log(`[NBA] Season ${season || "none"}: ${teamsInResponse.length} teams`);
          if (teamsInResponse.length === 0) {
            console.log(`[NBA] 0 teams for season ${season || "none"}, status=${result.status}, contentType=${result.contentType}`);
          }
        } else if (teamsInResponse.length === 0) {
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
            // Filter out AFC/NFC (conferences, not actual teams)
            if (EXCLUDED_TEAM_NAMES.includes(team.name.toLowerCase())) {
              continue;
            }
            allTeams.push({
              id: team.id,
              name: team.name,
              logo: team.logo || null,
              leagueId,
            });
            teamsFound++;
          }
        }
        
        if (sport !== NBA_SPORT) {
          console.log(`[sync/teams] League ${leagueId}${season ? `, season ${season}` : ""}: ${teamsInResponse.length} teams`);
        }
        
        // Small delay between leagues
        if (leagueIds.indexOf(leagueId) < leagueIds.length - 1) {
          await sleep(200);
        }
      }
      
      return teamsFound;
    };

    // ============ NBA: Robust multi-season fallback ============
    if (sport === NBA_SPORT) {
      const currentYear = new Date().getFullYear();
      // Try: currentYear, currentYear-1, currentYear-2, currentYear-3, currentYear-4
      const nbaSeasons = [
        currentYear,
        currentYear - 1,
        currentYear - 2,
        currentYear - 3,
        currentYear - 4,
      ].map(String);
      
      console.log(`[NBA] Starting sync with candidate seasons: ${nbaSeasons.join(", ")}`);
      
      for (const season of nbaSeasons) {
        attemptedSeasons.push(season);
        console.log(`[NBA] Trying season ${season}...`);
        
        const teamsFound = await fetchTeamsForSeasonOrNoSeason(season);
        
        if (teamsFound > 0) {
          usedSeason = season;
          console.log(`[NBA] SUCCESS: Found ${teamsFound} teams with season ${season}`);
          break;
        } else {
          console.log(`[NBA] Season ${season}: 0 teams, trying next...`);
        }
      }
      
      // If all seasons returned 0, try without season param
      if (allTeams.length === 0) {
        console.log(`[NBA] All seasons returned 0 teams, trying without season param...`);
        triedNoSeason = true;
        const teamsFound = await fetchTeamsForSeasonOrNoSeason(null);
        
        if (teamsFound > 0) {
          usedSeason = "none";
          console.log(`[NBA] SUCCESS: Found ${teamsFound} teams without season param`);
        } else {
          console.log(`[NBA] FAILED: 0 teams even without season param`);
        }
      }
    }
    // ============ NHL: Month-based with fallback ============
    else if (SPORTS_WITH_MONTH_BASED_SEASON.includes(sport)) {
      const { primary, fallback } = getMonthBasedSeasons();
      const seasonsToTry = [String(primary), String(fallback)];
      console.log(`[sync/teams] ${sport.toUpperCase()} using month-based seasons: primary=${primary}, fallback=${fallback}`);
      
      for (const season of seasonsToTry) {
        attemptedSeasons.push(season);
        console.log(`[sync/teams] ${sport.toUpperCase()}: Trying season ${season}...`);
        
        const teamsFound = await fetchTeamsForSeasonOrNoSeason(season);
        
        if (teamsFound > 0) {
          usedSeason = season;
          console.log(`[sync/teams] ${sport.toUpperCase()}: Found ${teamsFound} teams with season ${season}`);
          break;
        } else {
          console.log(`[sync/teams] ${sport.toUpperCase()}: 0 teams for season ${season}, trying next...`);
        }
      }
    }
    // ============ NFL: Fetch from /seasons endpoint ============
    else if (SPORTS_REQUIRING_SEASON_FETCH.includes(sport)) {
      const seasonResult = await getLatestSeason(baseUrl, API_SPORTS_KEY, sport);
      
      if (!seasonResult.ok || !seasonResult.season) {
        console.error(`[sync/teams] Failed to get season for ${sport}:`, seasonResult.error);
        return NextResponse.json({
          ok: false,
          league: sport,
          total: 0,
          inserted: 0,
          updated: 0,
          reason: `Failed to fetch season: ${seasonResult.error}`,
          errors: [`Failed to fetch season: ${seasonResult.error}`],
        });
      }
      
      usedSeason = seasonResult.season;
      attemptedSeasons.push(usedSeason);
      console.log(`[sync/teams] ${sport.toUpperCase()} using fetched season: ${usedSeason}`);
      
      await fetchTeamsForSeasonOrNoSeason(usedSeason);
    }
    // ============ MLB and Soccer: Current year ============
    else {
      usedSeason = String(new Date().getFullYear());
      attemptedSeasons.push(usedSeason);
      console.log(`[sync/teams] ${sport.toUpperCase()} using current year: ${usedSeason}`);
      
      await fetchTeamsForSeasonOrNoSeason(usedSeason);
    }

    console.log(`[sync/teams] ${sport.toUpperCase()}: Found ${allTeams.length} total teams`);

    // Return ok:false if no teams found after trying all seasons
    if (allTeams.length === 0) {
      const response: Record<string, unknown> = {
        ok: false,
        league: sport,
        total: 0,
        inserted: 0,
        updated: 0,
        reason: `No teams found`,
        attemptedSeasons,
      };
      
      if (sport === NBA_SPORT) {
        response.triedNoSeason = triedNoSeason;
      }
      
      if (errors.length > 0) {
        response.errors = errors;
      }
      
      return NextResponse.json(response);
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
    // slug is name-only (no league prefix) - e.g., "arizona-cardinals" not "nfl-arizona-cardinals"
    const records = allTeams.map(team => ({
      id: team.id,
      league: sport.toLowerCase(),
      name: team.name,
      slug: slugify(team.name),  // Name-only slug for cleaner URLs
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

    console.log(`[sync/teams] ${sport.toUpperCase()}: ${inserted} inserted, ${updated} updated (season: ${usedSeason})`);

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
