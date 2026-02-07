"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { TopNav } from "@/components/TopNav";
import { SportsSidebar } from "@/components/SportsSidebar";
import { MainFooter } from "@/components/MainFooter";
import { MobileBetBar } from "@/components/MobileBetBar";
import { TeamOutcomeButtonPair } from "@/components/market/TeamOutcomeButton";
import { MarketComments } from "@/components/market/MarketComments";
import { Button } from "@/components/ui/button";
import { MarketViewModel } from "@/lib/adapters/marketViewModel";
import { mapMarketOutcomesToTeams } from "@/lib/market/outcomeMapping";
import {
  Share2,
  ChevronRight,
  ChevronDown,
  Clock,
  Lock,
  Check,
  FileText,
  Calendar,
  AlertTriangle,
  Image as ImageIcon,
  Copy,
  CheckCircle,
  Circle,
} from "lucide-react";
import { PicksCardModal } from "@/components/picks-card/PicksCardModal";
import { getLogoUrl } from "@/lib/images/getLogoUrl";

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

// Compact inline countdown - A) DOWNSIZE
function CompactCountdown({ 
  targetDate, 
  status, 
  isLocked, 
  lockReason 
}: { 
  targetDate: Date | undefined; 
  status?: string;
  isLocked?: boolean;
  lockReason?: string;
}) {
  const timeLeft = useCountdown(targetDate);
  
  // F) STATUS CONSISTENCY - Show "Final — Trading closed" when FINAL
  const isFinal = status === "final" || (isLocked && (lockReason === "GAME_FINAL" || status === "final"));
  const isInProgress = status === "in_progress";
  const isCanceled = status === "canceled" || status === "postponed";
  
  if (isFinal) {
    return (
      <div className="inline-flex items-center gap-2 text-sm text-gray-500">
        <Lock className="h-4 w-4" />
        <span className="font-medium">Final — Trading closed</span>
      </div>
    );
  }
  
  if (isInProgress || (isLocked && status === "in_progress")) {
    return (
      <div className="inline-flex items-center gap-2 text-sm text-red-500">
        <div className="relative">
          <Lock className="h-4 w-4" />
          <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 bg-red-500 rounded-full animate-ping" />
        </div>
        <span className="font-medium">Live — Trading locked</span>
      </div>
    );
  }
  
  if (isCanceled) {
    return (
      <div className="inline-flex items-center gap-2 text-sm text-gray-500">
        <Lock className="h-4 w-4" />
        <span className="font-medium">{status?.charAt(0).toUpperCase()}{status?.slice(1)} — Trading closed</span>
      </div>
    );
  }
  
  if (isLocked) {
    return (
      <div className="inline-flex items-center gap-2 text-sm text-gray-500">
        <Lock className="h-4 w-4" />
        <span className="font-medium">Trading locked</span>
      </div>
    );
  }
  
  // Countdown still running
  if (timeLeft.total <= 0) {
    return (
      <div className="inline-flex items-center gap-2 text-sm text-orange-500 animate-pulse">
        <Lock className="h-4 w-4" />
        <span className="font-medium">Locking soon</span>
      </div>
    );
  }

  const isUrgent = timeLeft.days === 0 && timeLeft.hours < 6;
  
  // Compact inline format: "Locks in 2d 14h 32m"
  const parts = [];
  if (timeLeft.days > 0) parts.push(`${timeLeft.days}d`);
  if (timeLeft.hours > 0 || timeLeft.days > 0) parts.push(`${timeLeft.hours}h`);
  parts.push(`${timeLeft.minutes}m`);
  if (timeLeft.days === 0 && timeLeft.hours === 0) parts.push(`${timeLeft.seconds}s`);
  
  return (
    <div className={`inline-flex items-center gap-2 text-sm ${isUrgent ? "text-orange-500" : "text-[color:var(--text-muted)]"}`}>
      <Clock className="h-4 w-4" />
      <span className="font-medium">Locks in {parts.join(" ")}</span>
      {isUrgent && <span className="text-xs px-1.5 py-0.5 rounded bg-orange-500/20 animate-pulse">Soon</span>}
    </div>
  );
}

// Collapsible Section Component - C) ACCORDION
function CollapsibleSection({ 
  title, 
  icon: Icon, 
  children,
  defaultOpen = false 
}: { 
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="border border-[color:var(--border-soft)] rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-[color:var(--surface)] hover:bg-[color:var(--surface-2)] transition text-left"
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-[color:var(--text-muted)]" />
          <span className="text-sm font-medium text-[color:var(--text-strong)]">{title}</span>
        </div>
        <ChevronDown className={`h-4 w-4 text-[color:var(--text-muted)] transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div className="p-3 bg-[color:var(--surface-2)] border-t border-[color:var(--border-soft)] text-sm text-[color:var(--text-muted)]">
          {children}
        </div>
      )}
    </div>
  );
}

// A) TIMELINE STEPPER - 4 steps showing progress to settlement
type TimelineStep = 1 | 2 | 3 | 4 | -1; // -1 = voided

function TimelineStepper({ 
  status, 
  isLocked,
  isSettled = false 
}: { 
  status?: string;
  isLocked?: boolean;
  isSettled?: boolean;
}) {
  // Determine current step
  let currentStep: TimelineStep = 1;
  let isVoided = false;
  
  if (status === "canceled" || status === "postponed") {
    isVoided = true;
    currentStep = -1;
  } else if (isSettled) {
    currentStep = 4;
  } else if (status === "final") {
    currentStep = 3;
  } else if (status === "in_progress" || isLocked) {
    currentStep = 2;
  } else {
    currentStep = 1;
  }
  
  const steps = [
    { id: 1, label: "Market Open", shortLabel: "Open" },
    { id: 2, label: "Trading Closes", shortLabel: "Closed" },
    { id: 3, label: "Outcome Confirmed", shortLabel: "Final" },
    { id: 4, label: "Payout Complete", shortLabel: "Settled" },
  ];
  
  if (isVoided) {
    return (
      <div className="bg-[color:var(--surface)] border border-red-500/30 rounded-lg p-3 mb-4">
        <div className="flex items-center justify-center gap-2 text-red-500">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm font-medium">Market Voided — All trades refunded</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-lg p-3 mb-4">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1">
            {/* Step indicator */}
            <div className="flex flex-col items-center">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition ${
                step.id < currentStep 
                  ? "bg-green-500 text-white" 
                  : step.id === currentStep 
                    ? "bg-orange-500 text-white animate-pulse" 
                    : "bg-[color:var(--surface-3)] text-[color:var(--text-muted)]"
              }`}>
                {step.id < currentStep ? (
                  <Check className="h-3 w-3" />
                ) : step.id === currentStep ? (
                  <Circle className="h-3 w-3 fill-current" />
                ) : (
                  step.id
                )}
              </div>
              <span className={`text-[10px] mt-1 text-center ${
                step.id <= currentStep 
                  ? "text-[color:var(--text-strong)] font-medium" 
                  : "text-[color:var(--text-muted)]"
              }`}>
                <span className="hidden sm:inline">{step.label}</span>
                <span className="sm:hidden">{step.shortLabel}</span>
              </span>
            </div>
            
            {/* Connector line */}
            {index < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 ${
                step.id < currentStep 
                  ? "bg-green-500" 
                  : "bg-[color:var(--border-soft)]"
              }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// B) SHARE DROPDOWN MENU
function ShareMenu({ 
  onShareCard, 
  onCopyLink,
  copied
}: { 
  onShareCard: () => void;
  onCopyLink: () => void;
  copied: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  return (
    <div className="relative" ref={menuRef}>
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-8 w-8 flex-shrink-0"
        onClick={() => setIsOpen(!isOpen)}
        title="Share"
      >
        <Share2 className="h-4 w-4" />
      </Button>
      
      {isOpen && (
        <div className="absolute right-0 top-10 z-50 w-48 bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-lg shadow-lg overflow-hidden">
          <button
            onClick={() => {
              onShareCard();
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[color:var(--text-strong)] hover:bg-[color:var(--surface-2)] transition"
          >
            <ImageIcon className="h-4 w-4 text-[color:var(--text-muted)]" />
            Create Share Card
          </button>
          <button
            onClick={() => {
              onCopyLink();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[color:var(--text-strong)] hover:bg-[color:var(--surface-2)] transition border-t border-[color:var(--border-soft)]"
          >
            {copied ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-green-500">Link Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 text-[color:var(--text-muted)]" />
                Copy Link
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// C) TEAM LOGO with fallback - safe rendering (uses getLogoUrl helper)
function TeamLogo({ 
  logoUrl, 
  name, 
  abbr, 
  color, 
  size = "lg" 
}: { 
  logoUrl?: string | null;
  name: string;
  abbr: string;
  color: string;
  size?: "sm" | "md" | "lg";
}) {
  const [imgError, setImgError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Use the helper to get proper URL (converts storage paths to full URLs)
  const resolvedUrl = getLogoUrl(logoUrl);
  
  const sizeClasses = {
    sm: "w-10 h-10",
    md: "w-16 h-16 md:w-20 md:h-20",
    lg: "w-16 h-16 md:w-20 md:h-20",
  };
  
  const imgSizes = {
    sm: "w-7 h-7",
    md: "w-12 h-12 md:w-14 md:h-14",
    lg: "w-12 h-12 md:w-14 md:h-14",
  };
  
  const textSizes = {
    sm: "text-sm",
    md: "text-lg md:text-xl",
    lg: "text-lg md:text-xl",
  };
  
  const showFallback = !resolvedUrl || imgError;
  
  return (
    <div 
      className={`${sizeClasses[size]} rounded-xl flex items-center justify-center text-white font-bold overflow-hidden relative`}
      style={{ backgroundColor: color }}
    >
      {/* Always show fallback, hide when image loads */}
      <span className={`${textSizes[size]} ${!showFallback && isLoaded ? 'opacity-0' : 'opacity-100'} transition-opacity`}>
        {abbr}
      </span>
      
      {/* Image overlay - using native img to bypass Next.js Image optimization */}
      {resolvedUrl && !imgError && (
        // eslint-disable-next-line @next/next/no-img-element
        <img 
          src={resolvedUrl} 
          alt={name}
          data-img-src={resolvedUrl}
          data-original-logo={logoUrl || "null"}
          className={`${imgSizes[size]} object-contain absolute transition-opacity duration-200 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setIsLoaded(true)}
          onError={() => setImgError(true)}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
        />
      )}
    </div>
  );
}
// Market type options for B) SINGLE MARKET VIEW
type MarketType = "moneyline" | "spread" | "total";

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
  
  // B) Single market view - default to Moneyline
  const [activeMarketType, setActiveMarketType] = useState<MarketType>("moneyline");
  
  // E) Share modal state
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // User state for picks card
  const [userHandle, setUserHandle] = useState<string>("Guest");
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);
  
  // Handle share button click - E) SHARE = ICON + MODAL
  const handleShareClick = useCallback(() => {
    setShareModalOpen(true);
  }, []);
  
  // Copy URL to clipboard
  const handleCopyUrl = useCallback(async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);
  
  // Fetch logged-in user
  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/me");
        const data = await res.json();
        if (data.user) {
          const handle = data.user.username || data.user.display_name || "Guest";
          setUserHandle(handle);
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

  const { team1, team2, league, lines, locksInLabel: locksIn } = market;

  // Map teams to consistent outcome format
  const outcomes = mapMarketOutcomesToTeams(market);
  
  // Get selected team data
  const selectedTeamData = selectedTeam === "teamA" ? team1 : team2;
  const selectedPrice = selectedTeam === "teamA" ? team1.odds : team2.odds;

  return (
    <div className="min-h-screen bg-[color:var(--app-bg)] text-[color:var(--text-strong)]">
      <TopNav />

      <div className="flex flex-col lg:flex-row">
        {/* Sidebar */}
        <SportsSidebar activeSport={league} />

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-3xl">
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

            {/* Header with Title + Share Menu */}
            <div className="flex items-start justify-between gap-3 mb-2">
              <h1 className="text-xl md:text-2xl font-bold">{market.title}</h1>
              <ShareMenu 
                onShareCard={handleShareClick}
                onCopyLink={handleCopyUrl}
                copied={copied}
              />
            </div>

            {/* A) Compact Countdown - inline under title */}
            <div className="mb-4">
              <CompactCountdown 
                targetDate={market.startTime} 
                status={market.status} 
                isLocked={market.isLocked}
                lockReason={market.lockReason}
              />
            </div>

            {/* A) TIMELINE STEPPER - Always visible at top */}
            <TimelineStepper 
              status={market.status} 
              isLocked={market.isLocked}
              isSettled={false} // TODO: pass actual settlement status when available
            />

            {/* Teams Display - Clean matchup card */}
            <div className="bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl p-4 md:p-6 mb-6">
              {/* Score display for live/final */}
              {(market.status === "in_progress" || market.status === "final") && (
                <div className="flex items-center justify-center gap-4 mb-4">
                  <span className={`text-3xl md:text-4xl font-bold ${
                    market.status === "final" && (market.gameDetails?.awayScore ?? 0) > (market.gameDetails?.homeScore ?? 0)
                      ? "text-green-500" 
                      : "text-[color:var(--text-strong)]"
                  }`}>
                    {market.gameDetails?.awayScore ?? 0}
                  </span>
                  <span className="text-xl text-[color:var(--text-muted)]">–</span>
                  <span className={`text-3xl md:text-4xl font-bold ${
                    market.status === "final" && (market.gameDetails?.homeScore ?? 0) > (market.gameDetails?.awayScore ?? 0)
                      ? "text-green-500" 
                      : "text-[color:var(--text-strong)]"
                  }`}>
                    {market.gameDetails?.homeScore ?? 0}
                  </span>
                </div>
              )}

              {/* Teams facing off */}
              <div className="flex items-center justify-center gap-4 md:gap-8">
                {/* Team 1 - C) Using TeamLogo with safe fallback */}
                <div className="flex flex-col items-center flex-1">
                  <div className="mb-2">
                    <TeamLogo 
                      logoUrl={team1.logoUrl}
                      name={team1.name}
                      abbr={team1.abbr}
                      color={team1.color}
                      size="lg"
                    />
                  </div>
                  <div className="font-semibold text-sm md:text-base text-center">{team1.name}</div>
                </div>

                {/* VS Badge - Orange gradient circle with white text */}
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg">
                  <span className="text-sm font-bold text-white tracking-tight">
                    VS
                  </span>
                </div>

                {/* Team 2 - C) Using TeamLogo with safe fallback */}
                <div className="flex flex-col items-center flex-1">
                  <div className="mb-2">
                    <TeamLogo 
                      logoUrl={team2.logoUrl}
                      name={team2.name}
                      abbr={team2.abbr}
                      color={team2.color}
                      size="lg"
                    />
                  </div>
                  <div className="font-semibold text-sm md:text-base text-center">{team2.name}</div>
                </div>
              </div>
            </div>

            {/* B) Single Market View with Dropdown */}
            <div className="bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl p-4 mb-6">
              {/* Market Type Selector */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-[color:var(--text-muted)]">Market:</span>
                <select
                  value={activeMarketType}
                  onChange={(e) => setActiveMarketType(e.target.value as MarketType)}
                  className="bg-[color:var(--surface-2)] border border-[color:var(--border-soft)] rounded-lg px-3 py-1.5 text-sm font-medium text-[color:var(--text-strong)] focus:outline-none focus:ring-2 focus:ring-green-500/50"
                >
                  <option value="moneyline">Moneyline</option>
                  <option value="spread">Spread</option>
                  <option value="total">Total</option>
                </select>
              </div>

              {/* Moneyline Market */}
              {activeMarketType === "moneyline" && (
                <TeamOutcomeButtonPair
                  teamA={outcomes.teamA}
                  teamB={outcomes.teamB}
                  priceA={outcomes.priceA}
                  priceB={outcomes.priceB}
                  selectedTeam={selectedTeam}
                  onSelectTeam={setSelectedTeam}
                />
              )}

              {/* Spread Market */}
              {activeMarketType === "spread" && (
                <div className="flex gap-2 md:gap-3">
                  <button
                    onClick={() => setSelectedTeam("teamA")}
                    className={`flex-1 flex items-center justify-between px-4 py-3 rounded-lg transition ${
                      selectedTeam === "teamA"
                        ? "bg-green-500/20 border-2 border-green-500"
                        : "bg-[color:var(--surface-2)] hover:bg-[color:var(--surface-3)] border border-transparent"
                    }`}
                  >
                    <span className="text-sm text-[color:var(--text-muted)]">{team1.abbr} {lines.spread?.team1Line || "-4.5"}</span>
                    <span className="font-semibold">{lines.spread?.team1Odds || 51}¢</span>
                  </button>
                  <button
                    onClick={() => setSelectedTeam("teamB")}
                    className={`flex-1 flex items-center justify-between px-4 py-3 rounded-lg transition ${
                      selectedTeam === "teamB"
                        ? "bg-green-500/20 border-2 border-green-500"
                        : "bg-[color:var(--surface-2)] hover:bg-[color:var(--surface-3)] border border-transparent"
                    }`}
                  >
                    <span className="text-sm text-[color:var(--text-muted)]">{team2.abbr} {lines.spread?.team2Line || "+4.5"}</span>
                    <span className="font-semibold">{lines.spread?.team2Odds || 50}¢</span>
                  </button>
                </div>
              )}

              {/* Total Market */}
              {activeMarketType === "total" && (
                <div className="flex gap-2 md:gap-3">
                  <button
                    onClick={() => setSelectedTeam("teamA")}
                    className={`flex-1 flex items-center justify-between px-4 py-3 rounded-lg transition ${
                      selectedTeam === "teamA"
                        ? "bg-green-500/20 border-2 border-green-500"
                        : "bg-[color:var(--surface-2)] hover:bg-[color:var(--surface-3)] border border-transparent"
                    }`}
                  >
                    <span className="text-sm text-[color:var(--text-muted)]">Over {lines.total?.over || 46.5}</span>
                    <span className="font-semibold">{lines.total?.overOdds || 47}¢</span>
                  </button>
                  <button
                    onClick={() => setSelectedTeam("teamB")}
                    className={`flex-1 flex items-center justify-between px-4 py-3 rounded-lg transition ${
                      selectedTeam === "teamB"
                        ? "bg-green-500/20 border-2 border-green-500"
                        : "bg-[color:var(--surface-2)] hover:bg-[color:var(--surface-3)] border border-transparent"
                    }`}
                  >
                    <span className="text-sm text-[color:var(--text-muted)]">Under {lines.total?.under || 46.5}</span>
                    <span className="font-semibold">{lines.total?.underOdds || 54}¢</span>
                  </button>
                </div>
              )}
            </div>

            {/* C) Collapsible Info Sections */}
            <div className="space-y-2 mb-6">
              <CollapsibleSection title="Rules Summary" icon={FileText}>
                <ul className="space-y-2 list-disc list-inside">
                  <li>This market settles based on the final score at the end of regulation.</li>
                  <li>Overtime is included in the final score for settlement purposes.</li>
                  <li>If the game is canceled or postponed, all trades will be voided and refunded.</li>
                  <li>Dead heat rules apply if there is a tie (for applicable markets).</li>
                </ul>
              </CollapsibleSection>

              <CollapsibleSection title="Timeline & Payout" icon={Calendar}>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="font-medium text-[color:var(--text-strong)]">Trading closes:</span>
                    <span>When the game starts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-medium text-[color:var(--text-strong)]">Settlement:</span>
                    <span>Within 30 minutes after the game ends</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-medium text-[color:var(--text-strong)]">Payout:</span>
                    <span>Winners receive $1.00 per share. Losers receive $0.</span>
                  </li>
                </ul>
              </CollapsibleSection>

              <CollapsibleSection title="Trading Prohibitions" icon={AlertTriangle}>
                <ul className="space-y-2 list-disc list-inside">
                  <li>You may not trade if you have non-public information about this event.</li>
                  <li>Participants, coaches, officials, and their immediate family members are prohibited from trading.</li>
                  <li>Coordinated trading or market manipulation is strictly prohibited.</li>
                  <li>Violations may result in account suspension and forfeiture of funds.</li>
                </ul>
              </CollapsibleSection>
            </div>

            {/* D) COMMENTS SECTION at bottom */}
            <MarketComments marketSlug={market.slug} league={market.league} />
          </div>
        </main>

        {/* Trade Panel - Simplified */}
        <div className="w-full lg:w-80 flex-shrink-0 p-4 md:p-6 lg:border-l border-t lg:border-t-0 border-[color:var(--border-soft)]">
          <div className="lg:sticky lg:top-6 max-w-md mx-auto lg:max-w-none">
            <div className="bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl p-4">
              {/* Buy/Sell Toggle */}
              <div className="flex gap-2 mb-4">
                <Button className="flex-1 bg-green-500/20 text-green-500 border border-green-500/30" variant="ghost">
                  Buy
                </Button>
                <Button className="flex-1" variant="ghost">
                  Sell
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

              {/* Payout Info */}
              <div className="space-y-2 mb-4 py-3 border-t border-[color:var(--border-soft)]">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[color:var(--text-muted)]">Implied chance</span>
                  <span className="font-semibold">{selectedPrice}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[color:var(--text-muted)]">Payout if {selectedTeamData.name} wins</span>
                  <span className="text-lg font-bold text-green-500">
                    ${formatCurrency(tradeAmount > 0 ? tradeAmount * (100 / selectedPrice) : 0)}
                  </span>
                </div>
              </div>

              {/* CTA Button */}
              <Button 
                className={`w-full font-semibold ${
                  market.isLocked 
                    ? "bg-gray-500 cursor-not-allowed" 
                    : "bg-green-500 hover:bg-green-600"
                } text-white`}
                disabled={market.isLocked}
              >
                {market.isLocked ? "Trading Locked" : "Sign up to trade"}
              </Button>

              <p className="text-xs text-center text-[color:var(--text-subtle)] mt-3">
                By trading, you agree to the Terms of Use.
              </p>
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

      {/* E) Share Modal - opens picks card modal for sharing */}
      <PicksCardModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
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
          amount: tradeAmount > 0 ? tradeAmount : undefined,
          potentialPayout: tradeAmount > 0 ? tradeAmount * (100 / selectedPrice) : undefined,
        }}
      />
    </div>
  );
}
