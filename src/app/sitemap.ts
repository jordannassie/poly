/**
 * Dynamic sitemap generation for SEO
 * Includes:
 * - Static pages
 * - NFL index
 * - NFL game pages (added dynamically at runtime when API is available)
 * 
 * Note: During build, game pages may not be included if API is unavailable.
 * At runtime, sitemap will be generated with full game data.
 */

import { MetadataRoute } from "next";

// Use VERCEL_URL or NEXT_PUBLIC_BASE_URL or fallback
const getBaseUrl = () => {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  // During local dev or build, just return empty and skip API calls
  return "";
};

// Static pages that should always be in sitemap
const STATIC_PAGES = [
  { path: "/", changeFreq: "daily" as const, priority: 1.0 },
  { path: "/sports?league=nfl", changeFreq: "hourly" as const, priority: 0.9 },
  { path: "/sports?league=nba", changeFreq: "hourly" as const, priority: 0.9 },
  { path: "/sports?league=mlb", changeFreq: "hourly" as const, priority: 0.9 },
  { path: "/sports?league=nhl", changeFreq: "hourly" as const, priority: 0.9 },
  { path: "/sports", changeFreq: "daily" as const, priority: 0.8 },
  { path: "/leaderboard", changeFreq: "daily" as const, priority: 0.6 },
];

interface NflGame {
  gameId: string;
  startTime: string;
  status: string;
}

interface UpcomingResponse {
  games: NflGame[];
}

async function fetchNflGames(baseUrl: string): Promise<NflGame[]> {
  // Skip API calls if no valid base URL
  if (!baseUrl || baseUrl.includes("example.com")) {
    return [];
  }

  try {
    // Fetch upcoming games (next 14 days)
    const upcomingRes = await fetch(
      `${baseUrl}/api/sports/upcoming?league=nfl&days=14`,
      { 
        next: { revalidate: 3600 }, // Cache for 1 hour
        signal: AbortSignal.timeout(5000), // 5 second timeout
      }
    );
    
    if (!upcomingRes.ok) {
      return [];
    }
    
    const upcomingData: UpcomingResponse = await upcomingRes.json();
    return upcomingData.games || [];
  } catch {
    // Silently fail - sitemap will just have static pages
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();
  const now = new Date().toISOString();
  
  // Use a reasonable fallback for URL generation
  const sitemapBaseUrl = baseUrl || "https://example.com";
  
  // Start with static pages
  const pages: MetadataRoute.Sitemap = STATIC_PAGES.map(page => ({
    url: `${sitemapBaseUrl}${page.path}`,
    lastModified: now,
    changeFrequency: page.changeFreq,
    priority: page.priority,
  }));

  // Add NFL game pages (only if we have a valid base URL)
  if (baseUrl) {
    try {
      const nflGames = await fetchNflGames(baseUrl);
      
      for (const game of nflGames) {
        const isLive = game.status === "in_progress";
        const isFinal = game.status === "final";
        
        pages.push({
          url: `${sitemapBaseUrl}/nfl/game/${game.gameId}`,
          lastModified: isLive ? now : game.startTime,
          changeFrequency: isLive ? "always" : isFinal ? "monthly" : "daily",
          priority: isLive ? 0.9 : isFinal ? 0.5 : 0.7,
        });
      }
    } catch {
      // Silently fail - static pages are sufficient
    }
  }

  return pages;
}

// Force dynamic generation so sitemap updates with live data
export const dynamic = "force-dynamic";
export const revalidate = 3600; // Revalidate every hour
