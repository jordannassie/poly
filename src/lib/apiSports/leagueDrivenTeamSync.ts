/**
 * League-Driven Team Sync
 * 
 * Syncs teams by querying active leagues from sports_leagues table,
 * then fetching teams for each league using league_id + season.
 * 
 * Teams are stored with league_id for proper linking.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { uploadTeamLogo, downloadImage } from "@/lib/supabase/storage";
import { apiSportsFetchSafe, buildApiSportsUrl } from "./client";

// Base URLs for each sport
const SPORT_BASE_URLS: Record<string, string> = {
  nba: "https://v1.basketball.api-sports.io",
  mlb: "https://v1.baseball.api-sports.io",
  nhl: "https://v1.hockey.api-sports.io",
  soccer: "https://v3.football.api-sports.io",
  nfl: "https://v1.american-football.api-sports.io",
};

// League record from database (new schema)
interface DbLeague {
  id: number;           // Auto-increment PK
  league_id: number;    // API league ID
  sport: string;
  name: string;
  season: string | null;
}

// Team from API-Sports
interface ApiTeam {
  id: number;
  name: string;
  code?: string | null;
  logo?: string | null;
  // Soccer wraps in team object
  team?: {
    id: number;
    name: string;
    code?: string | null;
    logo?: string | null;
  };
}

// Result for a single team sync
interface TeamSyncResult {
  teamId: number;
  name: string;
  logoSynced: boolean;
  logoPath?: string;
  error?: string;
}

// Result for a single league
interface LeagueSyncResult {
  leagueId: number;
  leagueName: string;
  sport: string;
  success: boolean;
  teamsFound: number;
  inserted: number;
  updated: number;
  logosUploaded: number;
  error?: string;
}

// Overall result
export interface LeagueDrivenSyncResult {
  success: boolean;
  leaguesSynced: number;
  totalTeams: number;
  inserted: number;
  updated: number;
  logosUploaded: number;
  logosFailed: number;
  leagueResults: LeagueSyncResult[];
  error?: string;
}

/**
 * Get active leagues from database (new schema)
 * Note: New schema doesn't have 'active' column, so we select all leagues
 */
async function getActiveLeagues(
  adminClient: SupabaseClient,
  sport?: string
): Promise<DbLeague[]> {
  let query = adminClient
    .from("sports_leagues")
    .select("id, league_id, sport, name, season");
  
  if (sport) {
    query = query.eq("sport", sport.toLowerCase());
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error("[getActiveLeagues] Error:", error.message);
    return [];
  }
  
  return data || [];
}

/**
 * Fetch teams for a specific league from API-Sports
 */
async function fetchTeamsForLeague(
  league: DbLeague,
  apiKey: string
): Promise<ApiTeam[]> {
  const baseUrl = SPORT_BASE_URLS[league.sport.toLowerCase()];
  if (!baseUrl) {
    console.warn(`[fetchTeamsForLeague] Unknown sport: ${league.sport}`);
    return [];
  }
  
  // Build endpoint based on sport
  let endpoint: string;
  const season = league.season || String(new Date().getFullYear());
  
  if (league.sport.toLowerCase() === "soccer") {
    // Soccer uses /teams?league={id}&season={year}
    endpoint = `/teams?league=${league.league_id}&season=${season}`;
  } else {
    // Basketball, Baseball, Hockey use /teams?league={id}&season={year}
    endpoint = `/teams?league=${league.league_id}&season=${season}`;
  }
  
  const url = buildApiSportsUrl(baseUrl, endpoint);
  console.log(`[fetchTeamsForLeague] ${league.name} (${league.sport}): ${url}`);
  
  interface TeamsResponse {
    response: ApiTeam[];
    results?: number;
  }
  
  const result = await apiSportsFetchSafe<TeamsResponse>(url, apiKey);
  
  if (!result.ok) {
    console.error(`[fetchTeamsForLeague] ${league.name} error:`, result.message);
    return [];
  }
  
  // Normalize teams - soccer wraps in { team: {...}, venue: {...} }
  const teams: ApiTeam[] = [];
  for (const item of result.data.response || []) {
    if (item.team) {
      // Soccer format
      teams.push({
        id: item.team.id,
        name: item.team.name,
        code: item.team.code,
        logo: item.team.logo,
      });
    } else {
      // Other sports format
      teams.push({
        id: item.id,
        name: item.name,
        code: item.code,
        logo: item.logo,
      });
    }
  }
  
  console.log(`[fetchTeamsForLeague] ${league.name}: ${teams.length} teams`);
  return teams;
}

/**
 * Sync a single team to database with logo
 */
async function syncTeamToDb(
  adminClient: SupabaseClient,
  sport: string,
  leagueId: number,
  team: ApiTeam
): Promise<TeamSyncResult> {
  const result: TeamSyncResult = {
    teamId: team.id,
    name: team.name,
    logoSynced: false,
  };
  
  try {
    // Check if team already exists (by sport + api_team_id)
    const { data: existingTeam } = await adminClient
      .from("sports_teams")
      .select("id, logo_path")
      .eq("league", sport.toUpperCase())
      .eq("api_team_id", team.id)
      .single();
    
    let logoPath = existingTeam?.logo_path || null;
    let logoUploaded = false;
    
    // Download and upload logo if available and not already cached
    if (team.logo && !existingTeam?.logo_path) {
      try {
        const imageData = await downloadImage(team.logo);
        
        if (imageData) {
          const uploadResult = await uploadTeamLogo(
            adminClient,
            sport.toUpperCase(),
            team.id,
            imageData.buffer,
            imageData.contentType
          );
          
          if (uploadResult.success && uploadResult.path) {
            logoPath = uploadResult.path;
            logoUploaded = true;
            result.logoSynced = true;
            result.logoPath = uploadResult.path;
          }
        }
      } catch (logoErr) {
        console.warn(`[syncTeamToDb] Logo download failed for ${team.name}:`, logoErr);
      }
    } else if (existingTeam?.logo_path) {
      // Already have logo cached
      result.logoSynced = true;
      result.logoPath = existingTeam.logo_path;
    }
    
    // Upsert team record
    const teamRecord = {
      league: sport.toUpperCase(),
      league_id: leagueId,
      api_team_id: team.id,
      name: team.name,
      logo_path: logoPath,
      logo_url_original: team.logo || null,
      updated_at: new Date().toISOString(),
    };
    
    const { error: upsertError } = await adminClient
      .from("sports_teams")
      .upsert(teamRecord, {
        onConflict: "league,api_team_id",
      });
    
    if (upsertError) {
      result.error = upsertError.message;
    }
    
    return result;
  } catch (err) {
    result.error = err instanceof Error ? err.message : "Unknown error";
    return result;
  }
}

/**
 * Sync teams for a specific league
 */
async function syncLeagueTeams(
  adminClient: SupabaseClient,
  apiKey: string,
  league: DbLeague
): Promise<LeagueSyncResult> {
  const result: LeagueSyncResult = {
    leagueId: league.league_id,
    leagueName: league.name,
    sport: league.sport,
    success: false,
    teamsFound: 0,
    inserted: 0,
    updated: 0,
    logosUploaded: 0,
  };
  
  try {
    // Fetch teams from API
    const teams = await fetchTeamsForLeague(league, apiKey);
    result.teamsFound = teams.length;
    
    if (teams.length === 0) {
      result.success = true;
      return result;
    }
    
    // Get existing team IDs to track inserted vs updated
    const teamIds = teams.map(t => t.id);
    const { data: existingTeams } = await adminClient
      .from("sports_teams")
      .select("api_team_id")
      .eq("league", league.sport.toUpperCase())
      .in("api_team_id", teamIds);
    
    const existingIds = new Set(existingTeams?.map(t => t.api_team_id) || []);
    
    // Sync each team
    for (const team of teams) {
      const teamResult = await syncTeamToDb(adminClient, league.sport, league.league_id, team);
      
      if (existingIds.has(team.id)) {
        result.updated++;
      } else {
        result.inserted++;
      }
      
      if (teamResult.logoSynced) {
        result.logosUploaded++;
      }
    }
    
    result.success = true;
    return result;
  } catch (err) {
    result.error = err instanceof Error ? err.message : "Unknown error";
    return result;
  }
}

/**
 * Sync all teams from active leagues
 * 
 * @param adminClient - Supabase admin client
 * @param apiKey - API-Sports key
 * @param sport - Optional: filter to specific sport
 */
export async function syncTeamsFromActiveLeagues(
  adminClient: SupabaseClient,
  apiKey: string,
  sport?: string
): Promise<LeagueDrivenSyncResult> {
  const result: LeagueDrivenSyncResult = {
    success: false,
    leaguesSynced: 0,
    totalTeams: 0,
    inserted: 0,
    updated: 0,
    logosUploaded: 0,
    logosFailed: 0,
    leagueResults: [],
  };
  
  try {
    // Get active leagues from database
    const leagues = await getActiveLeagues(adminClient, sport);
    
    if (leagues.length === 0) {
      result.error = sport 
        ? `No active leagues found for ${sport}. Run "Sync Leagues" first.`
        : "No active leagues found. Run 'Sync Leagues' first.";
      return result;
    }
    
    console.log(`[syncTeamsFromActiveLeagues] Found ${leagues.length} active leagues`);
    
    // Track global team deduplication (api_team_id + sport)
    const seenTeams = new Set<string>();
    
    // Sync each league
    for (const league of leagues) {
      try {
        const leagueResult = await syncLeagueTeams(adminClient, apiKey, league);
        result.leagueResults.push(leagueResult);
        
        if (leagueResult.success) {
          result.leaguesSynced++;
          result.totalTeams += leagueResult.teamsFound;
          result.inserted += leagueResult.inserted;
          result.updated += leagueResult.updated;
          result.logosUploaded += leagueResult.logosUploaded;
        }
        
        // Small delay between leagues to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (leagueErr) {
        result.leagueResults.push({
          leagueId: league.league_id,
          leagueName: league.name,
          sport: league.sport,
          success: false,
          teamsFound: 0,
          inserted: 0,
          updated: 0,
          logosUploaded: 0,
          error: leagueErr instanceof Error ? leagueErr.message : "Unknown error",
        });
      }
    }
    
    result.success = result.leaguesSynced > 0;
    return result;
  } catch (err) {
    result.error = err instanceof Error ? err.message : "Unknown error";
    return result;
  }
}

/**
 * Sync teams for a specific sport from active leagues
 */
export async function syncTeamsForSport(
  adminClient: SupabaseClient,
  apiKey: string,
  sport: string
): Promise<LeagueDrivenSyncResult> {
  return syncTeamsFromActiveLeagues(adminClient, apiKey, sport);
}
