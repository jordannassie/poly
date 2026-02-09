"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { TopNav } from "@/components/TopNav";
import { CategoryTabs } from "@/components/CategoryTabs";
import { SportsSidebar } from "@/components/SportsSidebar";
import { Leaderboard } from "@/components/Leaderboard";
import { MainFooter } from "@/components/MainFooter";
import { FeaturedGameHero } from "@/components/home/FeaturedGameHero";
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
import { LightningLoader } from "@/components/ui/LightningLoader";

// Hot game type from API
interface HotGame {
  id: string;
  title: string;
  league: string;
  team1: {
    abbr: string;
    name: string;
    odds: number;
    color: string;
    logoUrl: string | null;
  };
  team2: {
    abbr: string;
    name: string;
    odds: number;
    color: string;
    logoUrl: string | null;
  };
  startTime: string;
  status: string;
  isLive: boolean;
  volumeToday: number;
  volume10m: number;
  activeBettors: number;
}

// Helper to get the correct game page URL based on league
function getGameHref(game: HotGame): string {
  const league = game.league.toLowerCase();
  // For sports leagues with dedicated game pages
  if (["nfl", "nba", "mlb", "nhl", "soccer"].includes(league)) {
    return `/${league}/game/${game.id}`;
  }
  // Fallback to market page for other leagues
  return `/market/${game.id}`;
}

// Format volume for display
function formatVolume(volume: number): string {
  if (volume >= 1000000) {
    return `$${(volume / 1000000).toFixed(1)}m`;
  }
  if (volume >= 1000) {
    return `$${(volume / 1000).toFixed(0)}k`;
  }
  return `$${volume}`;
}

// Calculate "locks in" label from start time
function locksInLabel(startTime: string): string {
  const now = new Date();
  const start = new Date(startTime);
  const diff = start.getTime() - now.getTime();

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

export default function HomeClient() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") || "hot";

  const [games, setGames] = useState<HotGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHotGames() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/sports/hot");
        if (!res.ok) throw new Error("Failed to fetch games");
        const data = await res.json();
        
        let filteredGames = data.games || [];
        
        // Filter based on view
        switch (view) {
          case "live":
            filteredGames = filteredGames.filter((g: HotGame) => g.isLive);
            break;
          case "starting-soon":
            filteredGames = filteredGames.filter((g: HotGame) => {
              const diff = new Date(g.startTime).getTime() - Date.now();
              return diff > 0 && diff < 2 * 60 * 60 * 1000; // Within 2 hours
            });
            break;
          default:
            // "hot" - show all
            break;
        }
        
        setGames(filteredGames);
      } catch (err) {
        console.error("Failed to fetch hot games:", err);
        setError("Failed to load games");
      } finally {
        setLoading(false);
      }
    }

    fetchHotGames();
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
        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-5xl mx-auto">
            {/* Hero Section */}
            <div className="mb-6 md:mb-8 p-4 md:p-6 rounded-2xl bg-gradient-to-r from-[color:var(--surface)] to-[color:var(--surface-2)] border border-[color:var(--border-soft)]">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="h-12 w-12 md:h-16 md:w-16 rounded-xl md:rounded-2xl overflow-hidden flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://qiodxdkcvewvappuzuud.supabase.co/storage/v1/object/public/SPORTS/logos/ICON%20P.jpg"
                    alt="ProvePicks Logo"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <h1 className="text-xl md:text-3xl font-bold">ProvePicks</h1>
                  <p className="text-sm md:text-base text-[color:var(--text-muted)]">
                    The social prediction market. Follow traders. Track picks. Prove performance.
                  </p>
                </div>
              </div>
            </div>

            {/* Promo Section */}
            <div className="mb-6 md:mb-8">
              <div className="relative overflow-hidden rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface)]">
                <div className="absolute inset-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://qiodxdkcvewvappuzuud.supabase.co/storage/v1/object/public/SPORTS/images/alluring_swan_07128_woman_sitting_on_couch_with_phone_with_se_812d1f93-94af-4530-bc88-978540ae6620_0.png"
                    alt="Trade on ProvePicks"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/20" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6 p-6 md:p-10">
                  <div className="max-w-xl">
                    <div className="flex items-center gap-2 mb-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="https://qiodxdkcvewvappuzuud.supabase.co/storage/v1/object/public/SPORTS/logos/ICON%20P.jpg"
                        alt="ProvePicks"
                        className="h-6 w-6 rounded object-cover"
                      />
                      <span className="text-xs uppercase tracking-[0.25em] text-white/70">
                        ProvePicks
                      </span>
                    </div>
                    <h2 className="text-2xl md:text-4xl font-bold text-white">
                      Trade and get up to $500
                    </h2>
                    <p className="mt-2 text-sm md:text-base text-white/80">
                      Make your prediction and follow the sharpest picks in real time.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Link href="/sports">
                      <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                        Make your prediction
                      </Button>
                    </Link>
                    <Link href="/leaderboard">
                      <Button variant="outline" className="border-white/50 text-white hover:bg-white/10">
                        Learn More
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Featured Game Hero - Real SportsDataIO Data */}
            <div className="mb-8">
              <FeaturedGameHero league="nfl" />
            </div>

            {/* View Title */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                {viewInfo.icon}
                {viewInfo.text}
              </h2>
              <span className="text-sm text-[color:var(--text-muted)]">
                {games.length} games
              </span>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <LightningLoader size="md" text="Loading games..." />
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="text-center py-12">
                <p className="text-red-500 mb-4">{error}</p>
                <Button onClick={() => window.location.reload()}>Retry</Button>
              </div>
            )}

            {/* Games Grid */}
            {!loading && !error && (
              <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2">
                {games.map((game) => {
                  const isLive = game.isLive;

                  return (
                    <Link
                      key={game.id}
                      href={getGameHref(game)}
                      className="block bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl p-4 hover:border-[color:var(--border-strong)] transition group relative"
                    >
                      {/* Badge */}
                      {isLive ? (
                        <div className="absolute -top-2 -right-2 px-2 py-1 rounded-full text-xs font-bold text-white flex items-center gap-1 bg-red-500 animate-pulse">
                          <Radio className="h-3 w-3" />
                          LIVE
                        </div>
                      ) : (
                        <div className="absolute -top-2 -right-2 px-2 py-1 rounded-full text-xs font-bold text-white flex items-center gap-1 bg-gradient-to-r from-orange-500 to-red-500">
                          <Flame className="h-3 w-3" />
                          HOT
                        </div>
                      )}

                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs px-2 py-1 rounded bg-[color:var(--surface-2)] text-[color:var(--text-muted)]">
                          {game.league}
                        </span>
                        <div className="flex items-center gap-3 text-xs text-[color:var(--text-subtle)]">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {isLive ? "LIVE" : `Locks in ${locksInLabel(game.startTime)}`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* Team 1 */}
                        <div className="flex items-center gap-2 flex-1">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm overflow-hidden"
                            style={{ backgroundColor: game.team1.color }}
                          >
                            {game.team1.logoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={game.team1.logoUrl} alt={game.team1.name} className="w-8 h-8 object-contain" />
                            ) : (
                              game.team1.abbr
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-sm">{game.team1.name}</div>
                          </div>
                        </div>

                        {/* VS */}
                        <div className="text-[color:var(--text-subtle)] font-medium">vs</div>

                        {/* Team 2 */}
                        <div className="flex items-center gap-2 flex-1 justify-end">
                          <div>
                            <div className="font-medium text-sm text-right">{game.team2.name}</div>
                          </div>
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm overflow-hidden"
                            style={{ backgroundColor: game.team2.color }}
                          >
                            {game.team2.logoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={game.team2.logoUrl} alt={game.team2.name} className="w-8 h-8 object-contain" />
                            ) : (
                              game.team2.abbr
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Odds Bar */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-medium">{game.team1.odds}%</span>
                          <span className="font-medium">{game.team2.odds}%</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden bg-[color:var(--surface-3)] flex">
                          <div
                            className="h-full transition-all"
                            style={{
                              width: `${game.team1.odds}%`,
                              backgroundColor: game.team1.color,
                            }}
                          />
                          <div
                            className="h-full transition-all"
                            style={{
                              width: `${game.team2.odds}%`,
                              backgroundColor: game.team2.color,
                            }}
                          />
                        </div>
                      </div>

                      {/* Stats Row */}
                      <div className="mt-3 flex items-center justify-between text-xs text-[color:var(--text-subtle)]">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Zap className="h-3 w-3 text-yellow-500" />
                            {formatVolume(game.volumeToday)} today
                          </span>
                          <span className="flex items-center gap-1 text-green-500">
                            <Activity className="h-3 w-3" />
                            {formatVolume(game.volume10m)} / 10m
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {game.activeBettors}
                        </div>
                      </div>

                      {/* View Matchup Button */}
                      <div className="mt-3">
                        <Button
                          size="sm"
                          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white md:opacity-0 md:group-hover:opacity-100 transition"
                        >
                          View Matchup
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && games.length === 0 && (
              <div className="text-center py-12">
                <div className="text-[color:var(--text-muted)] mb-4">
                  No games found for today
                </div>
                <Link href="/sports?league=nfl">
                  <Button>Browse NFL Games</Button>
                </Link>
              </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-6 md:mt-8">
              <div className="bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl p-3 md:p-4 text-center">
                <div className="text-xl md:text-2xl font-bold text-green-500">$48M</div>
                <div className="text-xs md:text-sm text-[color:var(--text-muted)]">Daily Volume</div>
              </div>
              <div className="bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl p-3 md:p-4 text-center">
                <div className="text-xl md:text-2xl font-bold">1,200+</div>
                <div className="text-xs md:text-sm text-[color:var(--text-muted)]">Live Markets</div>
              </div>
              <div className="bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl p-3 md:p-4 text-center">
                <div className="text-xl md:text-2xl font-bold text-orange-500">18</div>
                <div className="text-xs md:text-sm text-[color:var(--text-muted)]">Sports</div>
              </div>
              <div className="bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl p-3 md:p-4 text-center">
                <div className="text-xl md:text-2xl font-bold">2.4M</div>
                <div className="text-xs md:text-sm text-[color:var(--text-muted)]">Users</div>
              </div>
            </div>
          </div>
        </main>

        {/* Right Sidebar */}
        <aside className="w-80 flex-shrink-0 p-6 border-l border-[color:var(--border-soft)] hidden xl:block">
          <Leaderboard />
        </aside>
      </div>

      <MainFooter />
    </div>
  );
}
