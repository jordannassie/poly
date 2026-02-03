/**
 * Get Popular Teams
 * 
 * Returns a curated list of popular teams for the sidebar.
 * Uses the new sports_teams schema: id, league, name, slug, logo, country
 */

import { createClient } from "@supabase/supabase-js";
import { getTeamColor } from "./teamColors";
import { TeamListItem } from "./getAllTeams";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function getClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

// Names to filter out (conferences, not actual teams)
const EXCLUDED_NAMES = ["afc", "nfc", "east", "west"];

// Curated list of popular team names to show in sidebar
// Order matters - these are displayed in this order
const POPULAR_TEAM_NAMES = [
  // NFL
  "Kansas City Chiefs",
  "Dallas Cowboys",
  "New England Patriots",
  // NBA
  "Los Angeles Lakers",
  "Golden State Warriors",
  // Soccer
  "Manchester United",
  "Real Madrid",
  "Liverpool",
  // NHL
  "Boston Bruins",
  "Toronto Maple Leafs",
  // MLB
  "New York Yankees",
  "Los Angeles Dodgers",
];

/**
 * Get popular teams for sidebar display
 * 
 * Returns a subset of teams that are popular/featured.
 * Falls back to first N teams by updated_at desc if no matches found.
 */
export async function getPopularTeams(limit: number = 6): Promise<TeamListItem[]> {
  const client = getClient();
  if (!client) {
    return [];
  }

  // Fetch all teams (ordered by updated_at desc to get recently synced first)
  const { data: teams, error } = await client
    .from("sports_teams")
    .select("id, league, name, slug, logo, country")
    .order("updated_at", { ascending: false })
    .limit(200); // Limit to avoid fetching too many

  if (error || !teams || teams.length === 0) {
    return [];
  }

  // Filter out AFC/NFC (conferences, not teams)
  const filteredTeams = teams.filter(t => !EXCLUDED_NAMES.includes(t.name.toLowerCase()));

  // Try to find our curated popular teams
  const popularTeams: TeamListItem[] = [];
  
  for (const popularName of POPULAR_TEAM_NAMES) {
    if (popularTeams.length >= limit) break;
    
    const team = filteredTeams.find(t => 
      t.name.toLowerCase() === popularName.toLowerCase()
    );
    
    if (team) {
      popularTeams.push(transformTeam(team));
    }
  }

  // If we didn't find enough, fill with recently synced teams
  if (popularTeams.length < limit) {
    const existingIds = new Set(popularTeams.map(t => t.id));
    
    for (const team of filteredTeams) {
      if (popularTeams.length >= limit) break;
      if (!existingIds.has(String(team.id))) {
        popularTeams.push(transformTeam(team));
      }
    }
  }

  return popularTeams;
}

/**
 * Transform raw database team to TeamListItem
 * New schema: id is the API team ID (bigint), logo is the URL
 */
function transformTeam(team: {
  id: number;
  league: string;
  name: string;
  slug: string;
  logo: string | null;
  country?: string | null;
}): TeamListItem {
  return {
    id: String(team.id),
    league: team.league,
    apiTeamId: team.id,
    name: team.name,
    slug: team.slug,
    logoUrl: team.logo || "",
    primaryColor: getTeamColor(team.name, team.league),
    country: team.country || undefined,
  };
}
