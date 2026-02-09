/**
 * outcomeMapping.ts
 * Maps market outcomes to teams consistently across all pages
 * 
 * Convention:
 * - Team A (first team / away team) = "Yes" position
 * - Team B (second team / home team) = "No" position
 */

export interface OutcomeTeam {
  name: string;
  abbr: string;
  logoUrl: string | null;
  color: string;
}

export interface MappedOutcomes {
  teamA: OutcomeTeam;
  teamB: OutcomeTeam;
  priceA: number; // Price in cents (e.g., 58)
  priceB: number; // Price in cents (e.g., 42)
}

/**
 * Maps a market's teams and prices to the consistent outcome format
 * Team 1 (away) = Team A = Yes position
 * Team 2 (home) = Team B = No position
 */
export function mapMarketOutcomesToTeams(market: {
  team1: {
    name: string;
    abbr: string;
    logoUrl: string | null;
    color: string;
    odds: number;
  };
  team2: {
    name: string;
    abbr: string;
    logoUrl: string | null;
    color: string;
    odds: number;
  };
}): MappedOutcomes {
  return {
    teamA: {
      name: market.team1.name,
      abbr: market.team1.abbr,
      logoUrl: market.team1.logoUrl,
      color: market.team1.color,
    },
    teamB: {
      name: market.team2.name,
      abbr: market.team2.abbr,
      logoUrl: market.team2.logoUrl,
      color: market.team2.color,
    },
    priceA: market.team1.odds,
    priceB: market.team2.odds,
  };
}

/**
 * Converts the internal team selection to the display team
 */
export function getSelectedTeamData(
  outcomes: MappedOutcomes,
  selection: "teamA" | "teamB"
): OutcomeTeam & { price: number } {
  if (selection === "teamA") {
    return { ...outcomes.teamA, price: outcomes.priceA };
  }
  return { ...outcomes.teamB, price: outcomes.priceB };
}

/**
 * Maps yes/no selection to team selection
 */
export function yesNoToTeam(selection: "yes" | "no"): "teamA" | "teamB" {
  return selection === "yes" ? "teamA" : "teamB";
}

/**
 * Maps team selection to yes/no
 */
export function teamToYesNo(selection: "teamA" | "teamB"): "yes" | "no" {
  return selection === "teamA" ? "yes" : "no";
}
