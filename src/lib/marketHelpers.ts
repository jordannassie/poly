// Helper functions for market data - no external libraries

export type HotMarket = {
  id: string;
  title: string;
  league: string;
  team1: { abbr: string; name: string; odds: number; color: string };
  team2: { abbr: string; name: string; odds: number; color: string };
  startTime: Date;
  volumeToday: number;
  volume10m: number;
  percentMove: number;
  activeBettors: number;
  isLive: boolean;
};

// Calculate "locks in" label from start time
export function locksInLabel(startTime: Date): string {
  const now = new Date();
  const diff = startTime.getTime() - now.getTime();

  if (diff <= 0) return "Live now";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

// Calculate hot score for ranking markets
export function hotScore(market: HotMarket): number {
  const now = new Date();
  const timeToStart = (market.startTime.getTime() - now.getTime()) / (1000 * 60 * 60); // hours

  // Base score from volume
  const volumeScore = market.volumeToday / 100000; // normalize to 100k
  const recentVolumeScore = market.volume10m * 10; // weight recent activity heavily
  const movementScore = Math.abs(market.percentMove) * 5; // price movement matters

  // Time urgency - closer games score higher
  let urgencyScore = 0;
  if (market.isLive) {
    urgencyScore = 100; // Live games are hottest
  } else if (timeToStart < 1) {
    urgencyScore = 80; // Starting within an hour
  } else if (timeToStart < 6) {
    urgencyScore = 50; // Starting within 6 hours
  } else if (timeToStart < 24) {
    urgencyScore = 20; // Starting within 24 hours
  }

  // Bettor activity
  const bettorScore = market.activeBettors / 10;

  return volumeScore + recentVolumeScore + movementScore + urgencyScore + bettorScore;
}

// Format volume for display
export function formatVolume(volume: number): string {
  if (volume >= 1000000) {
    return `$${(volume / 1000000).toFixed(1)}m`;
  }
  if (volume >= 1000) {
    return `$${(volume / 1000).toFixed(0)}k`;
  }
  return `$${volume}`;
}

// Get badge type based on market activity
export function getMarketBadge(market: HotMarket): "HOT" | "MOVING" | "LIVE" | null {
  if (market.isLive) return "LIVE";
  if (market.volume10m > 5000) return "HOT";
  if (Math.abs(market.percentMove) > 3) return "MOVING";
  return null;
}

// Generate mock hot markets data
export function generateHotMarkets(): HotMarket[] {
  const now = new Date();

  return [
    {
      id: "seahawks-patriots",
      title: "Seahawks vs Patriots",
      league: "NFL",
      team1: { abbr: "SEA", name: "Seahawks", odds: 69, color: "#002244" },
      team2: { abbr: "NE", name: "Patriots", odds: 31, color: "#002244" },
      startTime: new Date(now.getTime() + 2 * 60 * 60 * 1000), // 2 hours
      volumeToday: 4020000,
      volume10m: 45000,
      percentMove: 5.2,
      activeBettors: 342,
      isLive: false,
    },
    {
      id: "chiefs-eagles",
      title: "Chiefs vs Eagles",
      league: "NFL",
      team1: { abbr: "KC", name: "Chiefs", odds: 58, color: "#E31837" },
      team2: { abbr: "PHI", name: "Eagles", odds: 42, color: "#004C54" },
      startTime: new Date(now.getTime() + 4 * 60 * 60 * 1000), // 4 hours
      volumeToday: 8500000,
      volume10m: 82000,
      percentMove: -3.1,
      activeBettors: 589,
      isLive: false,
    },
    {
      id: "lakers-celtics",
      title: "Lakers vs Celtics",
      league: "NBA",
      team1: { abbr: "LAL", name: "Lakers", odds: 45, color: "#552583" },
      team2: { abbr: "BOS", name: "Celtics", odds: 55, color: "#007A33" },
      startTime: new Date(now.getTime() + 30 * 60 * 1000), // 30 minutes
      volumeToday: 2100000,
      volume10m: 38000,
      percentMove: 2.8,
      activeBettors: 215,
      isLive: false,
    },
    {
      id: "warriors-nuggets-live",
      title: "Warriors vs Nuggets",
      league: "NBA",
      team1: { abbr: "GSW", name: "Warriors", odds: 42, color: "#1D428A" },
      team2: { abbr: "DEN", name: "Nuggets", odds: 58, color: "#0E2240" },
      startTime: new Date(now.getTime() - 60 * 60 * 1000), // Started 1 hour ago
      volumeToday: 1800000,
      volume10m: 62000,
      percentMove: -4.5,
      activeBettors: 428,
      isLive: true,
    },
    {
      id: "bruins-rangers",
      title: "Bruins vs Rangers",
      league: "NHL",
      team1: { abbr: "BOS", name: "Bruins", odds: 62, color: "#FFB81C" },
      team2: { abbr: "NYR", name: "Rangers", odds: 38, color: "#0038A8" },
      startTime: new Date(now.getTime() + 18 * 60 * 60 * 1000), // 18 hours
      volumeToday: 890000,
      volume10m: 12000,
      percentMove: 1.2,
      activeBettors: 98,
      isLive: false,
    },
    {
      id: "ufc-main-event",
      title: "Jones vs Miocic",
      league: "UFC",
      team1: { abbr: "JON", name: "Jones", odds: 72, color: "#D20A0A" },
      team2: { abbr: "MIO", name: "Miocic", odds: 28, color: "#1A1A1A" },
      startTime: new Date(now.getTime() + 48 * 60 * 60 * 1000), // 48 hours
      volumeToday: 3200000,
      volume10m: 28000,
      percentMove: 0.8,
      activeBettors: 445,
      isLive: false,
    },
    {
      id: "real-barca",
      title: "Real Madrid vs Barcelona",
      league: "Soccer",
      team1: { abbr: "RMA", name: "Real Madrid", odds: 48, color: "#FEBE10" },
      team2: { abbr: "BAR", name: "Barcelona", odds: 52, color: "#A50044" },
      startTime: new Date(now.getTime() + 6 * 60 * 60 * 1000), // 6 hours
      volumeToday: 5600000,
      volume10m: 55000,
      percentMove: 2.1,
      activeBettors: 678,
      isLive: false,
    },
    {
      id: "djokovic-alcaraz",
      title: "Djokovic vs Alcaraz",
      league: "Tennis",
      team1: { abbr: "DJO", name: "Djokovic", odds: 44, color: "#1E3A8A" },
      team2: { abbr: "ALC", name: "Alcaraz", odds: 56, color: "#DC2626" },
      startTime: new Date(now.getTime() + 12 * 60 * 60 * 1000), // 12 hours
      volumeToday: 1500000,
      volume10m: 18000,
      percentMove: -1.5,
      activeBettors: 189,
      isLive: false,
    },
  ];
}

// Get markets sorted by hot score
export function getHotMarkets(): HotMarket[] {
  return generateHotMarkets().sort((a, b) => hotScore(b) - hotScore(a));
}

// Get live markets
export function getLiveMarkets(): HotMarket[] {
  return generateHotMarkets().filter((m) => m.isLive);
}

// Get markets starting within 24 hours, sorted by soonest
export function getStartingSoonMarkets(): HotMarket[] {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  return generateHotMarkets()
    .filter((m) => !m.isLive && m.startTime > now && m.startTime < in24h)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
}

// Get markets sorted by volume
export function getBigVolumeMarkets(): HotMarket[] {
  return generateHotMarkets().sort((a, b) => b.volumeToday - a.volumeToday);
}

// Mock "Why this market is moving" reasons
export function getWhyMovingReasons(marketId: string): string[] {
  const reasons: Record<string, string[]> = {
    "seahawks-patriots": [
      "Heavy betting on Seahawks after injury report shows Patriots QB questionable",
      "Line moved 3 points in last hour as sharp money comes in",
      "Social sentiment shifted 12% toward Seahawks in past 24h",
    ],
    "chiefs-eagles": [
      "Eagles key defensive player ruled out, odds shifting to Chiefs",
      "Record betting volume for this matchup - 2x normal levels",
      "Weather forecast changed - now expecting clear skies favoring passing game",
    ],
    "lakers-celtics": [
      "LeBron listed as probable after rest day, driving Lakers odds up",
      "Celtics coming off back-to-back losses, bettors fading them",
      "Home court advantage data showing strong Lakers performance at Staples",
    ],
    default: [
      "Sharp money detected on the favorite in last 30 minutes",
      "Volume spike of 340% compared to similar matchups",
      "Line movement triggered by injury news from team sources",
    ],
  };

  return reasons[marketId] || reasons.default;
}
