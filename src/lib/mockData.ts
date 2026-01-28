export type MarketOutcome = {
  id: string;
  name: string;
  avatarUrl?: string;
  prob: number;
  yesPrice: number;
  noPrice: number;
  volume: string;
};

export type Market = {
  slug: string;
  title: string;
  category: string;
  volume: string;
  endDate: string;
  outcomes: MarketOutcome[];
  sparkline?: number[];
};

export type Category = {
  label: string;
  href: string;
};

export const categories: Category[] = [
  { label: "Trending", href: "/" },
  { label: "Live", href: "/sports/live" },
  { label: "NFL", href: "/sports/nfl" },
  { label: "NBA", href: "/sports/nba" },
  { label: "NCAA", href: "/sports/ncaa" },
  { label: "NHL", href: "/sports/nhl" },
  { label: "UFC", href: "/sports/ufc" },
  { label: "Soccer", href: "/sports/soccer" },
  { label: "Tennis", href: "/sports/tennis" },
  { label: "Golf", href: "/sports/golf" },
  { label: "Baseball", href: "/sports/baseball" },
  { label: "F1", href: "/sports/f1" },
  { label: "Esports", href: "/sports/esports" },
  { label: "Boxing", href: "/sports/boxing" },
  { label: "Futures", href: "/sports/futures" },
];

// Sports-specific data
export type SportsGame = {
  id: string;
  sport: string;
  league: string;
  team1: {
    abbr: string;
    name: string;
    record: string;
    odds: number;
    color: string;
  };
  team2: {
    abbr: string;
    name: string;
    record: string;
    odds: number;
    color: string;
  };
  gameTime: string;
  date: string;
  volume: string;
  spread?: { team1: string; team2: string; odds1: number; odds2: number };
  total?: { over: number; under: number; odds1: number; odds2: number };
};

export const sportsGames: SportsGame[] = [
  {
    id: "seahawks-patriots",
    sport: "football",
    league: "NFL",
    team1: {
      abbr: "SEA",
      name: "Seahawks",
      record: "14-3",
      odds: 69,
      color: "#002244",
    },
    team2: {
      abbr: "NE",
      name: "Patriots",
      record: "14-3",
      odds: 32,
      color: "#002244",
    },
    gameTime: "3:30 PM",
    date: "Feb 8",
    volume: "$4.02m Vol.",
    spread: { team1: "-4.5", team2: "+4.5", odds1: 51, odds2: 50 },
    total: { over: 46.5, under: 46.5, odds1: 47, odds2: 54 },
  },
  {
    id: "chiefs-eagles",
    sport: "football",
    league: "NFL",
    team1: {
      abbr: "KC",
      name: "Chiefs",
      record: "15-2",
      odds: 58,
      color: "#E31837",
    },
    team2: {
      abbr: "PHI",
      name: "Eagles",
      record: "14-3",
      odds: 42,
      color: "#004C54",
    },
    gameTime: "6:30 PM",
    date: "Feb 9",
    volume: "$8.5m Vol.",
    spread: { team1: "-2.5", team2: "+2.5", odds1: 52, odds2: 48 },
    total: { over: 51.5, under: 51.5, odds1: 50, odds2: 50 },
  },
  {
    id: "lakers-celtics",
    sport: "basketball",
    league: "NBA",
    team1: {
      abbr: "LAL",
      name: "Lakers",
      record: "32-18",
      odds: 45,
      color: "#552583",
    },
    team2: {
      abbr: "BOS",
      name: "Celtics",
      record: "38-12",
      odds: 55,
      color: "#007A33",
    },
    gameTime: "8:00 PM",
    date: "Feb 10",
    volume: "$2.1m Vol.",
    spread: { team1: "+5.5", team2: "-5.5", odds1: 48, odds2: 52 },
    total: { over: 228.5, under: 228.5, odds1: 51, odds2: 49 },
  },
  {
    id: "warriors-nuggets",
    sport: "basketball",
    league: "NBA",
    team1: {
      abbr: "GSW",
      name: "Warriors",
      record: "28-22",
      odds: 42,
      color: "#1D428A",
    },
    team2: {
      abbr: "DEN",
      name: "Nuggets",
      record: "35-15",
      odds: 58,
      color: "#0E2240",
    },
    gameTime: "9:30 PM",
    date: "Feb 10",
    volume: "$1.8m Vol.",
    spread: { team1: "+6.5", team2: "-6.5", odds1: 47, odds2: 53 },
    total: { over: 232.5, under: 232.5, odds1: 52, odds2: 48 },
  },
  {
    id: "bruins-rangers",
    sport: "hockey",
    league: "NHL",
    team1: {
      abbr: "BOS",
      name: "Bruins",
      record: "35-10-5",
      odds: 62,
      color: "#FFB81C",
    },
    team2: {
      abbr: "NYR",
      name: "Rangers",
      record: "30-15-5",
      odds: 38,
      color: "#0038A8",
    },
    gameTime: "7:00 PM",
    date: "Feb 11",
    volume: "$890k Vol.",
    spread: { team1: "-1.5", team2: "+1.5", odds1: 45, odds2: 55 },
    total: { over: 5.5, under: 5.5, odds1: 48, odds2: 52 },
  },
];

export const markets: Market[] = [
  {
    slug: "trump-talk-merz-january",
    title: "Will Trump talk to Friedrich Merz in January?",
    category: "Politics",
    volume: "$878k Vol.",
    endDate: "Jan 31",
    sparkline: [18, 24, 28, 22, 35, 41, 46, 52],
    outcomes: [
      {
        id: "merz",
        name: "Friedrich Merz",
        prob: 94,
        yesPrice: 95,
        noPrice: 8,
        volume: "$203,482 Vol.",
      },
      {
        id: "macron",
        name: "Emmanuel Macron",
        prob: 79,
        yesPrice: 80,
        noPrice: 23,
        volume: "$187,710 Vol.",
      },
      {
        id: "vonderleyen",
        name: "Ursula von der Leyen",
        prob: 9,
        yesPrice: 12.9,
        noPrice: 94.9,
        volume: "$44,306 Vol.",
      },
    ],
  },
  {
    slug: "seahawks-vs-patriots",
    title: "Seahawks vs Patriots",
    category: "Sports",
    volume: "$2.8m Vol.",
    endDate: "Feb 8, 3:30 PM",
    sparkline: [35, 38, 41, 44, 49, 58, 62, 69],
    outcomes: [
      {
        id: "sea",
        name: "Seahawks",
        prob: 69,
        yesPrice: 69,
        noPrice: 32,
        volume: "$1.4m Vol.",
      },
      {
        id: "ne",
        name: "Patriots",
        prob: 31,
        yesPrice: 32,
        noPrice: 69,
        volume: "$1.1m Vol.",
      },
    ],
  },
  {
    slug: "fed-decision-january",
    title: "Fed decision in January?",
    category: "Finance",
    volume: "$638m Vol.",
    endDate: "Jan 28",
    sparkline: [12, 11, 10, 9, 8, 7, 6, 5],
    outcomes: [
      {
        id: "bps50",
        name: "50+ bps decrease",
        prob: 1,
        yesPrice: 1,
        noPrice: 99,
        volume: "$122m Vol.",
      },
      {
        id: "bps25",
        name: "25 bps decrease",
        prob: 1,
        yesPrice: 1,
        noPrice: 99,
        volume: "$96m Vol.",
      },
    ],
  },
  {
    slug: "us-government-shutdown",
    title: "US government shutdown Saturday?",
    category: "Politics",
    volume: "$14m Vol.",
    endDate: "Jan 29",
    sparkline: [52, 55, 57, 61, 63, 66, 71, 76],
    outcomes: [
      {
        id: "yes",
        name: "Yes",
        prob: 76,
        yesPrice: 76,
        noPrice: 28,
        volume: "$8.2m Vol.",
      },
      {
        id: "no",
        name: "No",
        prob: 24,
        yesPrice: 28,
        noPrice: 76,
        volume: "$5.8m Vol.",
      },
    ],
  },
  {
    slug: "team-ai-vs-human",
    title: "Will Team Human or Team AI win the Aster trading competition?",
    category: "Tech",
    volume: "$44k Vol.",
    endDate: "Feb 20",
    sparkline: [30, 32, 28, 26, 22, 19, 18, 20],
    outcomes: [
      {
        id: "human",
        name: "Team Human",
        prob: 2,
        yesPrice: 2,
        noPrice: 99,
        volume: "$24k Vol.",
      },
      {
        id: "ai",
        name: "Team AI",
        prob: 98,
        yesPrice: 99,
        noPrice: 2,
        volume: "$20k Vol.",
      },
    ],
  },
  {
    slug: "moonbirds-fdv",
    title: "Moonbirds FDV above $200M one day after launch?",
    category: "Crypto",
    volume: "$120k Vol.",
    endDate: "Feb 3",
    sparkline: [22, 28, 33, 40, 52, 61, 68, 79],
    outcomes: [
      {
        id: "yes",
        name: "Yes",
        prob: 79,
        yesPrice: 79,
        noPrice: 23,
        volume: "$71k Vol.",
      },
      {
        id: "no",
        name: "No",
        prob: 21,
        yesPrice: 23,
        noPrice: 79,
        volume: "$49k Vol.",
      },
    ],
  },
  {
    slug: "super-bowl-winner",
    title: "Super Bowl 2026 Winner",
    category: "Sports",
    volume: "$15.2m Vol.",
    endDate: "Feb 9",
    sparkline: [42, 45, 48, 51, 55, 58, 62, 65],
    outcomes: [
      {
        id: "chiefs",
        name: "Kansas City Chiefs",
        prob: 65,
        yesPrice: 65,
        noPrice: 38,
        volume: "$8.1m Vol.",
      },
      {
        id: "eagles",
        name: "Philadelphia Eagles",
        prob: 35,
        yesPrice: 38,
        noPrice: 65,
        volume: "$7.1m Vol.",
      },
    ],
  },
  {
    slug: "bitcoin-100k-february",
    title: "Bitcoin above $100K by end of February?",
    category: "Crypto",
    volume: "$5.8m Vol.",
    endDate: "Feb 28",
    sparkline: [55, 52, 58, 61, 65, 68, 72, 78],
    outcomes: [
      {
        id: "yes",
        name: "Yes",
        prob: 78,
        yesPrice: 78,
        noPrice: 24,
        volume: "$3.2m Vol.",
      },
      {
        id: "no",
        name: "No",
        prob: 22,
        yesPrice: 24,
        noPrice: 78,
        volume: "$2.6m Vol.",
      },
    ],
  },
  {
    slug: "oscar-best-picture",
    title: "Oscar Best Picture 2026",
    category: "Culture",
    volume: "$890k Vol.",
    endDate: "Mar 2",
    sparkline: [25, 28, 32, 38, 42, 45, 48, 52],
    outcomes: [
      {
        id: "oppenheimer2",
        name: "The Brutalist",
        prob: 52,
        yesPrice: 52,
        noPrice: 50,
        volume: "$320k Vol.",
      },
      {
        id: "anora",
        name: "Anora",
        prob: 28,
        yesPrice: 28,
        noPrice: 74,
        volume: "$280k Vol.",
      },
      {
        id: "conclave",
        name: "Conclave",
        prob: 20,
        yesPrice: 20,
        noPrice: 82,
        volume: "$290k Vol.",
      },
    ],
  },
  {
    slug: "tesla-earnings-beat",
    title: "Tesla Q1 earnings beat expectations?",
    category: "Earnings",
    volume: "$2.1m Vol.",
    endDate: "Apr 15",
    sparkline: [60, 58, 55, 52, 48, 45, 42, 38],
    outcomes: [
      {
        id: "beat",
        name: "Beat",
        prob: 38,
        yesPrice: 38,
        noPrice: 64,
        volume: "$1.1m Vol.",
      },
      {
        id: "miss",
        name: "Miss",
        prob: 62,
        yesPrice: 64,
        noPrice: 38,
        volume: "$1.0m Vol.",
      },
    ],
  },
  {
    slug: "next-fed-chair",
    title: "Who will be the next Fed Chair?",
    category: "Politics",
    volume: "$3.4m Vol.",
    endDate: "May 15",
    sparkline: [45, 48, 52, 55, 58, 62, 65, 68],
    outcomes: [
      {
        id: "powell",
        name: "Jerome Powell",
        prob: 68,
        yesPrice: 68,
        noPrice: 34,
        volume: "$1.8m Vol.",
      },
      {
        id: "yellen",
        name: "Janet Yellen",
        prob: 18,
        yesPrice: 18,
        noPrice: 84,
        volume: "$0.9m Vol.",
      },
      {
        id: "other",
        name: "Other",
        prob: 14,
        yesPrice: 14,
        noPrice: 88,
        volume: "$0.7m Vol.",
      },
    ],
  },
];

export const sportsSidebarItems = [
  { id: "nfl", label: "NFL", count: 1 },
  { id: "nba", label: "NBA", count: 65 },
  { id: "ncaabb", label: "NCAA CBB", count: 464 },
  { id: "nhl", label: "NHL", count: 71 },
  { id: "ufc", label: "UFC", count: 7 },
  { id: "soccer", label: "Soccer", count: 312 },
  { id: "tennis", label: "Tennis", count: 28 },
  { id: "esports", label: "Esports", count: 42 },
];

export const statsOverview = [
  { label: "Total volume", value: "$3.2m" },
  { label: "Traders", value: "18,492" },
  { label: "Open interest", value: "$512k" },
  { label: "Markets live", value: "214" },
];

export const leaderboard = [
  { rank: 1, name: "bossoskil1", profit: "+$447,892", volume: "$932,300", avatar: "🟡" },
  { rank: 2, name: "kch123", profit: "+$334,170", volume: "$1,605,374", avatar: "🟢" },
  { rank: 3, name: "gopatriots", profit: "+$324,668", volume: "$571,846", avatar: "🔴" },
  { rank: 4, name: "DrPufferfish", profit: "+$272,769", volume: "$49,179", avatar: "🟠" },
  { rank: 5, name: "yAmutHAa", profit: "+$195,377", volume: "$193,354", avatar: "🟣" },
  { rank: 6, name: "TradeWizard", profit: "+$182,445", volume: "$412,890", avatar: "🔵" },
  { rank: 7, name: "PredictKing", profit: "+$156,230", volume: "$298,100", avatar: "🟤" },
  { rank: 8, name: "OddsHunter", profit: "+$143,892", volume: "$245,670", avatar: "⚪" },
  { rank: 9, name: "MarketGuru", profit: "+$128,445", volume: "$189,340", avatar: "🟡" },
  { rank: 10, name: "BetMaster99", profit: "+$115,670", volume: "$156,780", avatar: "🟢" },
];

export const biggestWins = [
  { rank: 1, name: "DrPufferfish", market: "Trail Blazers vs. Wizards", from: "$149,547", to: "$437,552" },
  { rank: 2, name: "kch123", market: "Utah vs. Panthers", from: "$215,434", to: "$468,002" },
  { rank: 3, name: "yAmutHAa", market: "Trail Blazers vs. Wizards", from: "$86,948", to: "$279,727" },
  { rank: 4, name: "bossoskil1", market: "Utah vs. Panthers", from: "$131,461", to: "$305,564" },
  { rank: 5, name: "gopatriots", market: "Pelicans vs. Thunder", from: "$180,157", to: "$350,000" },
  { rank: 6, name: "bossoskil1", market: "Capitals vs. Kraken", from: "$141,546", to: "$307,902" },
  { rank: 7, name: "SwissMiss", market: "Trail Blazers vs. Wizards", from: "$69,826", to: "$223,469" },
  { rank: 8, name: "gopatriots", market: "Pistons vs. Nuggets", from: "$92,100", to: "$198,450" },
];

export const achievements = [
  { id: "first-bet", label: "First Bet", icon: "target", unlocked: true },
  { id: "win-streak-3", label: "3 Win Streak", icon: "flame", unlocked: true },
  { id: "profit-100", label: "$100 Profit", icon: "coins", unlocked: false },
  { id: "early-bird", label: "Early Bird", icon: "sunrise", unlocked: true },
  { id: "diamond-hands", label: "Diamond Hands", icon: "gem", unlocked: false },
  { id: "top-10", label: "Top 10", icon: "trophy", unlocked: false },
];

export const demoComments = [
  {
    id: "c1",
    user: "tour.snow",
    tag: "Yes",
    message:
      "Momentum is strong here. Watching the spread before adding more.",
    time: "7m",
  },
  {
    id: "c2",
    user: "DonHRBob",
    tag: "No",
    message: "Feels overpriced at these levels. Waiting for a pullback.",
    time: "21m",
  },
  {
    id: "c3",
    user: "market_maker",
    tag: "Yes",
    message: "Short-term liquidity looks good. Risk/reward is solid.",
    time: "42m",
  },
];

export const getMarketBySlug = (slug: string) =>
  markets.find((market) => market.slug === slug);
