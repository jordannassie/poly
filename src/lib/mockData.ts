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
  { label: "Breaking", href: "/breaking" },
  { label: "New", href: "/" },
  { label: "Politics", href: "/" },
  { label: "Sports", href: "/sports" },
  { label: "Crypto", href: "/" },
  { label: "Finance", href: "/" },
  { label: "Geopolitics", href: "/" },
  { label: "Earnings", href: "/" },
  { label: "Tech", href: "/" },
  { label: "Culture", href: "/" },
  { label: "World", href: "/" },
  { label: "Economy", href: "/" },
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

export const getMarketBySlug = (slug: string) =>
  markets.find((market) => market.slug === slug);
