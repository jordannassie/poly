/**
 * Get Popular Teams
 * 
 * Returns a curated list of popular teams for the sidebar.
 * This is a static list for now - can be made dynamic later based on activity.
 */

import { createClient } from "@supabase/supabase-js";
import { slugifyTeam } from "./slugifyTeam";
import { getTeamLogoUrl } from "./getTeamLogoUrl";
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
];

/**
 * Get popular teams for sidebar display
 * 
 * Returns a subset of teams that are popular/featured.
 * Falls back to first N teams alphabetically if no matches found.
 */
export async function getPopularTeams(limit: number = 6): Promise<TeamListItem[]> {
  const client = getClient();
  if (!client) {
    return [];
  }

  // Fetch all teams
  const { data: teams, error } = await client
    .from("sports_teams")
    .select("id, league, api_team_id, name, logo_path, logo_url_original");

  if (error || !teams || teams.length === 0) {
    return [];
  }

  // Try to find our curated popular teams
  const popularTeams: TeamListItem[] = [];
  
  for (const popularName of POPULAR_TEAM_NAMES) {
    if (popularTeams.length >= limit) break;
    
    const team = teams.find(t => 
      t.name.toLowerCase() === popularName.toLowerCase()
    );
    
    if (team) {
      popularTeams.push(transformTeam(team));
    }
  }

  // If we didn't find enough, fill with first teams alphabetically
  if (popularTeams.length < limit) {
    const existingIds = new Set(popularTeams.map(t => t.id));
    const sortedTeams = [...teams].sort((a, b) => a.name.localeCompare(b.name));
    
    for (const team of sortedTeams) {
      if (popularTeams.length >= limit) break;
      if (!existingIds.has(team.id)) {
        popularTeams.push(transformTeam(team));
      }
    }
  }

  return popularTeams;
}

/**
 * Transform raw database team to TeamListItem
 */
function transformTeam(team: {
  id: string;
  league: string;
  api_team_id: number;
  name: string;
  logo_path: string | null;
  logo_url_original: string | null;
}): TeamListItem {
  const logoUrl = getTeamLogoUrl({
    logo_path: team.logo_path,
    logo_url_original: team.logo_url_original,
  });

  return {
    id: team.id,
    league: team.league,
    apiTeamId: team.api_team_id,
    name: team.name,
    slug: slugifyTeam(team.name),
    logoUrl: logoUrl !== "/placeholder-team.png" ? logoUrl : "",
    primaryColor: getTeamColor(team.name, team.league),
  };
}
