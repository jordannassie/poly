"use client";

import { useState } from "react";
import { TopNav } from "@/components/TopNav";
import { CategoryTabs } from "@/components/CategoryTabs";
import { MarketCard } from "@/components/MarketCard";
import { Leaderboard } from "@/components/Leaderboard";
import { Achievements } from "@/components/Achievements";
import { UserLevel } from "@/components/UserLevel";
import { MainFooter } from "@/components/MainFooter";
import { AvailabilitySection } from "@/components/AvailabilitySection";
import { markets } from "@/lib/mockData";
import { Target, Flame, Zap, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [showAll, setShowAll] = useState(false);
  const initialCount = 4;
  const displayedMarkets = showAll ? markets : markets.slice(0, initialCount);

  return (
    <div className="min-h-screen bg-[color:var(--app-bg)] text-[color:var(--text-strong)]">
      <TopNav />
      <CategoryTabs activeLabel="Trending" />
      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <div className="mb-6 p-4 rounded-2xl bg-[color:var(--surface)] border border-[color:var(--border-soft)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Target className="h-8 w-8 text-blue-500" />
              <div>
                <h1 className="text-2xl font-bold">Predict & Win</h1>
                <p className="text-sm text-[color:var(--text-muted)]">
                  Place bets on real-world events and earn rewards
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-500 flex items-center gap-1">
                <Zap className="h-3 w-3" /> +500 XP Today
              </span>
              <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-500 flex items-center gap-1">
                <Flame className="h-3 w-3" /> 3 Day Streak
              </span>
            </div>
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              {displayedMarkets.map((market) => (
                <MarketCard key={market.slug} market={market} />
              ))}
            </div>
            {/* Show More Button */}
            {markets.length > initialCount && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAll(!showAll)}
                  className="gap-2 px-8 py-3 border-[color:var(--border-soft)] hover:bg-[color:var(--surface-2)] transition-all"
                >
                  {showAll ? "Show Less" : "Show More"}
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      showAll ? "rotate-180" : ""
                    }`}
                  />
                </Button>
              </div>
            )}
          </div>
          <aside className="space-y-6">
            <UserLevel />
            <Leaderboard />
            <Achievements />
          </aside>
        </div>
      </main>
      <AvailabilitySection />
      <MainFooter />
    </div>
  );
}
