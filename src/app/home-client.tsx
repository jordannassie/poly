"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { TopNav } from "@/components/TopNav";
import { CategoryTabs } from "@/components/CategoryTabs";
import { SportsSidebar } from "@/components/SportsSidebar";
import { HeadToHeadChart } from "@/components/HeadToHeadChart";
import { Leaderboard } from "@/components/Leaderboard";
import { UserLevel } from "@/components/UserLevel";
import { MainFooter } from "@/components/MainFooter";
import { Button } from "@/components/ui/button";
import {
  Flame,
  TrendingUp,
  Zap,
  ChevronRight,
  Trophy,
  Clock,
  Users,
  Activity,
  Radio,
} from "lucide-react";
import {
  getHotMarkets,
  getLiveMarkets,
  getStartingSoonMarkets,
  getBigVolumeMarkets,
  locksInLabel,
  formatVolume,
  getMarketBadge,
  type HotMarket,
} from "@/lib/marketHelpers";

export default function HomeClient() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") || "hot";

  const [markets, setMarkets] = useState<HotMarket[]>([]);
  const [featuredMarket, setFeaturedMarket] = useState<HotMarket | null>(null);

  useEffect(() => {
    let selectedMarkets: HotMarket[];

    switch (view) {
      case "live":
        selectedMarkets = getLiveMarkets();
        break;
      case "starting-soon":
        selectedMarkets = getStartingSoonMarkets();
        break;
      case "big-volume":
        selectedMarkets = getBigVolumeMarkets();
        break;
      default:
        selectedMarkets = getHotMarkets();
    }

    setMarkets(selectedMarkets);

    // Featured market is always the #1 hot market
    const hotMarkets = getHotMarkets();
    setFeaturedMarket(hotMarkets[0] || null);
  }, [view]);

  const getViewTitle = () => {
    switch (view) {
      case "live":
        return { icon: <Radio className="h-5 w-5 text-red-500" />, text: "Live Now" };
      case "starting-soon":
        return { icon: <Clock className="h-5 w-5 text-blue-500" />, text: "Starting Soon" };
      case "big-volume":
        return { icon: <TrendingUp className="h-5 w-5 text-green-500" />, text: "Big Volume" };
      default:
        return { icon: <Flame className="h-5 w-5 text-orange-500" />, text: "Hot Right Now" };
    }
  };

  const viewInfo = getViewTitle();

  return (
    <div className="min-h-screen bg-[color:var(--app-bg)] text-[color:var(--text-strong)]">
      <TopNav />
      <CategoryTabs activeLabel={view === "hot" ? "🔥 Hot Right Now" : view === "live" ? "Live" : view === "starting-soon" ? "Starting Soon" : view === "big-volume" ? "Big Volume" : "🔥 Hot Right Now"} />

      <div className="flex">
        {/* Sidebar */}
        <SportsSidebar />

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-5xl mx-auto">
            {/* Hero Section */}
            <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-[color:var(--surface)] to-[color:var(--surface-2)] border border-[color:var(--border-soft)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
                    <Trophy className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold">ProvePicks Sports</h1>
                    <p className="text-[color:var(--text-muted)]">
                      Bet on your favorite teams. Win big.
                    </p>
                  </div>
                </div>
                <div className="hidden md:flex items-center gap-3">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/20 text-green-500">
                    <Zap className="h-4 w-4" />
                    <span className="font-medium">+500 XP Today</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/20 text-orange-500">
                    <Flame className="h-4 w-4" />
                    <span className="font-medium">3 Day Streak</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Featured Game - Uses #1 Hot Market */}
            {featuredMarket && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Flame className="h-5 w-5 text-orange-500" />
                    Featured Game
                    <span className="ml-2 text-xs px-2 py-1 rounded-full bg-orange-500/20 text-orange-500 font-medium">
                      #1 HOT
                    </span>
                  </h2>
                  <Link
                    href={`/market/${featuredMarket.id}`}
                    className="text-sm text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)] flex items-center gap-1"
                  >
                    View Details <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
                <HeadToHeadChart
                  team1={{ ...featuredMarket.team1, record: "" }}
                  team2={{ ...featuredMarket.team2, record: "" }}
                  gameTime={`Locks in: ${locksInLabel(featuredMarket.startTime)}`}
                  volume={formatVolume(featuredMarket.volumeToday)}
                />
                {/* Featured Game Stats */}
                <div className="mt-3 flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2 text-[color:var(--text-muted)]">
                    <Activity className="h-4 w-4 text-green-500" />
                    <span>{formatVolume(featuredMarket.volume10m)} last 10m</span>
                  </div>
                  <div className="flex items-center gap-2 text-[color:var(--text-muted)]">
                    <Users className="h-4 w-4 text-blue-500" />
                    <span>{featuredMarket.activeBettors} active bettors</span>
                  </div>
                  <div className={`flex items-center gap-1 ${featuredMarket.percentMove > 0 ? "text-green-500" : "text-red-500"}`}>
                    <TrendingUp className="h-4 w-4" />
                    <span>{featuredMarket.percentMove > 0 ? "+" : ""}{featuredMarket.percentMove}% today</span>
                  </div>
                </div>
              </div>
            )}

            {/* View Title */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                {viewInfo.icon}
                {viewInfo.text}
              </h2>
              <span className="text-sm text-[color:var(--text-muted)]">
                {markets.length} markets
              </span>
            </div>

            {/* Markets Grid */}
            <div className="grid gap-4 md:grid-cols-2">
              {markets.map((market) => {
                const badge = getMarketBadge(market);
                const isLive = market.isLive;

                return (
                  <Link
                    key={market.id}
                    href={`/market/${market.id}`}
                    className="block bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl p-4 hover:border-[color:var(--border-strong)] transition group relative"
                  >
                    {/* Badge */}
                    {badge && (
                      <div
                        className={`absolute -top-2 -right-2 px-2 py-1 rounded-full text-xs font-bold text-white flex items-center gap-1 ${
                          badge === "LIVE"
                            ? "bg-red-500 animate-pulse"
                            : badge === "HOT"
                            ? "bg-gradient-to-r from-orange-500 to-red-500"
                            : "bg-gradient-to-r from-blue-500 to-purple-500"
                        }`}
                      >
                        {badge === "LIVE" && <Radio className="h-3 w-3" />}
                        {badge === "HOT" && <Flame className="h-3 w-3" />}
                        {badge === "MOVING" && <TrendingUp className="h-3 w-3" />}
                        {badge}
                      </div>
                    )}

                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs px-2 py-1 rounded bg-[color:var(--surface-2)] text-[color:var(--text-muted)]">
                        {market.league}
                      </span>
                      <div className="flex items-center gap-3 text-xs text-[color:var(--text-subtle)]">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {isLive ? "LIVE" : `Locks in ${locksInLabel(market.startTime)}`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Team 1 */}
                      <div className="flex items-center gap-2 flex-1">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                          style={{ backgroundColor: market.team1.color }}
                        >
                          {market.team1.abbr}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{market.team1.name}</div>
                        </div>
                      </div>

                      {/* VS */}
                      <div className="text-[color:var(--text-subtle)] font-medium">vs</div>

                      {/* Team 2 */}
                      <div className="flex items-center gap-2 flex-1 justify-end">
                        <div>
                          <div className="font-medium text-sm text-right">{market.team2.name}</div>
                        </div>
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                          style={{ backgroundColor: market.team2.color }}
                        >
                          {market.team2.abbr}
                        </div>
                      </div>
                    </div>

                    {/* Odds Bar */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium">{market.team1.odds}%</span>
                        <span className="font-medium">{market.team2.odds}%</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden bg-[color:var(--surface-3)] flex">
                        <div
                          className="h-full transition-all"
                          style={{
                            width: `${market.team1.odds}%`,
                            backgroundColor: market.team1.color,
                          }}
                        />
                        <div
                          className="h-full transition-all"
                          style={{
                            width: `${market.team2.odds}%`,
                            backgroundColor: market.team2.color,
                          }}
                        />
                      </div>
                    </div>

                    {/* Stats Row */}
                    <div className="mt-3 flex items-center justify-between text-xs text-[color:var(--text-subtle)]">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Zap className="h-3 w-3 text-yellow-500" />
                          {formatVolume(market.volumeToday)} today
                        </span>
                        <span className="flex items-center gap-1 text-green-500">
                          <Activity className="h-3 w-3" />
                          {formatVolume(market.volume10m)} / 10m
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {market.activeBettors}
                      </div>
                    </div>

                    {/* Bet Button */}
                    <div className="mt-3">
                      <Button
                        size="sm"
                        className="w-full bg-green-600 hover:bg-green-700 text-white opacity-0 group-hover:opacity-100 transition"
                      >
                        Bet Now
                      </Button>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Empty State */}
            {markets.length === 0 && (
              <div className="text-center py-12">
                <div className="text-[color:var(--text-muted)] mb-4">
                  No markets found for this view
                </div>
                <Link href="/">
                  <Button>View Hot Markets</Button>
                </Link>
              </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              <div className="bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-green-500">$48M</div>
                <div className="text-sm text-[color:var(--text-muted)]">Daily Volume</div>
              </div>
              <div className="bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl p-4 text-center">
                <div className="text-2xl font-bold">1,200+</div>
                <div className="text-sm text-[color:var(--text-muted)]">Live Markets</div>
              </div>
              <div className="bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-orange-500">18</div>
                <div className="text-sm text-[color:var(--text-muted)]">Sports</div>
              </div>
              <div className="bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl p-4 text-center">
                <div className="text-2xl font-bold">2.4M</div>
                <div className="text-sm text-[color:var(--text-muted)]">Users</div>
              </div>
            </div>
          </div>
        </main>

        {/* Right Sidebar */}
        <aside className="w-80 flex-shrink-0 p-6 border-l border-[color:var(--border-soft)] hidden xl:block">
          <UserLevel />
          <div className="mt-6">
            <Leaderboard />
          </div>
        </aside>
      </div>

      <MainFooter />
    </div>
  );
}
