"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { TopNav } from "@/components/TopNav";
import { CategoryTabs } from "@/components/CategoryTabs";
import { MainFooter } from "@/components/MainFooter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { leaderboard, biggestWins } from "@/lib/mockData";
import { Search, ChevronDown, Trophy, TrendingUp, ArrowRight } from "lucide-react";

const timeFilters = ["Today", "Weekly", "Monthly", "All"];

interface CurrentUser {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export default function LeaderboardPage() {
  const [activeFilter, setActiveFilter] = useState("Today");
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/me");
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setCurrentUser(data.user);
          }
        }
      } catch {
        // Not logged in
      }
    };
    fetchUser();
  }, []);

  const getInitials = (name: string | null, username: string | null): string => {
    const displayName = name || username || "U";
    return displayName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-[color:var(--app-bg)] text-[color:var(--text-strong)]">
      <TopNav />
      <CategoryTabs activeLabel="Trending" />
      <main className="mx-auto w-full max-w-6xl px-4 py-4 md:py-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6 flex items-center gap-2 md:gap-3">
          <Trophy className="h-6 w-6 md:h-8 md:w-8 text-white/60" />
          Leaderboard
        </h1>

        <div className="grid gap-4 md:gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* Main Leaderboard */}
          <div className="space-y-3 md:space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-4">
              <div className="flex rounded-lg bg-[color:var(--surface)] border border-[color:var(--border-soft)] p-1 overflow-x-auto">
                {timeFilters.map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm rounded-md transition whitespace-nowrap ${
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
                className="sm:ml-auto border-[color:var(--border-soft)] bg-[color:var(--surface)] text-[color:var(--text-strong)] text-xs md:text-sm h-8 md:h-9"
              >
                All Categories
                <ChevronDown className="ml-1 md:ml-2 h-3 w-3 md:h-4 md:w-4" />
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

            {/* Table Header - Hidden on mobile */}
            <div className="hidden md:grid grid-cols-[auto_1fr_auto_auto] gap-4 px-4 text-sm text-[color:var(--text-muted)] border-b border-[color:var(--border-soft)] pb-2">
              <span className="w-8"></span>
              <span></span>
              <span className="text-right">Profit/Loss</span>
              <span className="text-right w-28">Volume</span>
            </div>

            {/* Leaderboard Rows */}
            <div className="space-y-2">
              {leaderboard.map((trader) => (
                <Link
                  key={trader.rank}
                  href={`/u/${trader.name.toLowerCase()}`}
                  className="block"
                >
                  <Card
                    className={`bg-[color:var(--surface)] border-[color:var(--border-soft)] hover:border-[color:var(--border-strong)] transition cursor-pointer ${
                      trader.rank <= 3 ? "border-l-4 border-l-yellow-500" : ""
                    }`}
                  >
                    {/* Mobile Layout */}
                    <CardContent className="p-3 md:hidden">
                      <div className="flex items-center gap-3">
                        <span className="w-6 text-center font-bold text-sm text-[color:var(--text-muted)]">
                          {trader.rank}
                        </span>
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-neutral-500 to-neutral-700 flex items-center justify-center text-sm">
                          {trader.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-sm truncate block hover:text-white transition">
                            {trader.name}
                          </span>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-green-500 font-medium">{trader.profit}</span>
                            <span className="text-[color:var(--text-muted)]">{trader.volume}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    {/* Desktop Layout */}
                    <CardContent className="hidden md:grid p-4 grid-cols-[auto_1fr_auto_auto] gap-4 items-center">
                      <span className="w-8 text-center font-bold text-[color:var(--text-muted)]">
                        {trader.rank}
                      </span>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-neutral-500 to-neutral-700 flex items-center justify-center text-lg">
                          {trader.avatar}
                        </div>
                        <span className="font-semibold hover:text-white transition">
                          {trader.name}
                        </span>
                      </div>
                      <span className="text-right font-semibold text-green-500">
                        {trader.profit}
                      </span>
                      <span className="text-right w-28 text-[color:var(--text-muted)]">
                        {trader.volume}
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Your Position */}
            {currentUser && (
              <Card className="bg-[color:var(--surface)] border-[color:var(--border-soft)] border-2 border-dashed">
                {/* Mobile */}
                <CardContent className="p-3 md:hidden">
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center font-bold text-sm text-[color:var(--text-muted)]">—</span>
                    {currentUser.avatar_url ? (
                      <img 
                        src={currentUser.avatar_url} 
                        alt="You" 
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-neutral-500 to-neutral-700 flex items-center justify-center text-white font-bold text-xs">
                        {getInitials(currentUser.display_name, currentUser.username)}
                      </div>
                    )}
                    <span className="font-semibold text-sm">{currentUser.display_name || currentUser.username || "You"} (You)</span>
                  </div>
                </CardContent>
                {/* Desktop */}
                <CardContent className="hidden md:grid p-4 grid-cols-[auto_1fr_auto_auto] gap-4 items-center">
                  <span className="w-8 text-center font-bold text-[color:var(--text-muted)]">
                    —
                  </span>
                  <div className="flex items-center gap-3">
                    {currentUser.avatar_url ? (
                      <img 
                        src={currentUser.avatar_url} 
                        alt="You" 
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-neutral-500 to-neutral-700 flex items-center justify-center text-white font-bold text-sm">
                        {getInitials(currentUser.display_name, currentUser.username)}
                      </div>
                    )}
                    <span className="font-semibold">{currentUser.display_name || currentUser.username || "You"} (You)</span>
                  </div>
                  <span className="text-right text-[color:var(--text-muted)]">—</span>
                  <span className="text-right w-28 text-[color:var(--text-muted)]">—</span>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Biggest Wins Sidebar */}
          <aside>
            <Card className="bg-[color:var(--surface)] border-[color:var(--border-soft)] overflow-hidden sticky top-4">
              <div className="bg-white/5 p-4 border-b border-[color:var(--border-soft)]">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-white/60" />
                  <span className="text-lg font-bold">Biggest wins today</span>
                </div>
              </div>
              <CardContent className="p-0">
                {biggestWins.map((win) => (
                  <Link
                    key={`${win.name}-${win.rank}`}
                    href={`/u/${win.name.toLowerCase()}`}
                    className="flex items-center gap-3 p-4 border-b border-[color:var(--border-soft)] last:border-b-0 hover:bg-[color:var(--surface-2)] transition cursor-pointer"
                  >
                    <span className="w-6 text-center text-sm text-[color:var(--text-muted)]">
                      {win.rank}
                    </span>
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-neutral-500 to-neutral-700 flex items-center justify-center text-xs">
                      🏆
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">
                        <span className="hover:text-white transition">{win.name}</span>{" "}
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
                  </Link>
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
