/**
 * API-Sports League Sync Utility
 * 
 * Syncs league data from API-Sports to sports_leagues table.
 * Only syncs selected leagues per sport (not all worldwide).
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { apiSportsFetch, buildApiSportsUrl } from "./client";
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
  }>;
}

// Normalized league for our database
interface LeagueRecord {
  id: number;
  sport: string;
  name: string;
  country: string | null;
  season: number | null;
  logo: string | null;
  active: boolean;
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
): Promise<ApiSportsLeagueRaw[]> {
  const config = getLeagueConfig(sport);
  const url = buildApiSportsUrl(config.baseUrl, "/leagues");
  
  console.log(`[fetchLeaguesFromApi] ${sport} fetching from: ${url}`);
  
  interface LeaguesResponse {
    response: Array<{
      league: ApiSportsLeagueRaw;
      country?: { name?: string; code?: string; flag?: string };
      seasons?: Array<{ year: number; current: boolean }>;
    }>;
  }
  
  const data = await apiSportsFetch<LeaguesResponse>(url, apiKey);
  
  // Normalize the response - different sports have different structures
  const leagues: ApiSportsLeagueRaw[] = [];
  
  for (const item of data.response || []) {
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
  
  return leagues;
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
function getCurrentSeason(seasons?: Array<{ year: number; current: boolean }>): number | null {
  if (!seasons || seasons.length === 0) return null;
  
  // Find current season
  const current = seasons.find(s => s.current);
  if (current) return current.year;
  
  // Fallback to most recent year
  const sorted = [...seasons].sort((a, b) => b.year - a.year);
  return sorted[0]?.year || null;
}

/**
 * Convert API league to database record
 */
function normalizeLeague(
  sport: string,
  raw: ApiSportsLeagueRaw
): LeagueRecord {
  return {
    id: raw.id,
    sport: sport.toLowerCase(),
    name: raw.name,
    country: raw.country?.name || null,
    season: getCurrentSeason(raw.seasons),
    logo: raw.logo || null,
    active: true,
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
    const allLeagues = await fetchLeaguesFromApi(sport, apiKey);
    
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
    
    // Get existing leagues to track inserted vs updated
    const leagueIds = leaguesToSync.map(l => l.id);
    const { data: existingLeagues } = await adminClient
      .from("sports_leagues")
      .select("id")
      .in("id", leagueIds);
    
    const existingIds = new Set(existingLeagues?.map(l => l.id) || []);
    
    // Normalize and upsert
    const records = leaguesToSync.map(raw => normalizeLeague(sport, raw));
    
    const { error: upsertError } = await adminClient
      .from("sports_leagues")
      .upsert(records, {
        onConflict: "id",
      });
    
    if (upsertError) {
      return {
        success: false,
        sport,
        totalLeagues: 0,
        inserted: 0,
        updated: 0,
        error: `Database error: ${upsertError.message}`,
      };
    }
    
    // Count inserted vs updated
    let inserted = 0;
    let updated = 0;
    for (const record of records) {
      if (existingIds.has(record.id)) {
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
      leagues: records.map(r => ({ id: r.id, name: r.name })),
    };
  } catch (err) {
    return {
      success: false,
      sport,
      totalLeagues: 0,
      inserted: 0,
      updated: 0,
      error: err instanceof Error ? err.message : "Unknown error",
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
      results.push({
        success: false,
        sport,
        totalLeagues: 0,
        inserted: 0,
        updated: 0,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }
  
  return {
    success: !hasErrors,
    results,
    totals,
  };
}
