"use client";

import { useState } from "react";
import { TopNav } from "@/components/TopNav";
import { CategoryTabs } from "@/components/CategoryTabs";
import { MainFooter } from "@/components/MainFooter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { leaderboard, biggestWins } from "@/lib/mockData";
import { Search, ChevronDown, Trophy, TrendingUp, ArrowRight } from "lucide-react";

const timeFilters = ["Today", "Weekly", "Monthly", "All"];

export default function LeaderboardPage() {
  const [activeFilter, setActiveFilter] = useState("Today");

  return (
    <div className="min-h-screen bg-[color:var(--app-bg)] text-[color:var(--text-strong)]">
      <TopNav />
      <CategoryTabs activeLabel="Trending" />
      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <h1 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <Trophy className="h-8 w-8 text-yellow-500" />
          Leaderboard
        </h1>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* Main Leaderboard */}
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex rounded-lg bg-[color:var(--surface)] border border-[color:var(--border-soft)] p-1">
                {timeFilters.map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-4 py-2 text-sm rounded-md transition ${
                      activeFilter === filter
                        ? "bg-[color:var(--surface-3)] text-[color:var(--text-strong)] font-semibold"
                        : "text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)]"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                className="ml-auto border-[color:var(--border-soft)] bg-[color:var(--surface)] text-[color:var(--text-strong)]"
              >
                All Categories
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-[color:var(--text-subtle)]" />
              <Input
                placeholder="Search by name"
                className="pl-9 bg-[color:var(--surface)] border-[color:var(--border-soft)] text-[color:var(--text-strong)]"
              />
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-4 text-sm text-[color:var(--text-muted)] border-b border-[color:var(--border-soft)] pb-2">
              <span className="w-8"></span>
              <span></span>
              <span className="text-right">Profit/Loss</span>
              <span className="text-right w-28">Volume</span>
            </div>

            {/* Leaderboard Rows */}
            <div className="space-y-2">
              {leaderboard.map((trader) => (
                <Card
                  key={trader.rank}
                  className={`bg-[color:var(--surface)] border-[color:var(--border-soft)] hover:border-[color:var(--border-strong)] transition ${
                    trader.rank <= 3 ? "border-l-4 border-l-yellow-500" : ""
                  }`}
                >
                  <CardContent className="p-4 grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center">
                    <span className="w-8 text-center font-bold text-[color:var(--text-muted)]">
                      {trader.rank}
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-lg">
                        {trader.avatar}
                      </div>
                      <span className="font-semibold">{trader.name}</span>
                    </div>
                    <span className="text-right font-semibold text-green-500">
                      {trader.profit}
                    </span>
                    <span className="text-right w-28 text-[color:var(--text-muted)]">
                      {trader.volume}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Your Position */}
            <Card className="bg-[color:var(--surface)] border-[color:var(--border-soft)] border-2 border-dashed">
              <CardContent className="p-4 grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center">
                <span className="w-8 text-center font-bold text-[color:var(--text-muted)]">
                  —
                </span>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                    DT
                  </div>
                  <span className="font-semibold">jordannase (You)</span>
                </div>
                <span className="text-right text-[color:var(--text-muted)]">—</span>
                <span className="text-right w-28 text-[color:var(--text-muted)]">—</span>
              </CardContent>
            </Card>
          </div>

          {/* Biggest Wins Sidebar */}
          <aside>
            <Card className="bg-[color:var(--surface)] border-[color:var(--border-soft)] overflow-hidden sticky top-4">
              <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 p-4 border-b border-[color:var(--border-soft)]">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  <span className="text-lg font-bold">Biggest wins today</span>
                </div>
              </div>
              <CardContent className="p-0">
                {biggestWins.map((win) => (
                  <div
                    key={`${win.name}-${win.rank}`}
                    className="flex items-center gap-3 p-4 border-b border-[color:var(--border-soft)] last:border-b-0 hover:bg-[color:var(--surface-2)] transition"
                  >
                    <span className="w-6 text-center text-sm text-[color:var(--text-muted)]">
                      {win.rank}
                    </span>
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs">
                      🟣
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">
                        {win.name}{" "}
                        <span className="text-[color:var(--text-muted)] font-normal">
                          | {win.market}
                        </span>
                      </div>
                      <div className="text-xs text-[color:var(--text-muted)] flex items-center gap-1">
                        {win.from}
                        <ArrowRight className="h-3 w-3" />
                        <span className="text-green-500 font-semibold">{win.to}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
      <MainFooter />
    </div>
  );
}
