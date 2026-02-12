"use client";

import { useState, useEffect, useCallback, Component } from "react";
import type { MouseEvent, ReactNode, ErrorInfo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, ChevronLeft, ChevronRight, Clock, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";

// Countdown timer hook
function safeDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed);
}

function useCountdown(targetDate?: string | null) {
  const calculateTimeLeft = useCallback(() => {
    const dateObj = safeDate(targetDate);
    if (!dateObj) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
    }
    const difference = dateObj.getTime() - new Date().getTime();
    
    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
    }
    
    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
      total: difference,
    };
  }, [targetDate]);

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [calculateTimeLeft]);

  return timeLeft;
}

// Countdown display component
function CountdownTimer({ targetDate }: { targetDate?: string | null }) {
  if (!safeDate(targetDate)) {
    return (
      <span className="text-xs uppercase tracking-widest text-white/60">TBD</span>
    );
  }
  const timeLeft = useCountdown(targetDate);
  
  if (timeLeft.total <= 0) {
    return (
      <div className="flex items-center gap-2 text-green-400 font-bold animate-pulse">
        <Flame className="h-5 w-5" />
        <span>STARTING NOW!</span>
      </div>
    );
  }

  const units = [
    { value: timeLeft.days, label: "DAYS" },
    { value: timeLeft.hours, label: "HRS" },
    { value: timeLeft.minutes, label: "MIN" },
    { value: timeLeft.seconds, label: "SEC" },
  ];

  // Only show days if > 0
  const displayUnits = timeLeft.days > 0 ? units : units.slice(1);

  return (
    <div className="flex items-center justify-center gap-1 md:gap-3">
      <Clock className="h-4 w-4 md:h-5 md:w-5 text-orange-400 animate-pulse" />
      <div className="flex items-center gap-1 md:gap-2">
        {displayUnits.map((unit, index) => (
          <div key={unit.label} className="flex items-center gap-1 md:gap-2">
            <div className="flex flex-col items-center">
              <div className="bg-gradient-to-b from-[#2a2f3e] to-[#1a1f2e] border border-white/10 rounded-lg px-2 py-1 md:px-3 md:py-2 min-w-[40px] md:min-w-[56px] shadow-lg">
                <span className="text-lg md:text-2xl font-mono font-bold text-white tabular-nums">
                  {String(unit.value).padStart(2, "0")}
                </span>
              </div>
              <span className="text-[10px] md:text-xs text-white/50 mt-1 font-medium tracking-wider">
                {unit.label}
              </span>
            </div>
            {index < displayUnits.length - 1 && (
              <span className="text-xl md:text-2xl font-bold text-orange-400/60 animate-pulse mb-4">:</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface Team {
  teamId: number;
  name: string;
  city: string;
  abbreviation: string;
  fullName: string;
  logoUrl: string | null;
  primaryColor: string | null;
}

export interface FeaturedItem {
  league: string;
  gameId: string;
  startsAt: string;
  status: "scheduled" | "in_progress" | "final" | "canceled";
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number | null;
  awayScore: number | null;
  channel: string | null;
  volume?: number;
}

const STORAGE_KEY = "provepicks:mode";

interface FeaturedGameHeroProps {
  items?: FeaturedItem[];
}

function FeaturedGameHeroInner({ items }: { items?: FeaturedItem[] }) {
  const router = useRouter();
  const heroItems = items ?? [];
  const [activeIndex, setActiveIndex] = useState(0);
  const [mode, setMode] = useState<"coin" | "cash">("coin");

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const stored = window.__provepicksMode ?? window.localStorage.getItem(STORAGE_KEY);
    setMode(stored === "cash" ? "cash" : "coin");

    const handler = (event: Event) => {
      const detail = (event as CustomEvent)?.detail;
      const incoming = detail?.mode ?? window.__provepicksMode;
      if (incoming === "coin" || incoming === "cash") {
        setMode(incoming);
      }
    };
    window.addEventListener("provepicks:mode-change", handler as EventListener);
    return () => window.removeEventListener("provepicks:mode-change", handler as EventListener);
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [heroItems.length]);

  const itemCount = heroItems.length;
  const safeIndex = itemCount > 0 ? activeIndex % itemCount : 0;
  const active = itemCount > 0 ? heroItems[safeIndex] : null;
  const gameHref = active ? `/${active.league}/game/${active.gameId}` : "";
  const navigateToActiveGame = useCallback(
    (event?: MouseEvent<HTMLDivElement>) => {
      event?.stopPropagation();
      if (!gameHref) return;
      router.push(gameHref);
      if (process.env.NODE_ENV !== "production") {
        console.log("[FeaturedGameHero] push", gameHref);
      }
    },
    [router, gameHref],
  );

  useEffect(() => {
    if (itemCount <= 1) return undefined;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % itemCount);
    }, 8000);
    return () => clearInterval(timer);
  }, [itemCount]);

  if (!active) {
    return <FeaturedHeroFallback />;
  }
  const heroActive = active;
  const isScheduled = heroActive.status === "scheduled";
  const isLive = heroActive.status === "in_progress";
  const startDate = safeDate(heroActive.startsAt);

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + itemCount) % itemCount);
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % itemCount);
  };

  const openLearnMore = () => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event("provepicks:open-how-it-works"));
  };

  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1f2e] via-[#151922] to-[#0d1117] border border-white/5 cursor-pointer"
      onClick={() => navigateToActiveGame()}
      role="button"
    >
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-amber-400 rounded-full blur-3xl opacity-30" />
      </div>

      <div className="relative z-10 p-6 md:p-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 mb-6">
          <div className="text-center md:text-left">
            <h2 className="text-sm md:text-base text-orange-400 font-semibold uppercase tracking-wider flex items-center justify-center gap-2">
              <Flame className="h-4 w-4 animate-pulse" />
              Featured Matchup
              <Flame className="h-4 w-4 animate-pulse" />
            </h2>
            <p className="text-xs uppercase tracking-widest text-white/60 mt-1">
              {heroActive.league.toUpperCase()} · {isLive ? "LIVE" : "Upcoming"}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/60 uppercase tracking-wider">
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                handlePrev();
              }}
              aria-label="Previous featured matchup"
              className="rounded-full border border-white/30 p-1 hover:border-white transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span>{activeIndex + 1} / {itemCount}</span>
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                handleNext();
              }}
              aria-label="Next featured matchup"
              className="rounded-full border border-white/30 p-1 hover:border-white transition"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_auto_1fr] items-center mb-8 relative z-10">
            <TeamDisplay
            team={heroActive.awayTeam}
            score={heroActive.awayScore}
            side="away"
            status={heroActive.status}
            league={heroActive.league}
            onNavigate={(event) => navigateToActiveGame(event)}
          />
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="text-3xl md:text-4xl font-black text-white/40">VS</div>
            {isScheduled ? (
              <CountdownTimer targetDate={heroActive.startsAt} />
            ) : (
              <span className="text-xs uppercase tracking-widest text-white/60">
                {isLive ? "Live now" : heroActive.status.replace("_", " ").toUpperCase()}
              </span>
            )}
          </div>
          <TeamDisplay
            team={heroActive.homeTeam}
            score={heroActive.homeScore}
            side="home"
            status={heroActive.status}
            league={heroActive.league}
            onNavigate={(event) => navigateToActiveGame(event)}
          />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-white/70 text-sm mb-8">
          <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full">
            <Calendar className="h-4 w-4 text-orange-400" />
            <span>
              {startDate
                ? startDate.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : "Coming soon"}
            </span>
          </div>
          {heroActive.channel && (
            <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full">
              <Clock className="h-4 w-4 text-purple-400" />
              <span>{heroActive.channel}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-3 relative z-10">
          {mode === "coin" ? (
            <Link href={gameHref} onClick={(event) => event.stopPropagation()}>
              <Button
                size="lg"
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold px-8 py-4 text-lg rounded-xl shadow-lg shadow-blue-500/25 group"
              >
                <span>Trade (Coins)</span>
                <ChevronRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          ) : (
            <Button
              size="lg"
              disabled
              className="bg-white/10 text-white font-bold px-8 py-4 text-lg rounded-xl border border-white/30"
            >
              Cash mode coming soon
            </Button>
          )}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              openLearnMore();
            }}
            className="text-xs font-semibold tracking-[0.3em] uppercase text-slate-900 dark:text-white border border-white/30 bg-white/10 px-4 py-2 rounded-full transition hover:bg-white/20"
          >
            Learn more
          </button>
          {mode === "cash" && (
            <span className="text-xs text-white/70 italic">Coin trading will be back soon for cash mode.</span>
          )}
        </div>
      </div>
    </div>
  );
}

function FeaturedHeroFallback() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1f2e] via-[#151922] to-[#0d1117] border border-white/5">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-amber-400 rounded-full blur-3xl opacity-30" />
      </div>
      <div className="relative z-10 p-8 md:p-12 text-center">
        <p className="text-sm text-white/60 uppercase tracking-wider">Featured matchup unavailable</p>
      </div>
    </div>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[FeaturedGameHero] crashed", error);
    }
  }

  render() {
    if (this.state.hasError) {
      return <FeaturedHeroFallback />;
    }
    return this.props.children;
  }
}

export default function FeaturedGameHero({ items }: FeaturedGameHeroProps) {
  return (
    <ErrorBoundary>
      <FeaturedGameHeroInner items={items} />
    </ErrorBoundary>
  );
}

// Generate slug from team data
function getTeamSlug(team: Team, league: string): string {
  const name = team?.name ?? team?.fullName ?? "team";
  const leagueSlug = league ? league.toLowerCase() : "sports";
  const idPart = typeof team.teamId === "number" ? team.teamId : 0;
  const nameSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${leagueSlug}-${idPart}-${nameSlug}`;
}

function TeamDisplay({
  team,
  score,
  side,
  status,
  league,
  onNavigate,
}: {
  team: Team;
  score: number | null;
  side: "home" | "away";
  status: FeaturedItem["status"];
  league: string;
  onNavigate?: (event: MouseEvent<HTMLDivElement>) => void;
}) {
  const [imgError, setImgError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const safeName = team?.name ?? team?.fullName ?? "Team";
  const safeCity = team?.city ?? safeName;
  const safeAbbreviation = team?.abbreviation ?? safeName.slice(0, 3).toUpperCase();
  const safeLogo = typeof team?.logoUrl === "string" ? team.logoUrl : null;
  const safePrimaryColor = team?.primaryColor || "#374151";
  const slug = getTeamSlug(team, league);
  const showFallback = !safeLogo || imgError;

  return (
    <div
      className={`flex flex-col items-center ${onNavigate ? "cursor-pointer" : ""}`}
      onClick={onNavigate}
      role={onNavigate ? "button" : undefined}
      tabIndex={onNavigate ? 0 : undefined}
    >
      <div
        className="w-20 h-20 md:w-32 md:h-32 rounded-2xl flex items-center justify-center mb-3 shadow-xl overflow-hidden hover:ring-4 hover:ring-white/30 transition relative"
        style={{
          backgroundColor: safePrimaryColor,
          boxShadow: safePrimaryColor ? `0 10px 40px ${safePrimaryColor}40` : undefined,
        }}
      >
        <span className={`text-white font-bold text-2xl md:text-4xl ${!showFallback && isLoaded ? "opacity-0" : "opacity-100"} transition-opacity`}>
          {safeAbbreviation}
        </span>

        {safeLogo && !imgError && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={safeLogo}
            alt={safeName}
            width={80}
            height={80}
            className={`object-contain w-16 h-16 md:w-24 md:h-24 absolute transition-opacity duration-200 ${isLoaded ? "opacity-100" : "opacity-0"}`}
            onLoad={() => setIsLoaded(true)}
            onError={() => setImgError(true)}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
          />
        )}
      </div>

      {status !== "scheduled" && score !== null && (
        <div className="text-3xl md:text-5xl font-black text-white mb-2">
          {score}
        </div>
      )}

      <div className="text-center">
        <div className="text-white font-bold text-sm md:text-lg">{safeCity}</div>
        <div className="text-white/70 text-xs md:text-sm">{safeName}</div>
      </div>

      {side === "home" && (
        <div className="mt-2 text-xs text-white/50 uppercase tracking-wider">Home</div>
      )}
    </div>
  );
}
