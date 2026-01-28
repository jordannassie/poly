"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { TopNav } from "@/components/TopNav";
import { CategoryTabs } from "@/components/CategoryTabs";
import { MainFooter } from "@/components/MainFooter";
import { TeamLogoGrid } from "@/components/sports/TeamLogoGrid";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  AlertCircle, 
  Calendar, 
  Tv, 
  ChevronRight,
  Trophy,
  Clock
} from "lucide-react";

interface Team {
  teamId: number;
  abbreviation: string;
  name: string;
  city: string;
  fullName: string;
  logoUrl: string | null;
  primaryColor: string | null;
}

interface Game {
  gameId: string;
  status: "scheduled" | "in_progress" | "final" | "postponed" | "canceled";
  startTime: string;
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number | null;
  awayScore: number | null;
  venue: string | null;
  channel: string | null;
  week: number;
}

interface UpcomingResponse {
  range: { startDate: string; endDate: string };
  count: number;
  games: Game[];
}

export default function NFLIndexPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGames() {
      try {
        setLoading(true);
        setError(null);
        
        const res = await fetch("/api/sports/upcoming?league=nfl&days=14");
        
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || `Failed to fetch games: ${res.status}`);
        }
        
        const data: UpcomingResponse = await res.json();
        setGames(data.games);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load games");
      } finally {
        setLoading(false);
      }
    }

    fetchGames();
  }, []);

  // Categorize games
  const today = new Date().toISOString().split("T")[0];
  
  const liveGames = games.filter(g => g.status === "in_progress");
  const todayGames = games.filter(g => 
    g.startTime.startsWith(today) && g.status !== "in_progress"
  );
  const upcomingGames = games.filter(g => 
    !g.startTime.startsWith(today) && 
    g.status === "scheduled"
  );
  const recentGames = games.filter(g => 
    g.status === "final" && !g.startTime.startsWith(today)
  );

  const hasAnyGames = games.length > 0;

  return (
    <div className="min-h-screen bg-[color:var(--app-bg)] text-[color:var(--text-strong)]">
      <TopNav />
      <CategoryTabs activeLabel="Sports" />

      <main className="max-w-6xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">🏈</span>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">NFL</h1>
            <p className="text-sm text-[color:var(--text-muted)]">
              Track matchups and make your picks
            </p>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-12 bg-red-500/10 border border-red-500/20 rounded-xl mb-8">
            <AlertCircle className="h-10 w-10 text-red-500 mb-3" />
            <p className="text-red-500">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Live Now Section */}
            {liveGames.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                  <h2 className="text-xl font-bold text-green-500">Live Now</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {liveGames.map(game => (
                    <GameCard key={game.gameId} game={game} featured />
                  ))}
                </div>
              </section>
            )}

            {/* Today Section */}
            {todayGames.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="h-5 w-5 text-orange-500" />
                  <h2 className="text-xl font-bold">Today</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {todayGames.map(game => (
                    <GameCard key={game.gameId} game={game} />
                  ))}
                </div>
              </section>
            )}

            {/* Upcoming Section */}
            {upcomingGames.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="h-5 w-5 text-blue-500" />
                  <h2 className="text-xl font-bold">Upcoming Games</h2>
                </div>
                <div className="space-y-3">
                  {groupGamesByDate(upcomingGames).map(({ date, games }) => (
                    <div key={date}>
                      <h3 className="text-sm font-medium text-[color:var(--text-muted)] mb-2">
                        {formatDateHeader(date)}
                      </h3>
                      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {games.map(game => (
                          <GameCard key={game.gameId} game={game} compact />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Recent Results */}
            {recentGames.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  <h2 className="text-xl font-bold">Recent Results</h2>
                </div>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {recentGames.slice(0, 6).map(game => (
                    <GameCard key={game.gameId} game={game} compact />
                  ))}
                </div>
              </section>
            )}

            {/* Offseason Message */}
            {!hasAnyGames && (
              <div className="text-center py-16 bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-2xl mb-8">
                <span className="text-5xl mb-4 block">🏈</span>
                <h2 className="text-2xl font-bold mb-2">NFL Season Coming Soon</h2>
                <p className="text-[color:var(--text-muted)] mb-6">
                  Check back when the season starts to make your picks!
                </p>
              </div>
            )}

            {/* Teams Grid */}
            <section className="mb-8">
              <h2 className="text-xl font-bold mb-4">All NFL Teams</h2>
              <TeamLogoGrid league="nfl" />
            </section>
          </>
        )}
      </main>

      <MainFooter />
    </div>
  );
}

// Helper function to group games by date
function groupGamesByDate(games: Game[]): { date: string; games: Game[] }[] {
  const groups = new Map<string, Game[]>();
  
  for (const game of games) {
    const date = game.startTime.split("T")[0];
    if (!groups.has(date)) {
      groups.set(date, []);
    }
    groups.get(date)!.push(game);
  }
  
  return Array.from(groups.entries())
    .map(([date, games]) => ({ date, games }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Helper function to format date headers
function formatDateHeader(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  
  if (dateStr === today.toISOString().split("T")[0]) {
    return "Today";
  }
  if (dateStr === tomorrow.toISOString().split("T")[0]) {
    return "Tomorrow";
  }
  
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

// Game Card Component
function GameCard({ 
  game, 
  featured = false,
  compact = false 
}: { 
  game: Game; 
  featured?: boolean;
  compact?: boolean;
}) {
  const [awayImgError, setAwayImgError] = useState(false);
  const [homeImgError, setHomeImgError] = useState(false);

  const isLive = game.status === "in_progress";
  const isFinal = game.status === "final";
  const gameTime = new Date(game.startTime).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <Link href={`/nfl/game/${game.gameId}`}>
      <div className={`
        bg-[color:var(--surface)] border rounded-xl transition cursor-pointer
        ${featured 
          ? "border-green-500/50 bg-gradient-to-br from-green-500/10 to-transparent p-5" 
          : "border-[color:var(--border-soft)] hover:border-[color:var(--border-strong)] p-4"
        }
        ${compact ? "p-3" : ""}
      `}>
        {/* Status Badge */}
        <div className="flex items-center justify-between mb-3">
          {isLive ? (
            <div className="flex items-center gap-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold animate-pulse">
              <span className="w-2 h-2 bg-white rounded-full" />
              LIVE
            </div>
          ) : isFinal ? (
            <span className="text-xs font-medium text-[color:var(--text-muted)] bg-[color:var(--surface-2)] px-2 py-1 rounded">
              Final
            </span>
          ) : (
            <span className="text-xs font-medium text-[color:var(--text-muted)] bg-[color:var(--surface-2)] px-2 py-1 rounded">
              {gameTime}
            </span>
          )}
          {game.channel && (
            <div className="flex items-center gap-1 text-xs text-[color:var(--text-subtle)]">
              <Tv className="h-3 w-3" />
              {game.channel}
            </div>
          )}
        </div>

        {/* Teams */}
        <div className="space-y-2">
          {/* Away Team */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden"
                style={{ backgroundColor: game.awayTeam.primaryColor || "#374151" }}
              >
                {game.awayTeam.logoUrl && !awayImgError ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={game.awayTeam.logoUrl}
                    alt={game.awayTeam.fullName}
                    className="w-6 h-6 object-contain"
                    onError={() => setAwayImgError(true)}
                    loading="lazy"
                  />
                ) : (
                  <span className="text-white font-bold text-xs">
                    {game.awayTeam.abbreviation}
                  </span>
                )}
              </div>
              <div>
                <div className={`font-medium ${compact ? "text-sm" : ""}`}>
                  {game.awayTeam.city}
                </div>
                <div className="text-xs text-[color:var(--text-subtle)]">
                  {game.awayTeam.name}
                </div>
              </div>
            </div>
            {(isLive || isFinal) && game.awayScore !== null && (
              <span className={`text-xl font-bold ${
                isFinal && game.awayScore > (game.homeScore || 0) ? "text-green-500" : ""
              }`}>
                {game.awayScore}
              </span>
            )}
          </div>

          {/* Home Team */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden"
                style={{ backgroundColor: game.homeTeam.primaryColor || "#374151" }}
              >
                {game.homeTeam.logoUrl && !homeImgError ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={game.homeTeam.logoUrl}
                    alt={game.homeTeam.fullName}
                    className="w-6 h-6 object-contain"
                    onError={() => setHomeImgError(true)}
                    loading="lazy"
                  />
                ) : (
                  <span className="text-white font-bold text-xs">
                    {game.homeTeam.abbreviation}
                  </span>
                )}
              </div>
              <div>
                <div className={`font-medium ${compact ? "text-sm" : ""}`}>
                  {game.homeTeam.city}
                </div>
                <div className="text-xs text-[color:var(--text-subtle)]">
                  {game.homeTeam.name}
                </div>
              </div>
            </div>
            {(isLive || isFinal) && game.homeScore !== null && (
              <span className={`text-xl font-bold ${
                isFinal && game.homeScore > (game.awayScore || 0) ? "text-green-500" : ""
              }`}>
                {game.homeScore}
              </span>
            )}
          </div>
        </div>

        {/* CTA */}
        {!compact && game.status === "scheduled" && (
          <div className="mt-4 pt-3 border-t border-[color:var(--border-soft)]">
            <Button 
              className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold"
              size="sm"
            >
              Make a Pick
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </Link>
  );
}
