/**
 * MarketViewModel - Shared data structure for market/game pages
 */

export interface TeamViewModel {
  name: string;
  abbr: string;
  city?: string;
  fullName?: string;
  logoUrl: string | null;
  color: string;
  odds: number;
  record?: string;
}

export interface MarketViewModel {
  // Core identifiers
  league: "nfl" | "nba" | "mlb" | "nhl" | "soccer";
  slug: string;
  
  // Display
  title: string;
  
  // Teams
  team1: TeamViewModel; // Away team
  team2: TeamViewModel; // Home team
  
  // Timing
  startTime?: Date;
  status?: "scheduled" | "in_progress" | "final" | "postponed" | "canceled";
  locksInLabel?: string;
  
  // Market locking (authoritative source from database)
  isLocked?: boolean;
  lockReason?: string;
  
  // Stats for right rail
  stats: {
    tradedToday: string;
    activeBettors: number;
    last10Min: string;
  };
  
  // Prices/probabilities
  prices: {
    yes: number;
    no: number;
  };
  
  // Volume
  volume: string;
  
  // Betting lines (placeholder values for now)
  lines: {
    spread?: { team1Line: string; team2Line: string; team1Odds: number; team2Odds: number };
    total?: { over: number; under: number; overOdds: number; underOdds: number };
  };
  
  // Game details (from SportsDataIO)
  gameDetails?: {
    gameId: string;
    week?: number;
    venue?: string;
    channel?: string;
    quarter?: string;
    timeRemaining?: string;
    possession?: string;
    homeScore?: number;
    awayScore?: number;
    isPlayoffs?: boolean;
  };
}

// Default placeholder stats (not backed by real data yet)
export const DEFAULT_STATS = {
  tradedToday: "—",
  activeBettors: 0,
  last10Min: "—",
};

// Default demo lines
export const DEFAULT_LINES = {
  spread: { team1Line: "-4.5", team2Line: "+4.5", team1Odds: 51, team2Odds: 50 },
  total: { over: 46.5, under: 46.5, overOdds: 47, underOdds: 54 },
};
