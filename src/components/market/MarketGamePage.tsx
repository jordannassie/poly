"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { TopNav } from "@/components/TopNav";
import { SportsSidebar } from "@/components/SportsSidebar";
import { MainFooter } from "@/components/MainFooter";
import { HeadToHeadChart } from "@/components/HeadToHeadChart";
import { MobileBetBar } from "@/components/MobileBetBar";
import { TeamOutcomeButton, TeamOutcomeButtonPair } from "@/components/market/TeamOutcomeButton";
import { MarketComments } from "@/components/market/MarketComments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatVolume, getWhyMovingReasons } from "@/lib/marketHelpers";
import { MarketViewModel } from "@/lib/adapters/marketViewModel";
import { mapMarketOutcomesToTeams, teamToYesNo } from "@/lib/market/outcomeMapping";
import {
  Settings,
  Code,
  Bookmark,
  Share2,
  Heart,
  MoreHorizontal,
  ChevronRight,
  ChevronDown,
  Clock,
  Users,
  Zap,
  TrendingUp,
  Sparkles,
  ImageIcon,
  Lock,
} from "lucide-react";

// Countdown hook for trading lock-in time
function useCountdown(targetDate: Date | undefined) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    total: 0,
  });

  useEffect(() => {
    if (!targetDate) return;

    const calculateTimeLeft = () => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();

      if (diff <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
      }

      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
        total: diff,
      };
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  return timeLeft;
}

// Countdown Timer component for game pages
function LocksInCountdown({ targetDate, status }: { targetDate: Date | undefined; status?: string }) {
  const timeLeft = useCountdown(targetDate);
  
  // If game is live or finished, show appropriate message
  if (status === "in_progress") {
    return (
      <div className="flex items-center justify-center gap-2 py-3 px-4 bg-red-500/10 border border-red-500/30 rounded-xl">
        <div className="relative">
          <Lock className="h-5 w-5 text-red-500" />
          <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full animate-ping" />
        </div>
        <span className="text-red-500 font-semibold">TRADING LOCKED - Game In Progress</span>
      </div>
    );
  }
  
  if (status === "final" || status === "canceled" || status === "postponed") {
    return (
      <div className="flex items-center justify-center gap-2 py-3 px-4 bg-gray-500/10 border border-gray-500/30 rounded-xl">
        <Lock className="h-5 w-5 text-gray-500" />
        <span className="text-gray-500 font-semibold">
          {status === "final" ? "TRADING CLOSED - Game Finished" : `TRADING CLOSED - Game ${status.charAt(0).toUpperCase() + status.slice(1)}`}
        </span>
      </div>
    );
  }
  
  // If countdown is done but game not started yet
  if (timeLeft.total <= 0) {
    return (
      <div className="flex items-center justify-center gap-2 py-3 px-4 bg-orange-500/10 border border-orange-500/30 rounded-xl animate-pulse">
        <Lock className="h-5 w-5 text-orange-500" />
        <span className="text-orange-500 font-semibold">LOCKING SOON!</span>
      </div>
    );
  }

  const isUrgent = timeLeft.days === 0 && timeLeft.hours < 6;
  
  return (
    <div className={`rounded-xl border ${isUrgent ? "bg-orange-500/10 border-orange-500/30" : "bg-[color:var(--surface)] border-[color:var(--border-soft)]"} p-4`}>
      <div className="flex items-center justify-center gap-2 mb-3">
        <Lock className={`h-4 w-4 ${isUrgent ? "text-orange-500" : "text-[color:var(--text-muted)]"}`} />
        <span className={`text-sm font-medium ${isUrgent ? "text-orange-500" : "text-[color:var(--text-muted)]"}`}>
          Trading Locks In
        </span>
        {isUrgent && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-500 animate-pulse">HURRY!</span>}
      </div>
      <div className="flex items-center justify-center gap-2 md:gap-3">
        {timeLeft.days > 0 && (
          <>
            <div className="flex flex-col items-center">
              <div className={`text-2xl md:text-3xl font-bold tabular-nums ${isUrgent ? "text-orange-500" : "text-[color:var(--text-strong)]"}`}>
                {timeLeft.days.toString().padStart(2, "0")}
              </div>
              <div className="text-[10px] md:text-xs text-[color:var(--text-subtle)] uppercase">Days</div>
            </div>
            <span className={`text-xl md:text-2xl font-light ${isUrgent ? "text-orange-500/50" : "text-[color:var(--text-subtle)]"}`}>:</span>
          </>
        )}
        <div className="flex flex-col items-center">
          <div className={`text-2xl md:text-3xl font-bold tabular-nums ${isUrgent ? "text-orange-500" : "text-[color:var(--text-strong)]"}`}>
            {timeLeft.hours.toString().padStart(2, "0")}
          </div>
          <div className="text-[10px] md:text-xs text-[color:var(--text-subtle)] uppercase">Hrs</div>
        </div>
        <span className={`text-xl md:text-2xl font-light ${isUrgent ? "text-orange-500/50" : "text-[color:var(--text-subtle)]"}`}>:</span>
        <div className="flex flex-col items-center">
          <div className={`text-2xl md:text-3xl font-bold tabular-nums ${isUrgent ? "text-orange-500" : "text-[color:var(--text-strong)]"}`}>
            {timeLeft.minutes.toString().padStart(2, "0")}
          </div>
          <div className="text-[10px] md:text-xs text-[color:var(--text-subtle)] uppercase">Min</div>
        </div>
        <span className={`text-xl md:text-2xl font-light ${isUrgent ? "text-orange-500/50 animate-pulse" : "text-[color:var(--text-subtle)]"}`}>:</span>
        <div className="flex flex-col items-center">
          <div className={`text-2xl md:text-3xl font-bold tabular-nums ${isUrgent ? "text-orange-500 animate-pulse" : "text-[color:var(--text-strong)]"}`}>
            {timeLeft.seconds.toString().padStart(2, "0")}
          </div>
          <div className="text-[10px] md:text-xs text-[color:var(--text-subtle)] uppercase">Sec</div>
        </div>
      </div>
    </div>
  );
}
import { PicksCardModal } from "@/components/picks-card/PicksCardModal";
import { PicksCard, type PicksCardData } from "@/components/picks-card/PicksCard";

// User type for picks card
interface UserProfile {
  id: string;
  username: string | null;
  display_name: string | null;
}

// Format number with commas and 2 decimal places
const formatCurrency = (value: number): string => {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Format number with commas (no decimals for display while typing)
const formatWithCommas = (value: number): string => {
  return value.toLocaleString("en-US");
};

interface MarketGamePageProps {
  market: MarketViewModel;
}

export function MarketGamePage({ market }: MarketGamePageProps) {
  // Trade panel state
  const [tradeAmount, setTradeAmount] = useState(0);
  const [selectedTeam, setSelectedTeam] = useState<"teamA" | "teamB">("teamA");
  
  // Picks Card modal state
  const [picksCardOpen, setPicksCardOpen] = useState(false);
  
  // User state for picks card
  const [userHandle, setUserHandle] = useState<string>("Guest");
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);
  
  // Fetch logged-in user
  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/me");
        const data = await res.json();
        if (data.user) {
          // Use username, then display_name, fallback to Guest
          const handle = data.user.username || data.user.display_name || "Guest";
          setUserHandle(handle);
          // Set avatar URL if available
          if (data.user.avatar_url) {
            setUserAvatarUrl(data.user.avatar_url);
          }
        }
      } catch {
        // Keep Guest if fetch fails
      }
    }
    fetchUser();
  }, []);

  const { team1, team2, league, stats, lines, volume, locksInLabel: locksIn } = market;

  // Map teams to consistent outcome format
  const outcomes = mapMarketOutcomesToTeams(market);
  
  // Get selected team data
  const selectedTeamData = selectedTeam === "teamA" ? team1 : team2;
  const selectedPrice = selectedTeam === "teamA" ? team1.odds : team2.odds;

  // Get "Why moving" reasons
  const whyMovingReasons = getWhyMovingReasons(market.slug);

  // Compute volume percentages for different bet types
  const volumeNum = parseFloat(volume.replace(/[^0-9.]/g, "")) || 4;
  const volumeMultiplier = volume.includes("M") ? 1000000 : volume.includes("K") ? 1000 : 1;
  const totalVolume = volumeNum * volumeMultiplier;

  return (
    <div className="min-h-screen bg-[color:var(--app-bg)] text-[color:var(--text-strong)]">
      <TopNav />

      <div className="flex flex-col lg:flex-row">
        {/* Sidebar */}
        <SportsSidebar activeSport={league} />

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-4xl">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-[color:var(--text-muted)] mb-4">
              <Link href="/" className="hover:text-[color:var(--text-strong)]">
                Home
              </Link>
              <ChevronRight className="h-4 w-4" />
              <Link href={`/sports?league=${league}`} className="hover:text-[color:var(--text-strong)]">
                {league.toUpperCase()}
              </Link>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 md:mb-6">
              <h1 className="text-xl md:text-2xl font-bold">{market.title}</h1>
              <div className="flex items-center gap-1 md:gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 md:h-9 md:w-9">
                  <Settings className="h-4 w-4 md:h-5 md:w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 md:h-9 md:w-9">
                  <Code className="h-4 w-4 md:h-5 md:w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 md:h-9 md:w-9">
                  <Bookmark className="h-4 w-4 md:h-5 md:w-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 md:h-9 md:w-9"
                  onClick={() => setPicksCardOpen(true)}
                  title="Create Picks Card"
                >
                  <ImageIcon className="h-4 w-4 md:h-5 md:w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 md:h-9 md:w-9">
                  <Share2 className="h-4 w-4 md:h-5 md:w-5" />
                </Button>
              </div>
            </div>

            {/* Locks In Countdown Timer */}
            <div className="mb-4 md:mb-6">
              <LocksInCountdown targetDate={market.startTime} status={market.status} />
            </div>

            {/* Head to Head Chart */}
            <HeadToHeadChart
              team1={{ 
                name: team1.name, 
                abbr: team1.abbr, 
                odds: team1.odds, 
                color: team1.color, 
                record: team1.record || "",
                logoUrl: team1.logoUrl 
              }}
              team2={{ 
                name: team2.name, 
                abbr: team2.abbr, 
                odds: team2.odds, 
                color: team2.color, 
                record: team2.record || "",
                logoUrl: team2.logoUrl 
              }}
              gameTime={`Locks in: ${locksIn || "TBD"}`}
              volume={volume}
            />

            {/* Betting Options */}
            <div className="mt-4 md:mt-6 space-y-3 md:space-y-4">
              {/* Moneyline */}
              <div className="bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl p-3 md:p-4">
                <div className="flex items-center justify-between mb-2 md:mb-3">
                  <div>
                    <div className="font-semibold text-sm md:text-base">Moneyline</div>
                    <div className="text-xs md:text-sm text-[color:var(--text-subtle)]">{formatVolume(totalVolume * 0.4)} Vol.</div>
                  </div>
                </div>
                <TeamOutcomeButtonPair
                  teamA={outcomes.teamA}
                  teamB={outcomes.teamB}
                  priceA={outcomes.priceA}
                  priceB={outcomes.priceB}
                  selectedTeam={null}
                  onSelectTeam={(team) => setSelectedTeam(team)}
                />
              </div>

              {/* Spreads */}
              <div className="bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl p-3 md:p-4">
                <div className="flex items-center justify-between mb-2 md:mb-3">
                  <div>
                    <div className="font-semibold text-sm md:text-base">Spreads</div>
                    <div className="text-xs md:text-sm text-[color:var(--text-subtle)]">{formatVolume(totalVolume * 0.3)} Vol.</div>
                  </div>
                </div>
                <div className="flex gap-2 md:gap-3">
                  <div className="flex-1 flex items-center justify-between px-3 md:px-4 py-2.5 md:py-3 bg-[color:var(--surface-2)] rounded-lg cursor-pointer hover:bg-[color:var(--surface-3)] transition">
                    <span className="text-xs md:text-sm text-[color:var(--text-muted)]">{team1.abbr} {lines.spread?.team1Line || "-4.5"}</span>
                    <span className="font-semibold text-sm md:text-base">{lines.spread?.team1Odds || 51}¢</span>
                  </div>
                  <div className="flex-1 flex items-center justify-between px-3 md:px-4 py-2.5 md:py-3 bg-[color:var(--surface-2)] rounded-lg cursor-pointer hover:bg-[color:var(--surface-3)] transition">
                    <span className="text-xs md:text-sm text-[color:var(--text-muted)]">{team2.abbr} {lines.spread?.team2Line || "+4.5"}</span>
                    <span className="font-semibold text-sm md:text-base">{lines.spread?.team2Odds || 50}¢</span>
                  </div>
                </div>
              </div>

              {/* Totals */}
              <div className="bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl p-3 md:p-4">
                <div className="flex items-center justify-between mb-2 md:mb-3">
                  <div>
                    <div className="font-semibold text-sm md:text-base">Totals</div>
                    <div className="text-xs md:text-sm text-[color:var(--text-subtle)]">{formatVolume(totalVolume * 0.2)} Vol.</div>
                  </div>
                </div>
                <div className="flex gap-2 md:gap-3">
                  <div className="flex-1 flex items-center justify-between px-3 md:px-4 py-2.5 md:py-3 bg-[color:var(--surface-2)] rounded-lg cursor-pointer hover:bg-[color:var(--surface-3)] transition">
                    <span className="text-xs md:text-sm text-[color:var(--text-muted)]">Over {lines.total?.over || 46.5}</span>
                    <span className="font-semibold text-sm md:text-base">{lines.total?.overOdds || 47}¢</span>
                  </div>
                  <div className="flex-1 flex items-center justify-between px-3 md:px-4 py-2.5 md:py-3 bg-[color:var(--surface-2)] rounded-lg cursor-pointer hover:bg-[color:var(--surface-3)] transition">
                    <span className="text-xs md:text-sm text-[color:var(--text-muted)]">Under {lines.total?.under || 46.5}</span>
                    <span className="font-semibold text-sm md:text-base">{lines.total?.underOdds || 54}¢</span>
                  </div>
                </div>
              </div>

              {/* Why This Market is Moving */}
              <div className="bg-gradient-to-r from-[color:var(--surface)] to-[color:var(--surface-2)] border border-purple-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  <div className="font-semibold">Why this market is moving</div>
                  <span className="ml-auto text-xs text-[color:var(--text-subtle)] flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Updated just now
                  </span>
                </div>
                <ul className="space-y-2">
                  {whyMovingReasons.map((reason, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-[color:var(--text-muted)]">
                      <TrendingUp className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>

            {/* Comments */}
            <MarketComments marketSlug={market.slug} league={league} />
          </div>
        </main>

        {/* Trade Panel - Right Side on desktop, below content on mobile */}
        <div className="w-full lg:w-80 flex-shrink-0 p-4 md:p-6 lg:border-l border-t lg:border-t-0 border-[color:var(--border-soft)]">
          <div className="lg:sticky lg:top-6 max-w-md mx-auto lg:max-w-none">
            {/* Selected Market Info */}
            <div className="mb-4 p-4 bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold overflow-hidden"
                  style={{ backgroundColor: team1.color }}
                >
                  {team1.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={team1.logoUrl} 
                      alt={team1.name}
                      className="w-9 h-9 object-contain"
                      loading="lazy"
                    />
                  ) : (
                    team1.abbr
                  )}
                </div>
                <div>
                  <div className="font-semibold">{market.title}</div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-500">
                    {team1.name}
                  </span>
                </div>
              </div>

              {/* Urgency Indicators */}
              <div className="space-y-2 pt-3 border-t border-[color:var(--border-soft)]">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-[color:var(--text-muted)]">
                    <Clock className="h-4 w-4 text-orange-500" />
                    Locks in
                  </span>
                  <span className="font-semibold text-orange-500">{locksIn || "TBD"}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-[color:var(--text-muted)]">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    Traded today
                  </span>
                  <span className="font-semibold">{stats.tradedToday}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-[color:var(--text-muted)]">
                    <Users className="h-4 w-4 text-blue-500" />
                    Active bettors
                  </span>
                  <span className="font-semibold">{stats.activeBettors}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-[color:var(--text-muted)]">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    Last 10 min
                  </span>
                  <span className="font-semibold text-green-500">{stats.last10Min}</span>
                </div>
              </div>
            </div>

            {/* Buy/Sell Toggle */}
            <div className="bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl p-4">
              <div className="flex gap-2 mb-4">
                <Button className="flex-1 bg-[color:var(--surface-2)]" variant="ghost">
                  Buy
                </Button>
                <Button className="flex-1" variant="ghost">
                  Sell
                </Button>
                <Button variant="ghost" size="sm" className="text-xs">
                  Market ▾
                </Button>
              </div>

              {/* Team Selection */}
              <div className="mb-4">
                <TeamOutcomeButtonPair
                  teamA={outcomes.teamA}
                  teamB={outcomes.teamB}
                  priceA={outcomes.priceA}
                  priceB={outcomes.priceB}
                  selectedTeam={selectedTeam}
                  onSelectTeam={setSelectedTeam}
                  compact
                />
              </div>

              {/* Amount */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[color:var(--text-muted)]">Amount</span>
                  <span className="text-sm text-[color:var(--text-subtle)]">Balance $0.00</span>
                </div>
                <div className="relative mb-3">
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 text-3xl font-bold text-[color:var(--text-strong)]">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={tradeAmount === 0 ? "" : formatWithCommas(tradeAmount)}
                    onChange={(e) => {
                      const value = e.target.value.replace(/,/g, "");
                      setTradeAmount(Number(value) || 0);
                    }}
                    placeholder="0"
                    className="w-full text-4xl font-bold text-right text-[color:var(--text-strong)] py-1 pl-8 bg-transparent border-none outline-none focus:ring-0"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 border-[color:var(--border-soft)]" onClick={() => setTradeAmount(prev => prev + 1)}>+$1</Button>
                  <Button size="sm" variant="outline" className="flex-1 border-[color:var(--border-soft)]" onClick={() => setTradeAmount(prev => prev + 20)}>+$20</Button>
                  <Button size="sm" variant="outline" className="flex-1 border-[color:var(--border-soft)]" onClick={() => setTradeAmount(prev => prev + 100)}>+$100</Button>
                  <Button size="sm" variant="outline" className="flex-1 border-[color:var(--border-soft)]" onClick={() => setTradeAmount(10000)}>Max</Button>
                </div>
              </div>

              {/* Odds and Payout */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[color:var(--text-muted)]">Implied chance</span>
                  <span className="text-sm font-semibold text-[color:var(--text-strong)]">
                    {selectedPrice}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-sm text-[color:var(--text-muted)]">
                    <span>Payout if {selectedTeamData.name} wins</span>
                    <ChevronDown className="h-3 w-3" />
                  </div>
                  <span className="text-xl font-bold text-green-500">
                    ${formatCurrency(tradeAmount > 0 ? tradeAmount * (100 / selectedPrice) : 0)}
                  </span>
                </div>
              </div>

              {/* Sign Up to Trade */}
              <Button className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold">
                Sign up to trade
              </Button>

              <p className="text-xs text-center text-[color:var(--text-subtle)] mt-3">
                By trading, you agree to the Terms of Use.
              </p>
            </div>

            {/* My Pick Preview Card */}
            <div className="mt-4 bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-[color:var(--text-strong)]">My Pick Preview</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPicksCardOpen(true)}
                  className="text-orange-500 hover:text-orange-400 hover:bg-orange-500/10 text-xs"
                >
                  <Share2 className="h-3 w-3 mr-1" />
                  Share Pick
                </Button>
              </div>
              <PicksCard
                compact
                data={{
                  league,
                  eventTitle: market.title,
                  teamA: {
                    name: team1.name,
                    abbr: team1.abbr,
                    logoUrl: team1.logoUrl || null,
                    odds: team1.odds,
                    color: team1.color,
                  },
                  teamB: {
                    name: team2.name,
                    abbr: team2.abbr,
                    logoUrl: team2.logoUrl || null,
                    odds: team2.odds,
                    color: team2.color,
                  },
                  selectedTeam,
                  locksIn: locksIn || "TBD",
                  userHandle,
                  userAvatarUrl,
                  statLine: undefined,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bet Bar */}
      <MobileBetBar 
        team1={{ 
          name: team1.name, 
          abbr: team1.abbr, 
          odds: team1.odds, 
          color: team1.color,
          logoUrl: team1.logoUrl,
        }} 
        team2={{ 
          name: team2.name, 
          abbr: team2.abbr, 
          odds: team2.odds, 
          color: team2.color,
          logoUrl: team2.logoUrl,
        }} 
      />

      <MainFooter />

      {/* Picks Card Modal */}
      <PicksCardModal
        open={picksCardOpen}
        onOpenChange={setPicksCardOpen}
        data={{
          league,
          eventTitle: market.title,
          teamA: {
            name: team1.name,
            abbr: team1.abbr,
            logoUrl: team1.logoUrl || null,
            odds: team1.odds,
            color: team1.color,
          },
          teamB: {
            name: team2.name,
            abbr: team2.abbr,
            logoUrl: team2.logoUrl || null,
            odds: team2.odds,
            color: team2.color,
          },
          selectedTeam,
          locksIn: locksIn || "TBD",
          userHandle,
          userAvatarUrl,
          statLine: undefined,
          // Receipt card data (only shown when user enters amount)
          amount: tradeAmount > 0 ? tradeAmount : undefined,
          potentialPayout: tradeAmount > 0 ? tradeAmount * (100 / selectedPrice) : undefined,
        }}
      />
    </div>
  );
}
