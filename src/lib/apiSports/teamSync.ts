/**
 * API-Sports Team Sync Utility
 * 
 * Handles fetching teams from API-Sports and syncing to Supabase,
 * including downloading and storing team logos in Supabase Storage.
 * 
 * Supports: NFL, NBA, Soccer
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { uploadTeamLogo, downloadImage } from "@/lib/supabase/storage";
import { 
  getLeagueConfig, 
  SupportedLeague, 
  ApiSportsTeamRaw,
  SOCCER_LEAGUES 
} from "@/lib/apiSports/leagueConfig";
import { apiSportsFetch, apiSportsFetchSafe, buildApiSportsUrl } from "@/lib/apiSports/client";

const API_SPORTS_BASE_URL = process.env.API_SPORTS_BASE_URL || "https://v1.american-football.api-sports.io";

export interface ApiSportsTeam {
  id: number;
  name: string;
  code: string | null;
  city: string | null;
  logo: string | null;
}

export interface TeamSyncResult {
  teamId: number;
  name: string;
  logoSynced: boolean;
  logoPath?: string;
  error?: string;
}

export interface SyncTeamsResult {
  success: boolean;
  league: string;
  totalTeams: number;
  inserted: number;
  updated: number;
  logosUploaded: number;
  logosFailed: number;
  results: TeamSyncResult[];
  error?: string;
}

// Extended result with season info
export interface SyncTeamsWithSeasonResult extends SyncTeamsResult {
  seasonUsed: number | null;
  seasonsTried: number[];
  endpoint: string;
}

/**
 * Fetch NFL teams from API-Sports
 */
export async function fetchNFLTeams(apiKey: string): Promise<ApiSportsTeam[]> {
  // Try /teams?league=1 first
  let url = `${API_SPORTS_BASE_URL}/teams?league=1`;
  
  const result1 = await apiSportsFetchSafe<{ results: number; response: ApiSportsTeam[] }>(url, apiKey);
  
  if (result1.ok && result1.data.results && result1.data.results > 0) {
    return result1.data.response;
  }
  
  // Fallback to season=2025
  url = `${API_SPORTS_BASE_URL}/teams?league=1&season=2025`;
  const result2 = await apiSportsFetchSafe<{ results: number; response: ApiSportsTeam[] }>(url, apiKey);
  
  if (!result2.ok) {
    throw new Error(`NFL teams fetch failed: ${result2.message}`);
  }
  
  return result2.data.response || [];
}

/**
 * Sync a single team to the database and storage
 */
async function syncTeam(
  adminClient: SupabaseClient,
  league: string,
  team: ApiSportsTeam
): Promise<TeamSyncResult> {
  const result: TeamSyncResult = {
    teamId: team.id,
    name: team.name,
    logoSynced: false,
  };

  try {
    // Check if team already exists
    const { data: existingTeam } = await adminClient
      .from("sports_teams")
      .select("id, logo_path")
      .eq("league", league)
      .eq("api_team_id", team.id)
      .single();

    let logoPath = existingTeam?.logo_path || null;
    let logoUploaded = false;

    // Download and upload logo if available
    if (team.logo) {
      const imageData = await downloadImage(team.logo);
      
      if (imageData) {
        const uploadResult = await uploadTeamLogo(
          adminClient,
          league,
          team.id,
          imageData.buffer,
          imageData.contentType
        );

        if (uploadResult.success && uploadResult.path) {
          logoPath = uploadResult.path;
          logoUploaded = true;
          result.logoSynced = true;
          result.logoPath = uploadResult.path;
        } else {
          // Upload failed - don't delete existing logo_path
          result.error = uploadResult.error;
        }
      } else {
        result.error = "Failed to download logo image";
      }
    }

    // Upsert team record
    const teamRecord = {
      league,
      api_team_id: team.id,
      name: team.name,
      logo_url_original: team.logo || null,
      // Only update logo_path if we successfully uploaded a new one
      // This preserves existing logo_path if upload fails
      ...(logoUploaded ? { logo_path: logoPath } : {}),
    };

    if (existingTeam?.id) {
      // Update existing team
      const { error: updateError } = await adminClient
        .from("sports_teams")
        .update({
          name: team.name,
          logo_url_original: team.logo || null,
          ...(logoUploaded ? { logo_path: logoPath } : {}),
        })
        .eq("id", existingTeam.id);

      if (updateError) {
        result.error = `DB update error: ${updateError.message}`;
      }
    } else {
      // Insert new team
      const { error: insertError } = await adminClient
        .from("sports_teams")
        .insert({
          ...teamRecord,
          logo_path: logoPath, // Include logo_path for new records
        });

      if (insertError) {
        result.error = `DB insert error: ${insertError.message}`;
      }
    }

    return result;
  } catch (err) {
    result.error = err instanceof Error ? err.message : "Unknown error";
    return result;
  }
}

/**
 * Sync all NFL teams from API-Sports to Supabase
 * - Fetches teams from API-Sports
 * - Downloads logos and uploads to Supabase Storage
 * - Upserts team records with logo paths
 */
export async function syncNFLTeams(
  adminClient: SupabaseClient,
  apiKey: string
): Promise<SyncTeamsResult> {
  const league = "NFL";
  
  try {
    // Fetch teams from API-Sports
    const teams = await fetchNFLTeams(apiKey);

    if (!teams || teams.length === 0) {
      return {
        success: false,
        league,
        totalTeams: 0,
        inserted: 0,
        updated: 0,
        logosUploaded: 0,
        logosFailed: 0,
        results: [],
        error: "No teams returned from API-Sports",
      };
    }

    // Get existing teams to track inserted vs updated
    const { data: existingTeams } = await adminClient
      .from("sports_teams")
      .select("api_team_id")
      .eq("league", league);

    const existingTeamIds = new Set(existingTeams?.map(t => t.api_team_id) || []);

    // Sync each team
    const results: TeamSyncResult[] = [];
    let inserted = 0;
    let updated = 0;
    let logosUploaded = 0;
    let logosFailed = 0;

    for (const team of teams) {
      const result = await syncTeam(adminClient, league, team);
      results.push(result);

      if (existingTeamIds.has(team.id)) {
        updated++;
      } else {
        inserted++;
      }

      if (result.logoSynced) {
        logosUploaded++;
      } else if (team.logo) {
        // Had a logo URL but failed to sync
        logosFailed++;
      }
    }

    return {
      success: true,
      league,
      totalTeams: teams.length,
      inserted,
      updated,
      logosUploaded,
      logosFailed,
      results,
    };
  } catch (err) {
    return {
      success: false,
      league,
      totalTeams: 0,
      inserted: 0,
      updated: 0,
      logosUploaded: 0,
      logosFailed: 0,
      results: [],
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// ============================================================================
// GENERIC LEAGUE SYNC (Used by NBA and Soccer)
// ============================================================================

/**
 * Fetch teams from API-Sports for any supported league
 */
export async function fetchLeagueTeams(
  apiKey: string,
  league: SupportedLeague,
  customEndpoint?: string
): Promise<ApiSportsTeam[]> {
  const config = getLeagueConfig(league);
  const url = customEndpoint 
    ? buildApiSportsUrl(config.baseUrl, customEndpoint)
    : buildApiSportsUrl(config.baseUrl, config.teamsEndpoint);
  
  const data = await apiSportsFetch<{ response: unknown[] }>(url, apiKey);
  
  // Use the league-specific extractor to normalize team data
  const rawTeams = config.teamExtractor(data);
  
  // Normalize to our ApiSportsTeam interface
  return rawTeams.map((t: ApiSportsTeamRaw) => ({
    id: t.id,
    name: t.name,
    code: t.code || null,
    city: t.city || null,
    logo: t.logo || null,
  }));
}

/**
 * Generic sync function for any supported league
 */
export async function syncLeagueTeams(
  adminClient: SupabaseClient,
  apiKey: string,
  league: SupportedLeague,
  customEndpoint?: string
): Promise<SyncTeamsResult> {
  try {
    // Fetch teams from API-Sports
    const teams = await fetchLeagueTeams(apiKey, league, customEndpoint);

    if (!teams || teams.length === 0) {
      return {
        success: false,
        league,
        totalTeams: 0,
        inserted: 0,
        updated: 0,
        logosUploaded: 0,
        logosFailed: 0,
        results: [],
        error: `No teams returned from API-Sports for ${league}`,
      };
    }

    // Get existing teams to track inserted vs updated
    const { data: existingTeams } = await adminClient
      .from("sports_teams")
      .select("api_team_id")
      .eq("league", league);

    const existingTeamIds = new Set(existingTeams?.map(t => t.api_team_id) || []);

    // Sync each team
    const results: TeamSyncResult[] = [];
    let inserted = 0;
    let updated = 0;
    let logosUploaded = 0;
    let logosFailed = 0;

    for (const team of teams) {
      const result = await syncTeam(adminClient, league, team);
      results.push(result);

      if (existingTeamIds.has(team.id)) {
        updated++;
      } else {
        inserted++;
      }

      if (result.logoSynced) {
        logosUploaded++;
      } else if (team.logo) {
        logosFailed++;
      }
    }

    return {
      success: true,
      league,
      totalTeams: teams.length,
      inserted,
      updated,
      logosUploaded,
      logosFailed,
      results,
    };
  } catch (err) {
    return {
      success: false,
      league,
      totalTeams: 0,
      inserted: 0,
      updated: 0,
      logosUploaded: 0,
      logosFailed: 0,
      results: [],
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// ============================================================================
// NBA SYNC
// ============================================================================

/**
 * Fetch NBA teams from API-Sports
 */
export async function fetchNBATeams(apiKey: string): Promise<ApiSportsTeam[]> {
  return fetchLeagueTeams(apiKey, "NBA");
}

/**
 * Sync all NBA teams from API-Sports to Supabase
 */
export async function syncNBATeams(
  adminClient: SupabaseClient,
  apiKey: string
): Promise<SyncTeamsResult> {
  return syncLeagueTeams(adminClient, apiKey, "NBA");
}

// ============================================================================
// SOCCER SYNC
// ============================================================================

/**
 * Fetch Soccer teams from API-Sports for a specific league
 * @param apiKey - API-Sports key
 * @param soccerLeagueId - Soccer league ID (e.g., 39 for Premier League)
 * @param season - Season year (default: 2024)
 */
export async function fetchSoccerTeams(
  apiKey: string,
  soccerLeagueId: number = SOCCER_LEAGUES.PREMIER_LEAGUE,
  season: number = 2024
): Promise<ApiSportsTeam[]> {
  const endpoint = `/teams?league=${soccerLeagueId}&season=${season}`;
  return fetchLeagueTeams(apiKey, "SOCCER", endpoint);
}

/**
 * Sync Soccer teams from API-Sports to Supabase
 * By default syncs Premier League teams. Can sync multiple leagues.
 * 
 * @param adminClient - Supabase admin client
 * @param apiKey - API-Sports key
 * @param soccerLeagueIds - Array of soccer league IDs to sync (optional)
 * @param season - Season year (default: 2024)
 */
export async function syncSoccerTeams(
  adminClient: SupabaseClient,
  apiKey: string,
  soccerLeagueIds: number[] = [SOCCER_LEAGUES.PREMIER_LEAGUE],
  season: number = 2024
): Promise<SyncTeamsResult> {
  const league = "SOCCER";
  
  try {
    let allTeams: ApiSportsTeam[] = [];
    const seenTeamIds = new Set<number>();
    
    // Fetch teams from each soccer league
    for (const leagueId of soccerLeagueIds) {
      const teams = await fetchSoccerTeams(apiKey, leagueId, season);
      
      // Deduplicate teams (same team can appear in multiple competitions)
      for (const team of teams) {
        if (!seenTeamIds.has(team.id)) {
          seenTeamIds.add(team.id);
          allTeams.push(team);
        }
      }
    }

    if (allTeams.length === 0) {
      return {
        success: false,
        league,
        totalTeams: 0,
        inserted: 0,
        updated: 0,
        logosUploaded: 0,
        logosFailed: 0,
        results: [],
        error: "No teams returned from API-Sports for Soccer",
      };
    }

    // Get existing teams to track inserted vs updated
    const { data: existingTeams } = await adminClient
      .from("sports_teams")
      .select("api_team_id")
      .eq("league", league);

    const existingTeamIds = new Set(existingTeams?.map(t => t.api_team_id) || []);

    // Sync each team
    const results: TeamSyncResult[] = [];
    let inserted = 0;
    let updated = 0;
    let logosUploaded = 0;
    let logosFailed = 0;

    for (const team of allTeams) {
      const result = await syncTeam(adminClient, league, team);
      results.push(result);

      if (existingTeamIds.has(team.id)) {
        updated++;
      } else {
        inserted++;
      }

      if (result.logoSynced) {
        logosUploaded++;
      } else if (team.logo) {
        logosFailed++;
      }
    }

    return {
      success: true,
      league,
      totalTeams: allTeams.length,
      inserted,
      updated,
      logosUploaded,
      logosFailed,
      results,
    };
  } catch (err) {
    return {
      success: false,
      league,
      totalTeams: 0,
      inserted: 0,
      updated: 0,
      logosUploaded: 0,
      logosFailed: 0,
      results: [],
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// ============================================================================
// SEASON-AWARE TEAM SYNC WITH RETRY
// ============================================================================

/**
 * Fetch teams with explicit season parameter
 * Builds the correct endpoint for each league type
 */
async function fetchTeamsWithSeason(
  apiKey: string,
  league: "NFL" | "NBA" | "MLB" | "NHL",
  season: number
): Promise<{ teams: ApiSportsTeam[]; endpoint: string }> {
  const config = getLeagueConfig(league);
  
  // Build endpoint with season parameter
  // Most API-Sports endpoints use: /teams?league={id}&season={year}
  const endpoint = `/teams?league=${config.leagueId}&season=${season}`;
  const fullUrl = buildApiSportsUrl(config.baseUrl, endpoint);
  
  console.log(`[fetchTeamsWithSeason] ${league} trying: ${fullUrl}`);
  
  const data = await apiSportsFetch<{ response: unknown[] }>(fullUrl, apiKey);
  
  // Use the league-specific extractor to normalize team data
  const rawTeams = config.teamExtractor(data);
  
  const teams = rawTeams.map((t: ApiSportsTeamRaw) => ({
    id: t.id,
    name: t.name,
    code: t.code || null,
    city: t.city || null,
    logo: t.logo || null,
  }));
  
  console.log(`[fetchTeamsWithSeason] ${league} season ${season}: ${teams.length} teams`);
  
  return { teams, endpoint: fullUrl };
}

/**
 * Sync teams with season retry logic
 * 
 * Tries seasons in order:
 * 1. Provided season (if given)
 * 2. Current year
 * 3. Current year - 1
 * 4. Current year - 2
 * 
 * Stops as soon as teams are found.
 */
export async function syncTeamsWithSeason(
  adminClient: SupabaseClient,
  apiKey: string,
  league: "NFL" | "NBA" | "MLB" | "NHL",
  providedSeason?: number | null
): Promise<SyncTeamsWithSeasonResult> {
  const currentYear = new Date().getUTCFullYear();
  
  // Build list of seasons to try
  const seasonsToTry: number[] = [];
  
  if (providedSeason && !isNaN(providedSeason)) {
    seasonsToTry.push(providedSeason);
    // Also add fallbacks if provided season doesn't work
    if (providedSeason !== currentYear) {
      seasonsToTry.push(currentYear);
    }
    seasonsToTry.push(currentYear - 1);
    seasonsToTry.push(currentYear - 2);
  } else {
    // Default: try current year and previous years
    seasonsToTry.push(currentYear);
    seasonsToTry.push(currentYear - 1);
    seasonsToTry.push(currentYear - 2);
  }
  
  // Remove duplicates
  const uniqueSeasons = [...new Set(seasonsToTry)];
  
  let teams: ApiSportsTeam[] = [];
  let usedEndpoint = "";
  let seasonUsed: number | null = null;
  
  // Try each season until we get teams
  for (const season of uniqueSeasons) {
    try {
      const result = await fetchTeamsWithSeason(apiKey, league, season);
      
      if (result.teams.length > 0) {
        teams = result.teams;
        usedEndpoint = result.endpoint;
        seasonUsed = season;
        break;
      }
    } catch (err) {
      console.error(`[syncTeamsWithSeason] ${league} season ${season} failed:`, 
        err instanceof Error ? err.message : err);
      // Continue to next season
    }
  }
  
  // If still no teams after all retries
  if (teams.length === 0) {
    return {
      success: false,
      league,
      seasonUsed: null,
      seasonsTried: uniqueSeasons,
      endpoint: usedEndpoint,
      totalTeams: 0,
      inserted: 0,
      updated: 0,
      logosUploaded: 0,
      logosFailed: 0,
      results: [],
      error: `No teams returned from API-Sports for ${league}. Tried seasons: ${uniqueSeasons.join(", ")}`,
    };
  }
  
  // Get existing teams to track inserted vs updated
  const { data: existingTeams } = await adminClient
    .from("sports_teams")
    .select("api_team_id")
    .eq("league", league);

  const existingTeamIds = new Set(existingTeams?.map(t => t.api_team_id) || []);

  // Sync each team
  const results: TeamSyncResult[] = [];
  let inserted = 0;
  let updated = 0;
  let logosUploaded = 0;
  let logosFailed = 0;

  for (const team of teams) {
    const result = await syncTeam(adminClient, league, team);
    results.push(result);

    if (existingTeamIds.has(team.id)) {
      updated++;
    } else {
      inserted++;
    }

    if (result.logoSynced) {
      logosUploaded++;
    } else if (team.logo) {
      logosFailed++;
    }
  }

  return {
    success: true,
    league,
    seasonUsed,
    seasonsTried: uniqueSeasons,
    endpoint: usedEndpoint,
    totalTeams: teams.length,
    inserted,
    updated,
    logosUploaded,
    logosFailed,
    results,
  };
}
