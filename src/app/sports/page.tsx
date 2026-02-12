"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TopNav } from "@/components/TopNav";
import { CategoryTabs } from "@/components/CategoryTabs";
import { SportsSidebar } from "@/components/SportsSidebar";
import { MainFooter } from "@/components/MainFooter";
import { TodayGames } from "@/components/sports/TodayGames";
import { UpcomingGames } from "@/components/sports/UpcomingGames";
import { TeamLogoGrid } from "@/components/sports/TeamLogoGrid";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, ToggleRight } from "lucide-react";
import { LightningLoader } from "@/components/ui/LightningLoader";

// Valid leagues
const VALID_LEAGUES = ["nfl", "nba", "mlb", "nhl", "soccer"] as const;
type ValidLeague = (typeof VALID_LEAGUES)[number];

// League display config
const LEAGUE_CONFIG: Record<ValidLeague, { name: string; icon: string; color: string }> = {
  nfl: { name: "NFL", icon: "🏈", color: "#013369" },
  nba: { name: "NBA", icon: "🏀", color: "#C9082A" },
  mlb: { name: "MLB", icon: "⚾", color: "#002D72" },
  nhl: { name: "NHL", icon: "🏒", color: "#000000" },
  soccer: { name: "Soccer", icon: "⚽", color: "#37003C" },
};

// Inner component that uses useSearchParams
function SportsPageContent() {
  const searchParams = useSearchParams();
  
  // Parse and validate league from URL
  const leagueParam = searchParams?.get("league")?.toLowerCase() || "nfl";
  const league: ValidLeague = VALID_LEAGUES.includes(leagueParam as ValidLeague) 
    ? (leagueParam as ValidLeague) 
    : "nfl";
  
  const leagueConfig = LEAGUE_CONFIG[league];
  
  const [showSpreads, setShowSpreads] = useState(true);

  return (
    <div className="min-h-screen bg-[color:var(--app-bg)] text-[color:var(--text-strong)]">
      <TopNav />
      <CategoryTabs activeLabel={leagueConfig.name} />

      <div className="flex flex-col lg:flex-row">
        {/* Sidebar */}
        <SportsSidebar activeSport={league} />

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 md:mb-6">
              <div className="flex items-center gap-2 md:gap-3">
                <span className="text-xl md:text-2xl">{leagueConfig.icon}</span>
                <h1 className="text-xl md:text-2xl font-bold">{leagueConfig.name}</h1>
              </div>
              <div className="flex items-center gap-2 md:gap-4">
                <Button variant="ghost" size="icon" className="h-8 w-8 md:h-9 md:w-9">
                  <Settings className="h-4 w-4 md:h-5 md:w-5" />
                </Button>
                <button
                  onClick={() => setShowSpreads(!showSpreads)}
                  className="flex items-center gap-1.5 md:gap-2 bg-[color:var(--surface-2)] rounded-full px-3 md:px-4 py-1.5 md:py-2"
                >
                  <ToggleRight className={`h-4 w-4 md:h-5 md:w-5 ${showSpreads ? "text-green-500" : "text-[color:var(--text-muted)]"}`} />
                  <span className="text-xs md:text-sm hidden sm:inline">Show Spreads + Totals</span>
                  <span className="text-xs sm:hidden">Spreads</span>
                </button>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="live" className="mb-4 md:mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <TabsList className="bg-[color:var(--surface)] border border-[color:var(--border-soft)]">
                  <TabsTrigger value="live" className="data-[state=active]:bg-[color:var(--surface-2)] text-xs md:text-sm">
                    Games
                  </TabsTrigger>
                  <TabsTrigger value="teams" className="data-[state=active]:bg-[color:var(--surface-2)] text-xs md:text-sm">
                    All Teams
                  </TabsTrigger>
                </TabsList>
              </div>
            </Tabs>

            {/* Live Games from SportsDataIO */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4 text-[color:var(--text-strong)]">Today&apos;s Games</h2>
              <TodayGames league={league} />
            </div>

            {/* Upcoming Games */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4 text-[color:var(--text-strong)]">Upcoming Matchups</h2>
              <p className="text-sm text-[color:var(--text-muted)] mb-4">Make your picks for upcoming {leagueConfig.name} games</p>
              <UpcomingGames league={league} days={7} />
            </div>

            {/* Teams Grid */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4 text-[color:var(--text-strong)]">{leagueConfig.name} Teams</h2>
              <TeamLogoGrid league={league} />
            </div>

          </div>
        </main>

      </div>

      <MainFooter />
    </div>
  );
}

// Loading fallback for Suspense
function SportsPageLoading() {
  return (
    <div className="min-h-screen bg-[color:var(--app-bg)] flex items-center justify-center">
      <LightningLoader size="lg" text="Loading..." />
    </div>
  );
}

// Main export with Suspense boundary for useSearchParams
export default function SportsPage() {
  return (
    <Suspense fallback={<SportsPageLoading />}>
      <SportsPageContent />
    </Suspense>
  );
}
