"use client";

import { useState, useEffect } from "react";
import { TopNav } from "@/components/TopNav";
import { CategoryTabs } from "@/components/CategoryTabs";
import { MainFooter } from "@/components/MainFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getDemoUser, getDemoBets, DemoBet } from "@/lib/demoAuth";
import { Search, ArrowUpRight, ChevronDown, Wallet } from "lucide-react";
import Link from "next/link";

const timeRanges = ["1D", "1W", "1M", "ALL"];

export default function PortfolioPage() {
  const [activeRange, setActiveRange] = useState("1M");
  const [activeTab, setActiveTab] = useState("positions");
  const [bets, setBets] = useState<DemoBet[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const user = getDemoUser();
    setIsLoggedIn(!!user);
    setBets(getDemoBets());
  }, []);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[color:var(--app-bg)] text-[color:var(--text-strong)]">
        <TopNav />
        <CategoryTabs activeLabel="Trending" />
        <main className="mx-auto w-full max-w-4xl px-4 py-12 text-center">
          <Wallet className="h-16 w-16 mx-auto text-[color:var(--text-muted)] mb-4" />
          <h1 className="text-2xl font-bold mb-2">Sign in to view your portfolio</h1>
          <p className="text-[color:var(--text-muted)] mb-6">
            Track your positions, orders, and profit/loss
          </p>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            Sign In
          </Button>
        </main>
        <MainFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[color:var(--app-bg)] text-[color:var(--text-strong)]">
      <TopNav />
      <CategoryTabs activeLabel="Trending" />
      <main className="mx-auto w-full max-w-6xl px-4 py-4 md:py-6">
        {/* Portfolio Stats */}
        <div className="grid gap-4 md:gap-6 md:grid-cols-2 mb-6 md:mb-8">
          {/* Portfolio Value Card */}
          <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface)] p-4 md:p-6">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="flex items-center gap-2 text-[color:var(--text-muted)] text-sm md:text-base">
                <span>Portfolio</span>
                <span className="text-xs">👁</span>
              </div>
              <div className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 rounded-full bg-green-500/20 text-green-500 text-xs md:text-sm">
                <Wallet className="h-3.5 w-3.5 md:h-4 md:w-4" />
                $0.00
              </div>
            </div>
            <div className="text-3xl md:text-4xl font-bold mb-1">$0.00</div>
            <div className="text-xs md:text-sm text-[color:var(--text-muted)]">Today</div>
            <Button
              variant="outline"
              className="w-full mt-4 md:mt-6 border-[color:var(--border-soft)] gap-2 text-sm h-9 md:h-10"
            >
              <ArrowUpRight className="h-4 w-4" />
              Withdraw
            </Button>
          </div>

          {/* Profit/Loss Card */}
          <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface)] p-4 md:p-6">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="flex items-center gap-2 text-[color:var(--text-muted)] text-sm md:text-base">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                Profit/Loss
              </div>
              <div className="flex gap-1">
                {timeRanges.map((range) => (
                  <button
                    key={range}
                    onClick={() => setActiveRange(range)}
                    className={`px-1.5 md:px-2 py-0.5 md:py-1 text-xs rounded ${
                      activeRange === range
                        ? "bg-blue-600 text-white"
                        : "text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)]"
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-3xl md:text-4xl font-bold">$0.00</span>
              <span className="text-[color:var(--text-muted)]">ⓘ</span>
            </div>
            <div className="text-xs md:text-sm text-[color:var(--text-muted)]">Past Month</div>
            {/* Mini chart placeholder */}
            <div className="mt-3 md:mt-4 h-12 md:h-16 rounded-lg bg-gradient-to-r from-blue-500/20 to-blue-600/20" />
          </div>
        </div>

        {/* Positions Section */}
        <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface)]">
          {/* Tabs */}
          <div className="border-b border-[color:var(--border-soft)] px-4 md:px-6 pt-3 md:pt-4 overflow-x-auto">
            <div className="flex gap-4 md:gap-6">
              {["Positions", "Open orders", "History"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab.toLowerCase().replace(" ", "-"))}
                  className={`pb-3 md:pb-4 text-xs md:text-sm font-medium border-b-2 transition whitespace-nowrap ${
                    activeTab === tab.toLowerCase().replace(" ", "-")
                      ? "border-[color:var(--text-strong)] text-[color:var(--text-strong)]"
                      : "border-transparent text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Search and Filter */}
          <div className="p-3 md:p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[color:var(--text-subtle)]" />
              <Input
                placeholder="Search"
                className="pl-9 bg-[color:var(--surface-2)] border-[color:var(--border-soft)] text-sm"
              />
            </div>
            <Button
              variant="outline"
              className="border-[color:var(--border-soft)] gap-2 text-xs md:text-sm h-9"
            >
              Current value
              <ChevronDown className="h-3 w-3 md:h-4 md:w-4" />
            </Button>
          </div>

          {/* Table Header - Hidden on mobile */}
          <div className="hidden md:grid grid-cols-5 gap-4 px-6 py-3 text-xs text-[color:var(--text-muted)] uppercase border-b border-[color:var(--border-soft)]">
            <span>Market</span>
            <span>Avg → Now ⓘ</span>
            <span>Bet</span>
            <span>To Win</span>
            <span className="text-right flex items-center justify-end gap-1">
              Value <ChevronDown className="h-3 w-3" />
            </span>
          </div>

          {/* Table Body */}
          <div className="p-3 md:p-6">
            {bets.length === 0 ? (
              <div className="text-center py-8 md:py-12 text-[color:var(--text-muted)] text-sm">
                No positions found.
              </div>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {bets.map((bet) => (
                  <Link
                    key={bet.id}
                    href={`/market/${bet.marketSlug || "seahawks-vs-patriots"}`}
                    className="block md:grid md:grid-cols-5 md:gap-4 md:items-center p-3 md:p-4 rounded-xl bg-[color:var(--surface-2)] hover:bg-[color:var(--surface-3)] transition cursor-pointer"
                  >
                    {/* Mobile Layout */}
                    <div className="md:hidden space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">{bet.marketTitle}</div>
                          <div className="text-xs text-[color:var(--text-muted)]">
                            {bet.outcomeName}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-sm">${bet.amount}</div>
                          <span className={`text-xs ${bet.position === "yes" ? "text-green-500" : "text-red-500"}`}>
                            {bet.position.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-[color:var(--text-muted)]">
                        <span>{bet.price}¢ → {bet.price}¢</span>
                        <span>Win: ${bet.amount}</span>
                      </div>
                    </div>
                    {/* Desktop Layout */}
                    <div className="hidden md:block">
                      <div className="font-medium text-sm">{bet.marketTitle}</div>
                      <div className="text-xs text-[color:var(--text-muted)]">
                        {bet.outcomeName}
                      </div>
                    </div>
                    <div className="hidden md:block text-sm">
                      {bet.price}¢ → {bet.price}¢
                    </div>
                    <div className="hidden md:block text-sm">
                      <span className={bet.position === "yes" ? "text-green-500" : "text-red-500"}>
                        {bet.position.toUpperCase()}
                      </span>
                    </div>
                    <div className="hidden md:block text-sm">${bet.amount}</div>
                    <div className="hidden md:block text-right text-sm font-medium">
                      ${bet.amount}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <MainFooter />
    </div>
  );
}
