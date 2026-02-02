/**
 * Team Colors Configuration
 * 
 * Primary colors for teams across all leagues.
 * Used for banners, backgrounds, and accents.
 */

// Default fallback colors by league
export const LEAGUE_FALLBACK_COLORS: Record<string, string> = {
  NFL: "#013369",
  NBA: "#C9082A", 
  SOCCER: "#37003C",
  MLB: "#002D72",
  NHL: "#000000",
};

// Default fallback color
export const DEFAULT_TEAM_COLOR = "#1a1a2e";

/**
 * Team primary colors mapped by team name (case-insensitive lookup)
 * This is a subset of major teams - will fallback to league color if not found
 */
export const TEAM_COLORS: Record<string, string> = {
  // NFL Teams
  "arizona cardinals": "#97233F",
  "atlanta falcons": "#A71930",
  "baltimore ravens": "#241773",
  "buffalo bills": "#00338D",
  "carolina panthers": "#0085CA",
  "chicago bears": "#0B162A",
  "cincinnati bengals": "#FB4F14",
  "cleveland browns": "#311D00",
  "dallas cowboys": "#003594",
  "denver broncos": "#FB4F14",
  "detroit lions": "#0076B6",
  "green bay packers": "#203731",
  "houston texans": "#03202F",
  "indianapolis colts": "#002C5F",
  "jacksonville jaguars": "#006778",
  "kansas city chiefs": "#E31837",
  "las vegas raiders": "#000000",
  "los angeles chargers": "#0080C6",
  "los angeles rams": "#003594",
  "miami dolphins": "#008E97",
  "minnesota vikings": "#4F2683",
  "new england patriots": "#002244",
  "new orleans saints": "#D3BC8D",
  "new york giants": "#0B2265",
  "new york jets": "#125740",
  "philadelphia eagles": "#004C54",
  "pittsburgh steelers": "#FFB612",
  "san francisco 49ers": "#AA0000",
  "seattle seahawks": "#002244",
  "tampa bay buccaneers": "#D50A0A",
  "tennessee titans": "#0C2340",
  "washington commanders": "#5A1414",

  // NBA Teams
  "atlanta hawks": "#E03A3E",
  "boston celtics": "#007A33",
  "brooklyn nets": "#000000",
  "charlotte hornets": "#1D1160",
  "chicago bulls": "#CE1141",
  "cleveland cavaliers": "#860038",
  "dallas mavericks": "#00538C",
  "denver nuggets": "#0E2240",
  "detroit pistons": "#C8102E",
  "golden state warriors": "#1D428A",
  "houston rockets": "#CE1141",
  "indiana pacers": "#002D62",
  "los angeles clippers": "#C8102E",
  "los angeles lakers": "#552583",
  "memphis grizzlies": "#5D76A9",
  "miami heat": "#98002E",
  "milwaukee bucks": "#00471B",
  "minnesota timberwolves": "#0C2340",
  "new orleans pelicans": "#0C2340",
  "new york knicks": "#006BB6",
  "oklahoma city thunder": "#007AC1",
  "orlando magic": "#0077C0",
  "philadelphia 76ers": "#006BB6",
  "phoenix suns": "#1D1160",
  "portland trail blazers": "#E03A3E",
  "sacramento kings": "#5A2D81",
  "san antonio spurs": "#C4CED4",
  "toronto raptors": "#CE1141",
  "utah jazz": "#002B5C",
  "washington wizards": "#002B5C",

  // Soccer - Premier League
  "arsenal": "#EF0107",
  "aston villa": "#95BFE5",
  "bournemouth": "#DA291C",
  "brentford": "#E30613",
  "brighton": "#0057B8",
  "brighton & hove albion": "#0057B8",
  "burnley": "#6C1D45",
  "chelsea": "#034694",
  "crystal palace": "#1B458F",
  "everton": "#003399",
  "fulham": "#000000",
  "liverpool": "#C8102E",
  "luton town": "#F78F1E",
  "manchester city": "#6CABDD",
  "manchester united": "#DA291C",
  "newcastle": "#241F20",
  "newcastle united": "#241F20",
  "nottingham forest": "#DD0000",
  "sheffield united": "#EE2737",
  "tottenham": "#132257",
  "tottenham hotspur": "#132257",
  "west ham": "#7A263A",
  "west ham united": "#7A263A",
  "wolverhampton": "#FDB913",
  "wolverhampton wanderers": "#FDB913",
  "wolves": "#FDB913",
  "ipswich": "#0044AA",
  "ipswich town": "#0044AA",
  "leicester": "#003090",
  "leicester city": "#003090",
  "southampton": "#D71920",

  // Soccer - Other Major Teams
  "real madrid": "#FEBE10",
  "barcelona": "#A50044",
  "bayern munich": "#DC052D",
  "bayern munchen": "#DC052D",
  "borussia dortmund": "#FDE100",
  "juventus": "#000000",
  "ac milan": "#FB090B",
  "inter milan": "#0068A8",
  "paris saint-germain": "#004170",
  "psg": "#004170",
};

/**
 * Get the primary color for a team
 * 
 * @param teamName - Team name (case-insensitive)
 * @param league - Optional league for fallback color
 * @returns Hex color code
 */
export function getTeamColor(teamName: string, league?: string): string {
  const nameLower = teamName.toLowerCase().trim();
  
  // Check exact match
  if (TEAM_COLORS[nameLower]) {
    return TEAM_COLORS[nameLower];
  }
  
  // Check partial match (e.g., "Lakers" should match "Los Angeles Lakers")
  for (const [key, color] of Object.entries(TEAM_COLORS)) {
    if (key.includes(nameLower) || nameLower.includes(key)) {
      return color;
    }
  }
  
  // Fallback to league color
  if (league && LEAGUE_FALLBACK_COLORS[league.toUpperCase()]) {
    return LEAGUE_FALLBACK_COLORS[league.toUpperCase()];
  }
  
  return DEFAULT_TEAM_COLOR;
}

/**
 * Get a lighter/darker shade of a color for gradients
 * 
 * @param hexColor - Base hex color
 * @param percent - Negative for darker, positive for lighter
 * @returns Adjusted hex color
 */
export function adjustColor(hexColor: string, percent: number): string {
  const hex = hexColor.replace("#", "");
  const num = parseInt(hex, 16);
  
  const r = Math.min(255, Math.max(0, (num >> 16) + percent));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + percent));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + percent));
  
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
