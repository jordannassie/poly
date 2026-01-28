"use client";

import { useState } from "react";
import Link from "next/link";
import { TopNav } from "@/components/TopNav";
import { CategoryTabs } from "@/components/CategoryTabs";
import { SportsSidebar } from "@/components/SportsSidebar";
import { HeadToHeadChart } from "@/components/HeadToHeadChart";
import { Leaderboard } from "@/components/Leaderboard";
import { UserLevel } from "@/components/UserLevel";
import { MainFooter } from "@/components/MainFooter";
import { sportsGames } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Flame, TrendingUp, Zap, ChevronRight, Trophy, Target } from "lucide-react";

export default function Home() {
  const [selectedSport, setSelectedSport] = useState("all");

  const featuredGame = sportsGames[0];
  const upcomingGames = sportsGames.slice(1);

  return (
    <div className="min-h-screen bg-[color:var(--app-bg)] text-[color:var(--text-strong)]">
      <TopNav />
      <CategoryTabs activeLabel="Trending" />

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

            {/* Featured Game */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Flame className="h-5 w-5 text-orange-500" />
                  Featured Game
                </h2>
                <Link
                  href={`/market/${featuredGame.id}`}
                  className="text-sm text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)] flex items-center gap-1"
                >
                  View Details <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
              <HeadToHeadChart
                team1={featuredGame.team1}
                team2={featuredGame.team2}
                gameTime={`${featuredGame.date} ${featuredGame.gameTime}`}
                volume={featuredGame.volume}
              />
            </div>

            {/* Upcoming Games */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  Upcoming Games
                </h2>
                <Link
                  href="/sports"
                  className="text-sm text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)] flex items-center gap-1"
                >
                  View All <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {upcomingGames.map((game) => (
                  <Link
                    key={game.id}
                    href={`/market/${game.id}`}
                    className="block bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl p-4 hover:border-[color:var(--border-strong)] transition group"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs px-2 py-1 rounded bg-[color:var(--surface-2)] text-[color:var(--text-muted)]">
                        {game.league}
                      </span>
                      <span className="text-xs text-[color:var(--text-subtle)]">
                        {game.date} {game.gameTime}
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Team 1 */}
                      <div className="flex items-center gap-2 flex-1">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                          style={{ backgroundColor: game.team1.color }}
                        >
                          {game.team1.abbr}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{game.team1.name}</div>
                          <div className="text-xs text-[color:var(--text-subtle)]">{game.team1.record}</div>
                        </div>
                      </div>

                      {/* VS */}
                      <div className="text-[color:var(--text-subtle)] font-medium">vs</div>

                      {/* Team 2 */}
                      <div className="flex items-center gap-2 flex-1 justify-end">
                        <div>
                          <div className="font-medium text-sm text-right">{game.team2.name}</div>
                          <div className="text-xs text-[color:var(--text-subtle)] text-right">{game.team2.record}</div>
                        </div>
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                          style={{ backgroundColor: game.team2.color }}
                        >
                          {game.team2.abbr}
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

                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-[color:var(--text-subtle)]">{game.volume}</span>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white opacity-0 group-hover:opacity-100 transition"
                      >
                        Bet Now
                      </Button>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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
