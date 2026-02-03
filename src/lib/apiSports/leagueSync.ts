/**
 * API-Sports League Sync Utility
 * 
 * Syncs league data from API-Sports to sports_leagues table.
 * Only syncs selected leagues per sport (not all worldwide).
 * 
 * Schema (sports_leagues v2):
 * - id: bigserial (auto-increment PK)
 * - sport: text
 * - api_provider: text (default 'api-sports')
 * - league_id: integer (API league ID)
 * - name: text
 * - type: text
 * - country: text
 * - country_code: text
 * - season: text
 * - logo_url: text
 * - coverage: jsonb
 * - unique(api_provider, sport, league_id, season)
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { apiSportsFetchSafe, buildApiSportsUrl } from "./client";
import { getLeagueConfig, SOCCER_LEAGUES } from "./leagueConfig";

// API-Sports league response structure
interface ApiSportsLeagueRaw {
  id: number;
  name: string;
  type?: string;
  logo?: string;
  country?: {
    name?: string;
    code?: string;
    flag?: string;
  };
  seasons?: Array<{
    year: number;
    current: boolean;
    coverage?: Record<string, unknown>;
  }>;
}

// Normalized league for our database (matches new schema)
interface LeagueRecord {
  sport: string;
  api_provider: string;
  league_id: number;
  name: string;
  type: string | null;
  country: string | null;
  country_code: string | null;
  season: string | null;
  logo_url: string | null;
  coverage: Record<string, unknown> | null;
}

export interface LeagueSyncResult {
  success: boolean;
  sport: string;
  totalLeagues: number;
  inserted: number;
  updated: number;
  error?: string;
  leagues?: Array<{ id: number; name: string }>;
}

// League IDs to sync per sport
const LEAGUES_TO_SYNC = {
  // Basketball - NBA only
  NBA: [12], // NBA
  
  // Baseball - MLB only  
  MLB: [1], // MLB
  
  // Hockey - NHL only
  NHL: [57], // NHL
  
  // Soccer - Top European leagues + MLS + Champions League
  SOCCER: [
    SOCCER_LEAGUES.PREMIER_LEAGUE,   // 39 - English Premier League
    SOCCER_LEAGUES.LA_LIGA,          // 140 - Spanish La Liga
    SOCCER_LEAGUES.SERIE_A,          // 135 - Italian Serie A
    SOCCER_LEAGUES.BUNDESLIGA,       // 78 - German Bundesliga
    SOCCER_LEAGUES.LIGUE_1,          // 61 - French Ligue 1
    SOCCER_LEAGUES.MLS,              // 253 - American MLS
    SOCCER_LEAGUES.CHAMPIONS_LEAGUE, // 2 - UEFA Champions League
  ],
};

/**
 * Fetch leagues from API-Sports for a specific sport
 */
async function fetchLeaguesFromApi(
  sport: "NBA" | "MLB" | "NHL" | "SOCCER",
  apiKey: string
): Promise<{ leagues: ApiSportsLeagueRaw[]; error?: string }> {
  const config = getLeagueConfig(sport);
  const url = buildApiSportsUrl(config.baseUrl, "/leagues");
  
  console.log(`[fetchLeaguesFromApi] ${sport} fetching from: ${url}`);
  
  interface LeaguesResponse {
    response: Array<{
      league: ApiSportsLeagueRaw;
      country?: { name?: string; code?: string; flag?: string };
      seasons?: Array<{ year: number; current: boolean; coverage?: Record<string, unknown> }>;
    }>;
  }
  
  const result = await apiSportsFetchSafe<LeaguesResponse>(url, apiKey);
  
  if (!result.ok) {
    console.error(`[fetchLeaguesFromApi] ${sport} error:`, result.message);
    return { leagues: [], error: result.message };
  }
  
  // Normalize the response - different sports have different structures
  const leagues: ApiSportsLeagueRaw[] = [];
  
  for (const item of result.data.response || []) {
    // Some APIs nest under "league", some don't
    const league = item.league || item;
    
    leagues.push({
      id: league.id,
      name: league.name,
      type: league.type,
      logo: league.logo,
      country: item.country || league.country,
      seasons: item.seasons || league.seasons,
    });
  }
  
  console.log(`[fetchLeaguesFromApi] ${sport} found ${leagues.length} total leagues`);
  
  return { leagues };
}

/**
 * Filter leagues to only the ones we want to sync
 */
function filterLeaguesToSync(
  sport: "NBA" | "MLB" | "NHL" | "SOCCER",
  allLeagues: ApiSportsLeagueRaw[]
): ApiSportsLeagueRaw[] {
  const idsToSync = LEAGUES_TO_SYNC[sport] || [];
  
  const filtered = allLeagues.filter(league => idsToSync.includes(league.id));
  
  console.log(`[filterLeaguesToSync] ${sport}: ${filtered.length} of ${allLeagues.length} leagues match our filter`);
  
  return filtered;
}

/**
 * Get current season from seasons array
 */
function getCurrentSeason(seasons?: Array<{ year: number; current: boolean; coverage?: Record<string, unknown> }>): { season: string | null; coverage: Record<string, unknown> | null } {
  if (!seasons || seasons.length === 0) return { season: null, coverage: null };
  
  // Find current season
  const current = seasons.find(s => s.current);
  if (current) {
    return { 
      season: String(current.year), 
      coverage: current.coverage || null 
    };
  }
  
  // Fallback to most recent year
  const sorted = [...seasons].sort((a, b) => b.year - a.year);
  const latest = sorted[0];
  return { 
    season: latest ? String(latest.year) : null, 
    coverage: latest?.coverage || null 
  };
}

/**
 * Convert API league to database record (new schema)
 */
function normalizeLeague(
  sport: string,
  raw: ApiSportsLeagueRaw
): LeagueRecord {
  const { season, coverage } = getCurrentSeason(raw.seasons);
  
  return {
    sport: sport.toLowerCase(),
    api_provider: "api-sports",
    league_id: raw.id,
    name: raw.name,
    type: raw.type || null,
    country: raw.country?.name || null,
    country_code: raw.country?.code || null,
    season,
    logo_url: raw.logo || null,
    coverage,
  };
}

/**
 * Sync leagues for a specific sport
 */
export async function syncLeaguesForSport(
  adminClient: SupabaseClient,
  apiKey: string,
  sport: "NBA" | "MLB" | "NHL" | "SOCCER"
): Promise<LeagueSyncResult> {
  try {
    // Fetch all leagues from API
    const { leagues: allLeagues, error: fetchError } = await fetchLeaguesFromApi(sport, apiKey);
    
    if (fetchError) {
      return {
        success: false,
        sport,
        totalLeagues: 0,
        inserted: 0,
        updated: 0,
        error: fetchError,
      };
    }
    
    // Filter to only the ones we want
    const leaguesToSync = filterLeaguesToSync(sport, allLeagues);
    
    if (leaguesToSync.length === 0) {
      return {
        success: true,
        sport,
        totalLeagues: 0,
        inserted: 0,
        updated: 0,
        leagues: [],
      };
    }
    
    // Normalize records
    const records = leaguesToSync.map(raw => normalizeLeague(sport, raw));
    
    // Get existing leagues to track inserted vs updated
    const leagueIds = records.map(r => r.league_id);
    const { data: existingLeagues, error: selectError } = await adminClient
      .from("sports_leagues")
      .select("league_id")
      .eq("sport", sport.toLowerCase())
      .eq("api_provider", "api-sports")
      .in("league_id", leagueIds);
    
    if (selectError) {
      console.error(`[syncLeaguesForSport] ${sport} select error:`, selectError.message);
      // Continue anyway - we'll just count all as inserted
    }
    
    const existingIds = new Set(existingLeagues?.map(l => l.league_id) || []);
    
    // Upsert with new unique constraint columns
    const { error: upsertError } = await adminClient
      .from("sports_leagues")
      .upsert(records, {
        onConflict: "api_provider,sport,league_id,season",
        ignoreDuplicates: false,
      });
    
    if (upsertError) {
      return {
        success: false,
        sport,
        totalLeagues: 0,
        inserted: 0,
        updated: 0,
        error: `Database upsert error: ${upsertError.message}`,
      };
    }
    
    // Count inserted vs updated
    let inserted = 0;
    let updated = 0;
    for (const record of records) {
      if (existingIds.has(record.league_id)) {
        updated++;
      } else {
        inserted++;
      }
    }
    
    return {
      success: true,
      sport,
      totalLeagues: records.length,
      inserted,
      updated,
      leagues: records.map(r => ({ id: r.league_id, name: r.name })),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[syncLeaguesForSport] ${sport} error:`, message);
    return {
      success: false,
      sport,
      totalLeagues: 0,
      inserted: 0,
      updated: 0,
      error: message,
    };
  }
}

/**
 * Sync all leagues for all supported sports
 */
export async function syncAllLeagues(
  adminClient: SupabaseClient,
  apiKey: string
): Promise<{
  success: boolean;
  results: LeagueSyncResult[];
  totals: {
    totalLeagues: number;
    inserted: number;
    updated: number;
  };
  error?: string;
}> {
  const sports: Array<"NBA" | "MLB" | "NHL" | "SOCCER"> = ["NBA", "MLB", "NHL", "SOCCER"];
  const results: LeagueSyncResult[] = [];
  const totals = {
    totalLeagues: 0,
    inserted: 0,
    updated: 0,
  };
  
  let hasErrors = false;
  
  for (const sport of sports) {
    try {
      const result = await syncLeaguesForSport(adminClient, apiKey, sport);
      results.push(result);
      
      if (!result.success) {
        hasErrors = true;
      } else {
        totals.totalLeagues += result.totalLeagues;
        totals.inserted += result.inserted;
        totals.updated += result.updated;
      }
      
      // Small delay between sports to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (err) {
      hasErrors = true;
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error(`[syncAllLeagues] ${sport} error:`, message);
      results.push({
        success: false,
        sport,
        totalLeagues: 0,
        inserted: 0,
        updated: 0,
        error: message,
      });
    }
  }
  
  return {
    success: !hasErrors,
    results,
    totals,
  };
}
