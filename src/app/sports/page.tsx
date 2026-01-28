"use client";

import { useState } from "react";
import Link from "next/link";
import { TopNav } from "@/components/TopNav";
import { CategoryTabs } from "@/components/CategoryTabs";
import { SportsSidebar } from "@/components/SportsSidebar";
import { HeadToHeadChart } from "@/components/HeadToHeadChart";
import { MainFooter } from "@/components/MainFooter";
import { TradePanel } from "@/components/TradePanel";
import { sportsGames } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, ToggleRight, ChevronDown, MessageSquare, MoreHorizontal, Heart, ChevronRight } from "lucide-react";

export default function SportsPage() {
  const [selectedGame, setSelectedGame] = useState(sportsGames[0]);
  const [showSpreads, setShowSpreads] = useState(true);

  // Format for trade panel
  const formattedMarket = {
    slug: selectedGame.id,
    title: `${selectedGame.team1.name} vs ${selectedGame.team2.name}`,
    category: selectedGame.league,
    volume: selectedGame.volume,
    endDate: `${selectedGame.date} ${selectedGame.gameTime}`,
    outcomes: [
      {
        id: selectedGame.team1.abbr.toLowerCase(),
        name: selectedGame.team1.name,
        prob: selectedGame.team1.odds,
        yesPrice: selectedGame.team1.odds,
        noPrice: 100 - selectedGame.team1.odds,
        volume: selectedGame.volume,
      },
      {
        id: selectedGame.team2.abbr.toLowerCase(),
        name: selectedGame.team2.name,
        prob: selectedGame.team2.odds,
        yesPrice: selectedGame.team2.odds,
        noPrice: 100 - selectedGame.team2.odds,
        volume: selectedGame.volume,
      },
    ],
    sparkline: [],
  };

  return (
    <div className="min-h-screen bg-[color:var(--app-bg)] text-[color:var(--text-strong)]">
      <TopNav />
      <CategoryTabs activeLabel="Sports" />

      <div className="flex">
        {/* Sidebar */}
        <SportsSidebar activeSport="nfl" />

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🏈</span>
                <h1 className="text-2xl font-bold">NFL</h1>
              </div>
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon">
                  <Settings className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-2 bg-[color:var(--surface-2)] rounded-full px-4 py-2">
                  <ToggleRight className={`h-5 w-5 ${showSpreads ? "text-green-500" : "text-[color:var(--text-muted)]"}`} />
                  <span className="text-sm">Show Spreads + Totals</span>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="games" className="mb-6">
              <TabsList className="bg-[color:var(--surface)] border border-[color:var(--border-soft)]">
                <TabsTrigger value="games" className="data-[state=active]:bg-[color:var(--surface-2)]">
                  Games
                </TabsTrigger>
                <TabsTrigger value="props" className="data-[state=active]:bg-[color:var(--surface-2)]">
                  Props
                </TabsTrigger>
              </TabsList>
              <div className="ml-auto flex items-center gap-2">
                <Button variant="outline" className="gap-2">
                  Week 15 <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            </Tabs>

            {/* Date Header */}
            <div className="text-lg font-semibold mb-4">Sun, February 8</div>

            {/* Games List */}
            <div className="space-y-4">
              {sportsGames
                .filter((g) => g.league === "NFL")
                .map((game) => (
                  <div
                    key={game.id}
                    className={`bg-[color:var(--surface)] border rounded-xl p-4 cursor-pointer transition ${
                      selectedGame.id === game.id
                        ? "border-[color:var(--accent)] ring-1 ring-[color:var(--accent)]"
                        : "border-[color:var(--border-soft)] hover:border-[color:var(--border-strong)]"
                    }`}
                    onClick={() => setSelectedGame(game)}
                  >
                    {/* Game Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium bg-[color:var(--surface-2)] px-3 py-1 rounded">
                          {game.gameTime}
                        </span>
                        <span className="text-sm text-[color:var(--text-muted)]">{game.volume}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-[color:var(--surface-2)] px-2 py-1 rounded">68</span>
                        <Link
                          href={`/market/${game.id}`}
                          className="text-sm text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)] flex items-center gap-1"
                        >
                          Game View <ChevronRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>

                    {/* Teams Grid */}
                    <div className="space-y-3">
                      {/* Team 1 Row */}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 w-48">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                            style={{ backgroundColor: game.team1.color }}
                          >
                            {game.team1.abbr}
                          </div>
                          <div>
                            <div className="font-medium">{game.team1.name}</div>
                            <div className="text-xs text-[color:var(--text-subtle)]">{game.team1.record}</div>
                          </div>
                        </div>

                        {/* Moneyline */}
                        <Button className="bg-green-600 hover:bg-green-700 text-white px-6">
                          {game.team1.abbr} {game.team1.odds}¢
                        </Button>

                        {/* Spread */}
                        {showSpreads && game.spread && (
                          <div className="flex items-center gap-2 px-4 py-2 bg-[color:var(--surface-2)] rounded-lg">
                            <span className="text-[color:var(--text-muted)]">{game.team1.abbr} {game.spread.team1}</span>
                            <span className="font-medium">{game.spread.odds1}¢</span>
                          </div>
                        )}

                        {/* Total */}
                        {showSpreads && game.total && (
                          <div className="flex items-center gap-2 px-4 py-2 bg-[color:var(--surface-2)] rounded-lg">
                            <span className="text-[color:var(--text-muted)]">O {game.total.over}</span>
                            <span className="font-medium">{game.total.odds1}¢</span>
                          </div>
                        )}
                      </div>

                      {/* Team 2 Row */}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 w-48">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                            style={{ backgroundColor: game.team2.color }}
                          >
                            {game.team2.abbr}
                          </div>
                          <div>
                            <div className="font-medium">{game.team2.name}</div>
                            <div className="text-xs text-[color:var(--text-subtle)]">{game.team2.record}</div>
                          </div>
                        </div>

                        {/* Moneyline */}
                        <Button
                          variant="outline"
                          className="border-[color:var(--border-soft)] px-6"
                        >
                          {game.team2.abbr} {game.team2.odds}¢
                        </Button>

                        {/* Spread */}
                        {showSpreads && game.spread && (
                          <div className="flex items-center gap-2 px-4 py-2 bg-[color:var(--surface-2)] rounded-lg">
                            <span className="text-[color:var(--text-muted)]">{game.team2.abbr} {game.spread.team2}</span>
                            <span className="font-medium">{game.spread.odds2}¢</span>
                          </div>
                        )}

                        {/* Total */}
                        {showSpreads && game.total && (
                          <div className="flex items-center gap-2 px-4 py-2 bg-[color:var(--surface-2)] rounded-lg">
                            <span className="text-[color:var(--text-muted)]">U {game.total.under}</span>
                            <span className="font-medium">{game.total.odds2}¢</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            {/* Comments Section */}
            <div className="mt-8 bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl p-4">
              <div className="flex items-center gap-3 mb-4">
                <Input
                  placeholder="Add a comment"
                  className="flex-1 bg-[color:var(--surface-2)] border-[color:var(--border-soft)]"
                />
                <Button className="bg-[color:var(--accent)] hover:bg-[color:var(--accent-strong)] text-white">
                  Post
                </Button>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <Button variant="outline" size="sm" className="gap-2">
                  Newest <ChevronDown className="h-4 w-4" />
                </Button>
                <label className="flex items-center gap-2 text-sm text-[color:var(--text-muted)]">
                  <input type="checkbox" className="rounded" />
                  Holders
                </label>
                <div className="ml-auto flex items-center gap-2 text-sm text-[color:var(--text-muted)]">
                  <span className="text-yellow-500">⚠</span>
                  Beware of external links.
                </div>
              </div>

              {/* Sample Comments */}
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-sm font-bold">
                    C
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">CR78</span>
                      <span className="text-xs text-[color:var(--text-subtle)]">3h ago</span>
                      <button className="ml-auto">
                        <MoreHorizontal className="h-4 w-4 text-[color:var(--text-muted)]" />
                      </button>
                    </div>
                    <p className="text-sm text-[color:var(--text-muted)] mb-2">
                      can anyone spare me a dollar :D , will be appreciated
                    </p>
                    <div className="flex items-center gap-4 text-sm text-[color:var(--text-muted)]">
                      <button className="flex items-center gap-1 hover:text-[color:var(--text-strong)]">
                        <Heart className="h-4 w-4" /> 0
                      </button>
                      <button className="hover:text-[color:var(--text-strong)]">Reply</button>
                    </div>
                    <button className="text-sm text-[color:var(--text-muted)] mt-2">
                      Hide 1 Replies
                    </button>

                    {/* Reply */}
                    <div className="flex gap-3 mt-3 pl-4 border-l border-[color:var(--border-soft)]">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                        N
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">nvo</span>
                          <span className="text-xs text-[color:var(--text-subtle)]">12m ago</span>
                        </div>
                        <p className="text-sm text-[color:var(--text-muted)]">
                          <span className="text-blue-400">@CR78</span> stfu
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Trade Panel */}
        <div className="w-80 flex-shrink-0 p-6 border-l border-[color:var(--border-soft)]">
          <div className="sticky top-6">
            {/* Selected Game Info */}
            <div className="mb-4 p-4 bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: selectedGame.team1.color }}
                >
                  {selectedGame.team1.abbr}
                </div>
                <div>
                  <div className="font-semibold">
                    {selectedGame.team1.name} vs {selectedGame.team2.name}
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-500">
                    {selectedGame.team1.name}
                  </span>
                </div>
              </div>
            </div>

            <TradePanel market={formattedMarket} />
          </div>
        </div>
      </div>

      <MainFooter />
    </div>
  );
}
