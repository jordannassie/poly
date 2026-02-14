"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { TopNav } from "@/components/TopNav";
import { CategoryTabs } from "@/components/CategoryTabs";
import { MainFooter } from "@/components/MainFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getDemoBets, DemoBet } from "@/lib/demoAuth";
import { Search, ArrowUpRight, ChevronDown, Wallet, Loader2, Coins, DollarSign, Eye } from "lucide-react";
import { LightningLoader } from "@/components/ui/LightningLoader";
import Link from "next/link";
import { refreshCoinBalance } from "@/lib/coins/coinBalanceStore";

interface CoinPosition {
  id: string;
  market_id: string;
  side: string;
  amount_coins: number;
  status: string;
  created_at: string;
  meta?: {
    market_title?: string | null;
    market_slug?: string | null;
  };
}

interface CoinLedgerEntry {
  id: string;
  amount: number;
  entry_type: string;
  ref_type: string | null;
  ref_id: string | null;
  meta?: {
    market_title?: string | null;
    market_slug?: string | null;
  };
  created_at: string;
}

const timeRanges = ["1D", "1W", "1M", "ALL"];

const getStoredMode = (): "coin" | "cash" => {
  if (typeof window === "undefined") {
    return "coin";
  }
  const stored = (window.__provepicksMode as "coin" | "cash" | undefined) ?? window.localStorage.getItem("provepicks:mode");
  return stored === "cash" ? "cash" : "coin";
};

export default function PortfolioPage() {
  const [activeRange, setActiveRange] = useState("1M");
  const [activeTab, setActiveTab] = useState("positions");
  const [bets, setBets] = useState<DemoBet[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [coinPositions, setCoinPositions] = useState<CoinPosition[]>([]);
  const [coinHistory, setCoinHistory] = useState<CoinLedgerEntry[]>([]);
  const [positionsLoading, setPositionsLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mode, setMode] = useState<"coin" | "cash">("coin");
  const positionsController = useRef<AbortController | null>(null);
  const historyController = useRef<AbortController | null>(null);

  // Load stored mode preference on mount
  useEffect(() => {
    setMode(getStoredMode());
  }, []);

  const fetchPositions = useCallback(async () => {
    if (!isLoggedIn || mode !== "coin") {
      setCoinPositions([]);
      setPositionsLoading(false);
      return;
    }

    positionsController.current?.abort();
    const controller = new AbortController();
    positionsController.current = controller;
    setPositionsLoading(true);

    try {
      const res = await fetch("/api/coins/positions", { signal: controller.signal });
      if (res.status === 401) {
        setCoinPositions([]);
        return;
      }
      if (!res.ok) {
        throw new Error("Failed to load positions");
      }
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setCoinPositions(data.positions || []);
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        console.error("Failed to fetch coin positions:", error);
      }
    } finally {
      setPositionsLoading(false);
    }
  }, [isLoggedIn, mode]);

  const fetchHistory = useCallback(async () => {
    if (!isLoggedIn || mode !== "coin") {
      setCoinHistory([]);
      setHistoryLoading(false);
      return;
    }

    historyController.current?.abort();
    const controller = new AbortController();
    historyController.current = controller;
    setHistoryLoading(true);

    try {
      const res = await fetch("/api/coins/ledger", { signal: controller.signal });
      if (res.status === 401) {
        setCoinHistory([]);
        return;
      }
      if (!res.ok) {
        throw new Error("Failed to load ledger");
      }
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setCoinHistory(data.entries || []);
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        console.error("Failed to fetch coin ledger:", error);
      }
    } finally {
      setHistoryLoading(false);
    }
  }, [isLoggedIn, mode]);

  const handleRefresh = useCallback(() => {
    if (!isLoggedIn || mode !== "coin") return;
    setIsRefreshing(true);
    Promise.all([fetchPositions(), fetchHistory()])
      .finally(() => {
        refreshCoinBalance();
        setIsRefreshing(false);
      });
  }, [isLoggedIn, fetchPositions, fetchHistory, mode]);

  useEffect(() => {
    // Check auth status via /api/me
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/me");
        const data = await res.json();
        setIsLoggedIn(data.authType !== "none" && data.user !== null);
      } catch {
        setIsLoggedIn(false);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
    setBets(getDemoBets());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent)?.detail;
      const incoming = detail?.mode ?? window.__provepicksMode;
      if (incoming === "coin" || incoming === "cash") {
        setMode(incoming);
      }
    };
    window.addEventListener("provepicks:mode-change", handler as EventListener);
    return () => {
      window.removeEventListener("provepicks:mode-change", handler as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!isLoggedIn || mode !== "coin") {
      setCoinPositions([]);
      setCoinHistory([]);
      return;
    }

    fetchPositions();
    fetchHistory();
  }, [isLoggedIn, fetchPositions, fetchHistory, mode]);

  useEffect(() => {
    return () => {
      positionsController.current?.abort();
      historyController.current?.abort();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[color:var(--app-bg)] text-[color:var(--text-strong)]">
        <TopNav />
        <CategoryTabs activeLabel="Trending" />
        <main className="mx-auto w-full max-w-4xl px-4 py-12 text-center">
          <LightningLoader size="md" text="Loading..." />
        </main>
        <MainFooter />
      </div>
    );
  }

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
          <Button 
            className="bg-orange-500 hover:bg-orange-600 text-white"
            onClick={() => window.location.href = "/"}
          >
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
        {/* Mode Toggle */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Portfolio</h1>
          <div className="flex items-center gap-2 rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface)] p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode("coin");
                localStorage.setItem("provepicks:mode", "coin");
                window.dispatchEvent(new Event("provepicks:mode-change"));
              }}
              className={`flex items-center gap-2 rounded-full px-4 py-1.5 transition ${
                mode === "coin"
                  ? "bg-orange-500 text-white"
                  : "bg-transparent text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)]"
              }`}
            >
              <Coins className="h-3.5 w-3.5" />
              Coin
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("cash");
                localStorage.setItem("provepicks:mode", "cash");
                window.dispatchEvent(new Event("provepicks:mode-change"));
              }}
              className={`flex items-center gap-2 rounded-full px-4 py-1.5 transition ${
                mode === "cash"
                  ? "bg-orange-500 text-white"
                  : "bg-transparent text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)]"
              }`}
            >
              <DollarSign className="h-3.5 w-3.5" />
              Cash
            </button>
          </div>
        </div>

        {/* Cash Mode Coming Soon */}
        {mode === "cash" && (
          <div className="mb-6 rounded-xl border border-orange-500/30 bg-orange-500/10 p-4 text-center">
            <DollarSign className="h-8 w-8 mx-auto mb-2 text-orange-400" />
            <h3 className="font-semibold text-orange-400 mb-1">Cash Mode Coming Soon</h3>
            <p className="text-sm text-[color:var(--text-muted)]">
              Real money trading will be available soon. Switch to Coin mode to practice with free coins.
            </p>
          </div>
        )}

        {/* Portfolio Stats */}
        <div className="grid gap-4 md:gap-6 md:grid-cols-2 mb-6 md:mb-8">
          {/* Portfolio Value Card */}
          <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface)] p-4 md:p-6">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="flex items-center gap-2 text-[color:var(--text-muted)] text-sm md:text-base">
                {mode === "coin" ? (
                  <>
                    <Coins className="h-4 w-4" />
                    <span>Coin Portfolio</span>
                  </>
                ) : (
                  <>
                    <DollarSign className="h-4 w-4" />
                    <span>Cash Portfolio</span>
                  </>
                )}
                <Eye className="h-3.5 w-3.5" />
              </div>
              <div className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 rounded-full bg-green-500/20 text-green-500 text-xs md:text-sm">
                <Wallet className="h-3.5 w-3.5 md:h-4 md:w-4" />
                {mode === "coin" ? "0 coins" : "$0.00"}
              </div>
            </div>
            <div className="text-3xl md:text-4xl font-bold mb-1">
              {mode === "coin" ? "0 coins" : "$0.00"}
            </div>
            <div className="text-xs md:text-sm text-[color:var(--text-muted)]">
              {mode === "coin" ? "Paper Trading" : "Live Trading"}
            </div>
            <Button
              variant="outline"
              className="w-full mt-4 md:mt-6 border-[color:var(--border-soft)] gap-2 text-sm h-9 md:h-10"
              disabled={mode === "cash"}
            >
              <ArrowUpRight className="h-4 w-4" />
              {mode === "coin" ? "Get More Coins" : "Withdraw"}
            </Button>
          </div>

          {/* Profit/Loss Card */}
          <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface)] p-4 md:p-6">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="flex items-center gap-2 text-[color:var(--text-muted)] text-sm md:text-base">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                {mode === "coin" ? "Practice P/L" : "Real P/L"}
              </div>
              <div className="flex gap-1">
                {timeRanges.map((range) => (
                  <button
                    key={range}
                    onClick={() => setActiveRange(range)}
                    className={`px-1.5 md:px-2 py-0.5 md:py-1 text-xs rounded ${
                      activeRange === range
                        ? "bg-orange-500 text-white"
                        : "text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)]"
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-3xl md:text-4xl font-bold mb-1">
              {mode === "coin" ? "0 coins" : "$0.00"}
            </div>
            <div className="text-xs md:text-sm text-[color:var(--text-muted)]">
              {activeRange === "1D" ? "Past Day" : activeRange === "1W" ? "Past Week" : activeRange === "1M" ? "Past Month" : "All Time"}
            </div>
            {/* Mini chart placeholder */}
            <div className="mt-3 md:mt-4 h-12 md:h-16 rounded-lg bg-gradient-to-r from-white/5 to-white/10" />
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
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="border-[color:var(--border-soft)] gap-2 text-xs md:text-sm h-9"
              >
                Current value
                <ChevronDown className="h-3 w-3 md:h-4 md:w-4" />
              </Button>
              <Button
                variant="ghost"
                className="border-[color:var(--border-soft)] gap-2 text-xs md:text-sm h-9"
                onClick={handleRefresh}
                disabled={!isLoggedIn || isRefreshing || mode !== "coin"}
              >
                {isRefreshing ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  "Refresh"
                )}
              </Button>
            </div>
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
            {activeTab === "history" ? (
              mode === "cash" ? (
                <div className="text-center py-8 md:py-12 text-[color:var(--text-muted)] text-sm">
                  Cash mode coming soon.
                </div>
              ) : historyLoading ? (
                <div className="text-center py-8 md:py-12 text-[color:var(--text-muted)] text-sm">
                  Loading history...
                </div>
              ) : coinHistory.length === 0 ? (
                <div className="text-center py-8 md:py-12 text-[color:var(--text-muted)] text-sm">
                  No ledger entries found.
                </div>
              ) : (
                <div className="space-y-3 md:space-y-4">
                  {coinHistory.map((entry) => {
                    const entryDate = new Date(entry.created_at).toLocaleString();
                    const marketTitle = entry.meta?.market_title || "";
                    const amountClass =
                      entry.amount >= 0 ? "text-green-500" : "text-red-500";
                    const amountLabel = `${entry.amount >= 0 ? "+" : ""}${entry.amount.toLocaleString()} coins`;

                    return (
                      <div
                        key={entry.id}
                        className="block md:grid md:grid-cols-4 md:gap-4 md:items-center p-3 md:p-4 rounded-xl bg-[color:var(--surface-2)] hover:bg-[color:var(--surface-3)] transition"
                      >
                        <div className="md:hidden space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-sm">{entryDate}</div>
                              <div className="text-xs text-[color:var(--text-muted)]">
                                {entry.entry_type}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`font-medium text-sm ${amountClass}`}>
                                {amountLabel}
                              </div>
                              <span className="text-[color:var(--text-muted)]">
                                {marketTitle}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="hidden md:block text-sm">{entryDate}</div>
                        <div className="hidden md:block text-sm text-[color:var(--text-muted)]">
                          {entry.entry_type}
                        </div>
                        <div className="hidden md:block text-sm">
                          <span className={`font-semibold ${amountClass}`}>
                            {amountLabel}
                          </span>
                        </div>
                        <div className="hidden md:block text-sm text-[color:var(--text-muted)]">
                          {marketTitle}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : mode === "cash" ? (
              <div className="text-center py-8 md:py-12 text-[color:var(--text-muted)] text-sm">
                Cash mode coming soon.
              </div>
            ) : (
              <>
                {positionsLoading && bets.length === 0 && coinPositions.length === 0 ? (
                  <div className="text-center py-8 md:py-12 text-[color:var(--text-muted)] text-sm">
                    Loading positions...
                  </div>
                ) : bets.length === 0 && coinPositions.length === 0 ? (
                  <div className="text-center py-8 md:py-12 text-[color:var(--text-muted)] text-sm">
                    No positions found. Start trading to build your portfolio!
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
                    {coinPositions.map((position) => {
                      const marketTitle =
                        position.meta?.market_title || position.market_id;
                      return (
                        <div
                          key={`coin-${position.id}`}
                          className="block md:grid md:grid-cols-5 md:gap-4 md:items-center p-3 md:p-4 rounded-xl bg-[color:var(--surface-2)] hover:bg-[color:var(--surface-3)] transition"
                        >
                          <div className="md:hidden space-y-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-sm">{marketTitle}</div>
                                <div className="text-xs text-[color:var(--text-muted)]">
                                  {position.status}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium text-sm">
                                  {position.amount_coins.toLocaleString()} Coins
                                </div>
                                <span className="text-xs text-[color:var(--text-muted)]">
                                  {position.side.toUpperCase()}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="hidden md:block">
                            <div className="font-medium text-sm">{marketTitle}</div>
                            <div className="text-xs text-[color:var(--text-muted)]">
                              {position.side.toUpperCase()}
                            </div>
                          </div>
                          <div className="hidden md:block text-sm text-[color:var(--text-muted)]">—</div>
                          <div className="hidden md:block text-sm">
                            {position.amount_coins.toLocaleString()} Coins
                          </div>
                          <div className="hidden md:block text-sm text-[color:var(--text-muted)]">—</div>
                          <div className="hidden md:block text-sm text-[color:var(--text-muted)]">—</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
      <MainFooter />
    </div>
  );
}
