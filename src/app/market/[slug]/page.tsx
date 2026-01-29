"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TopNav } from "@/components/TopNav";
import { SportsSidebar } from "@/components/SportsSidebar";
import { MainFooter } from "@/components/MainFooter";
import { MarketGamePage } from "@/components/market/MarketGamePage";
import { Button } from "@/components/ui/button";
import { getMarketBySlug, sportsGames } from "@/lib/mockData";
import { generateHotMarkets } from "@/lib/marketHelpers";
import { mockGameToMarketViewModel } from "@/lib/adapters/gameToMarketViewModel";

// Team logo lookup type
interface TeamInfo {
  abbreviation: string;
  logoUrl: string | null;
  primaryColor: string | null;
}

type MarketPageProps = {
  params: { slug: string };
};

export default function MarketPage({ params }: MarketPageProps) {
  const { slug } = params;
  
  // Team logos state
  const [teamLogos, setTeamLogos] = useState<Map<string, TeamInfo>>(new Map());
  const [logosLoaded, setLogosLoaded] = useState(false);

  // Fetch team logos on mount
  useEffect(() => {
    async function fetchTeamLogos() {
      try {
        const res = await fetch("/api/sports/teams?league=nfl");
        if (res.ok) {
          const data = await res.json();
          const logoMap = new Map<string, TeamInfo>();
          for (const team of data.teams) {
            logoMap.set(team.abbreviation, {
              abbreviation: team.abbreviation,
              logoUrl: team.logoUrl,
              primaryColor: team.primaryColor,
            });
          }
          setTeamLogos(logoMap);
        }
      } catch (error) {
        console.error("Failed to fetch team logos:", error);
      } finally {
        setLogosLoaded(true);
      }
    }
    fetchTeamLogos();
  }, []);

  // Try to find as a hot market first for extra data
  const hotMarkets = generateHotMarkets();
  const hotMarket = hotMarkets.find((m) => m.id === slug);

  // Try to find as a sports game
  const sportsGame = sportsGames.find((g) => g.id === slug);
  const market = getMarketBySlug(slug);

  if (!sportsGame && !market && !hotMarket) {
    notFound();
  }

  // Use hot market data if available, otherwise fall back to sportsGame
  const gameData = hotMarket || sportsGame;

  // Render the sports game market page using the shared component
  if (gameData) {
    // Convert to MarketViewModel using the adapter
    const marketViewModel = mockGameToMarketViewModel(
      gameData,
      teamLogos,
      hotMarket ? {
        volumeToday: hotMarket.volumeToday,
        activeBettors: hotMarket.activeBettors,
        startTime: hotMarket.startTime,
        volume10m: hotMarket.volume10m,
      } : undefined
    );

    // Force re-render when logos load
    return <MarketGamePage key={`market-${logosLoaded}`} market={marketViewModel} />;
  }

  // Fallback for non-sports markets
  if (!market) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[color:var(--app-bg)] text-[color:var(--text-strong)]">
      <TopNav />

      <div className="flex">
        <SportsSidebar />

        <main className="flex-1 p-6">
          <div className="max-w-4xl">
            <Link
              href="/"
              className="inline-flex items-center text-sm text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)] mb-4"
            >
              ← Back to Markets
            </Link>

            <h1 className="text-2xl font-bold mb-4">{market.title}</h1>

            <div className="mt-6 space-y-3">
              {market.outcomes.map((outcome) => (
                <div
                  key={outcome.id}
                  className="flex items-center justify-between gap-4 rounded-xl bg-[color:var(--surface)] border border-[color:var(--border-soft)] p-4"
                >
                  <div>
                    <div className="font-semibold">{outcome.name}</div>
                    <div className="text-sm text-[color:var(--text-subtle)]">{outcome.volume}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-2xl font-bold">{outcome.prob}%</div>
                    <Button className="bg-green-600 hover:bg-green-700 text-white">
                      Yes {outcome.yesPrice}¢
                    </Button>
                    <Button className="bg-red-600 hover:bg-red-700 text-white">
                      No {outcome.noPrice}¢
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      <MainFooter />
    </div>
  );
}
