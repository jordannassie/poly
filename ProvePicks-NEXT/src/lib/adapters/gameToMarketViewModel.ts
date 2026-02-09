/**
 * Adapter to convert SportsDataIO game data to MarketViewModel
 */

import { MarketViewModel, DEFAULT_STATS, DEFAULT_LINES } from "./marketViewModel";
import { locksInLabel, formatVolume } from "@/lib/marketHelpers";
import { resolveTeamBrand } from "../teams/teamBrandRegistry";

interface TeamInput {
  teamId?: number;
  name: string;
  city?: string;
  abbreviation: string;
  fullName?: string;
  logoUrl: string | null;
  primaryColor: string | null;
}

interface GameInput {
  gameId: string;
  name?: string;
  startTime: string;
  status: "scheduled" | "in_progress" | "final" | "postponed" | "canceled";
  homeTeam: TeamInput;
  awayTeam: TeamInput;
  homeScore: number | null;
  awayScore: number | null;
  venue?: string | null;
  week?: number;
  channel?: string | null;
  quarter?: string | null;
  timeRemaining?: string | null;
  possession?: string | null;
  isPlayoffs?: boolean;
  // Market lock status from database
  isLocked?: boolean;
  lockReason?: string;
}

interface ConversionInput {
  league: "nfl" | "nba" | "mlb" | "nhl" | "soccer";
  game: GameInput;
}

/**
 * Convert SportsDataIO game data to MarketViewModel
 */
export function gameToMarketViewModel(input: ConversionInput): MarketViewModel {
  const { league, game } = input;
  
  const startTime = new Date(game.startTime);
  
  // Generate demo odds based on team matchup (deterministic but varied)
  const generateOdds = (team1: string, team2: string): number => {
    const combined = (team1 + team2).split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return 45 + (combined % 20); // 45-64 range
  };
  
  const team1Odds = generateOdds(game.awayTeam.abbreviation, game.homeTeam.abbreviation);
  const team2Odds = 100 - team1Odds;
  
  // Default color if not provided
  const getColor = (color: string | null, fallback: string): string => {
    if (color && color.trim()) {
      return color.startsWith("#") ? color : `#${color}`;
    }
    return fallback;
  };
  
  // Format locks in label
  const locks = locksInLabel(startTime);
  
  // Derive isLocked from game data or status
  const isLocked = game.isLocked ?? 
    (game.status === 'final' || game.status === 'canceled' || game.status === 'postponed' || game.status === 'in_progress');
  const lockReason = game.lockReason ?? 
    (game.status === 'in_progress' ? 'GAME_LIVE' : 
     (game.status === 'final' || game.status === 'canceled' || game.status === 'postponed') ? 'GAME_FINAL' : 
     undefined);
  
  const team1Brand = resolveTeamBrand({
    league,
    name: game.awayTeam.name,
    fallbackAbbr: game.awayTeam.abbreviation,
    fallbackColor: game.awayTeam.primaryColor,
  });

  const team2Brand = resolveTeamBrand({
    league,
    name: game.homeTeam.name,
    fallbackAbbr: game.homeTeam.abbreviation,
    fallbackColor: game.homeTeam.primaryColor,
  });

  if (process.env.NODE_ENV !== "production") {
    if (!team1Brand.abbr || !team1Brand.color) {
      console.warn("[TEAM_BRAND_MISSING]", league, game.awayTeam.name);
    }
    if (!team2Brand.abbr || !team2Brand.color) {
      console.warn("[TEAM_BRAND_MISSING]", league, game.homeTeam.name);
    }
  }

  return {
    league,
    slug: game.gameId,
    title: `${game.awayTeam.name} vs ${game.homeTeam.name}`,
    
    team1: {
      name: game.awayTeam.name,
      abbr: team1Brand.abbr || game.awayTeam.abbreviation,
      city: game.awayTeam.city,
      fullName: game.awayTeam.fullName,
      logoUrl: game.awayTeam.logoUrl,
      color: getColor(team1Brand.color || game.awayTeam.primaryColor, "#1e40af"),
      odds: team1Odds,
      record: "",
    },
    
    team2: {
      name: game.homeTeam.name,
      abbr: team2Brand.abbr || game.homeTeam.abbreviation,
      city: game.homeTeam.city,
      fullName: game.homeTeam.fullName,
      logoUrl: game.homeTeam.logoUrl,
      color: getColor(team2Brand.color || game.homeTeam.primaryColor, "#b91c1c"),
      odds: team2Odds,
      record: "",
    },
    
    startTime,
    status: game.status,
    locksInLabel: locks,
    
    // Market lock status (authoritative from database)
    isLocked,
    lockReason,
    
    // Use demo stats for now (can be replaced with real data later)
    stats: { ...DEFAULT_STATS },
    
    prices: {
      yes: team1Odds,
      no: team2Odds,
    },
    
    volume: "—", // Real volume not yet tracked
    
    lines: { ...DEFAULT_LINES },
    
    gameDetails: {
      gameId: game.gameId,
      week: game.week,
      venue: game.venue || undefined,
      channel: game.channel || undefined,
      quarter: game.quarter || undefined,
      timeRemaining: game.timeRemaining || undefined,
      possession: game.possession || undefined,
      homeScore: game.homeScore ?? undefined,
      awayScore: game.awayScore ?? undefined,
      isPlayoffs: game.isPlayoffs,
    },
  };
}

// Input type for mock game data (SportsGame from mockData)
interface SportsGameInput {
  id: string;
  league: string;
  team1: { name: string; abbr: string; odds: number; color: string; record?: string };
  team2: { name: string; abbr: string; odds: number; color: string; record?: string };
  date?: string;
  gameTime?: string;
  volume?: string;
}

// Input type for HotMarket from marketHelpers
interface HotMarketInput {
  id: string;
  title?: string;
  league: string;
  team1: { abbr: string; name: string; odds: number; color: string };
  team2: { abbr: string; name: string; odds: number; color: string };
  volumeToday?: number;
  activeBettors?: number;
  startTime?: Date;
  volume10m?: number;
  percentMove?: number;
  isLive?: boolean;
}

/**
 * Convert mock sports game or hot market data to MarketViewModel
 * (for backward compatibility with existing mock data)
 */
export function mockGameToMarketViewModel(
  gameData: SportsGameInput | HotMarketInput,
  teamLogos: Map<string, { logoUrl: string | null }>,
  hotMarketOverrides?: {
    volumeToday?: number;
    activeBettors?: number;
    startTime?: Date;
    volume10m?: number;
  }
): MarketViewModel {
  // Determine if this is a HotMarket (has volumeToday) or SportsGame
  const isHotMarket = "volumeToday" in gameData;
  
  const startTime = hotMarketOverrides?.startTime 
    || (isHotMarket ? (gameData as HotMarketInput).startTime : undefined)
    || new Date(Date.now() + 2 * 60 * 60 * 1000);
    
  const volumeToday = hotMarketOverrides?.volumeToday 
    || (isHotMarket ? (gameData as HotMarketInput).volumeToday : undefined)
    || 4020000;
    
  const activeBettors = hotMarketOverrides?.activeBettors 
    || (isHotMarket ? (gameData as HotMarketInput).activeBettors : undefined)
    || 342;
    
  const volume10m = hotMarketOverrides?.volume10m 
    || (isHotMarket ? (gameData as HotMarketInput).volume10m : undefined)
    || 45000;
  
  return {
    league: gameData.league.toLowerCase() as "nfl" | "nba" | "mlb" | "nhl" | "soccer",
    slug: gameData.id,
    title: `${gameData.team1.name} vs ${gameData.team2.name}`,
    
    team1: {
      name: gameData.team1.name,
      abbr: gameData.team1.abbr,
      logoUrl: teamLogos.get(gameData.team1.abbr)?.logoUrl || null,
      color: gameData.team1.color,
      odds: gameData.team1.odds,
      record: "record" in gameData.team1 ? (gameData.team1 as SportsGameInput["team1"]).record || "" : "",
    },
    
    team2: {
      name: gameData.team2.name,
      abbr: gameData.team2.abbr,
      logoUrl: teamLogos.get(gameData.team2.abbr)?.logoUrl || null,
      color: gameData.team2.color,
      odds: gameData.team2.odds,
      record: "record" in gameData.team2 ? (gameData.team2 as SportsGameInput["team2"]).record || "" : "",
    },
    
    startTime,
    status: (isHotMarket && (gameData as HotMarketInput).isLive) ? "in_progress" : "scheduled",
    locksInLabel: locksInLabel(startTime),
    
    stats: {
      tradedToday: formatVolume(volumeToday),
      activeBettors,
      last10Min: formatVolume(volume10m),
    },
    
    prices: {
      yes: gameData.team1.odds,
      no: gameData.team2.odds,
    },
    
    volume: formatVolume(volumeToday),
    
    lines: { ...DEFAULT_LINES },
  };
}
