"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Calendar, Tv, Trophy, ChevronRight, Clock, Flame } from "lucide-react";
import { LightningLoader } from "@/components/ui/LightningLoader";
import { Button } from "@/components/ui/button";
import { getLogoUrl } from "@/lib/images/getLogoUrl";

// Countdown timer hook
function useCountdown(targetDate: string) {
  const calculateTimeLeft = useCallback(() => {
    const difference = new Date(targetDate).getTime() - new Date().getTime();
    
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
function CountdownTimer({ targetDate }: { targetDate: string }) {
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

interface FeaturedGame {
  gameId: string;
  name: string;
  startTime: string;
  status: "scheduled" | "in_progress" | "final" | "postponed" | "canceled";
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number | null;
  awayScore: number | null;
  venue: string | null;
  week: number;
  channel: string | null;
  isSuperBowl: boolean;
}

interface FeaturedResponse {
  featured: FeaturedGame | null;
  reason: "super_bowl" | "next_game" | "no_games";
}

interface FeaturedGameHeroProps {
  league?: string;
}

export function FeaturedGameHero({ league = "nfl" }: FeaturedGameHeroProps) {
  const [data, setData] = useState<FeaturedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const isDebug = searchParams?.get("debug") === "1";

  useEffect(() => {
    async function fetchFeatured() {
      try {
        setLoading(true);
        setError(null);
        
        const res = await fetch(`/api/sports/featured?league=${league}`);
        
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || `Failed to fetch: ${res.status}`);
        }
        
        const responseData: FeaturedResponse = await res.json();
        setData(responseData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load featured game");
      } finally {
        setLoading(false);
      }
    }

    fetchFeatured();
  }, [league]);

  if (loading) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1f2e] to-[#0d1117] p-8 md:p-12">
        <div className="flex items-center justify-center py-16">
          <LightningLoader size="lg" />
        </div>
      </div>
    );
  }

  if (error || !data || !data.featured) {
    return <OffseasonHero />;
  }

  const { featured } = data;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1f2e] via-[#151922] to-[#0d1117] border border-white/5">
      {/* Animated background decoration */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-amber-400 rounded-full blur-3xl opacity-30" />
      </div>

      {/* Subtle grid pattern overlay */}
      <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />

      {/* Super Bowl badge */}
      {featured.isSuperBowl && (
        <div className="absolute top-4 left-4 md:top-6 md:left-6 z-10">
          <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg shadow-yellow-500/30 animate-pulse">
            <Trophy className="h-4 w-4" />
            <span>SUPER BOWL</span>
          </div>
        </div>
      )}

      {/* Live badge */}
      {featured.status === "in_progress" && (
        <div className="absolute top-4 right-4 md:top-6 md:right-6 z-10">
          <div className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-full text-sm font-bold animate-pulse shadow-lg shadow-red-500/30">
            <span className="w-2 h-2 bg-white rounded-full" />
            <span>LIVE</span>
          </div>
        </div>
      )}

      <div className="relative z-10 p-6 md:p-12">
        {/* Game Name */}
        <div className="text-center mb-6">
          <h2 className="text-sm md:text-base text-orange-400 font-semibold uppercase tracking-wider mb-2 flex items-center justify-center gap-2">
            <Flame className="h-4 w-4 animate-pulse" />
            Featured Matchup
            <Flame className="h-4 w-4 animate-pulse" />
          </h2>
          <h1 className="text-2xl md:text-4xl font-bold text-white">
            {featured.name}
          </h1>
        </div>

        {/* Teams VS Display */}
        <div className="flex items-center justify-center gap-4 md:gap-12 mb-8">
          {/* Away Team */}
          <TeamDisplay team={featured.awayTeam} score={featured.awayScore} side="away" status={featured.status} league={league} />

          {/* VS */}
          <div className="flex flex-col items-center">
            {featured.status === "scheduled" ? (
              <div className="text-3xl md:text-5xl font-black text-white/30">VS</div>
            ) : (
              <div className="text-xl md:text-3xl font-bold text-white/50">-</div>
            )}
          </div>

          {/* Home Team */}
          <TeamDisplay team={featured.homeTeam} score={featured.homeScore} side="home" status={featured.status} league={league} />
        </div>

        {/* Countdown Timer */}
        {featured.status === "scheduled" && (
          <div className="mb-6">
            <CountdownTimer targetDate={featured.startTime} />
          </div>
        )}

        {/* Game Info */}
        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-white/70 text-sm mb-8">
          {featured.status === "scheduled" && (
            <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full">
              <Calendar className="h-4 w-4 text-orange-400" />
              <span>
                {new Date(featured.startTime).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </div>
          )}
          {featured.channel && (
            <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full">
              <Tv className="h-4 w-4 text-purple-400" />
              <span>{featured.channel}</span>
            </div>
          )}
        </div>

        {/* CTA Button */}
        {featured.status === "scheduled" && (
          <div className="flex justify-center">
            <Link href={featured.gameId ? `/${league}/game/${featured.gameId}` : `/sports?league=${league}`}>
              <Button 
                size="lg"
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold px-8 py-6 text-lg rounded-xl shadow-lg shadow-blue-500/25 group"
              >
                <span>View Matchup</span>
                <ChevronRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        )}

        {featured.status === "in_progress" && (
          <div className="flex justify-center">
            <Link href={featured.gameId ? `/${league}/game/${featured.gameId}` : `/sports?league=${league}`}>
              <Button 
                size="lg"
                className="bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-6 text-lg rounded-xl"
              >
                <span>Follow Live</span>
              </Button>
            </Link>
          </div>
        )}

        {/* Debug output - only shows when ?debug=1 is in URL */}
        {isDebug && (
          <div className="mt-6 p-4 bg-black/80 rounded-lg text-left font-mono text-xs text-green-400 overflow-x-auto">
            <div className="font-bold mb-2 text-yellow-400">🔍 DEBUG: Logo URLs</div>
            <div className="mb-1">
              <span className="text-gray-400">Away Team Raw: </span>
              <span className="text-white break-all">{featured.awayTeam.logoUrl || "NULL"}</span>
            </div>
            <div className="mb-1">
              <span className="text-gray-400">Away Team Resolved: </span>
              <span className="text-green-400 break-all">{getLogoUrl(featured.awayTeam.logoUrl) || "NULL"}</span>
            </div>
            <div className="mb-1">
              <span className="text-gray-400">Home Team Raw: </span>
              <span className="text-white break-all">{featured.homeTeam.logoUrl || "NULL"}</span>
            </div>
            <div className="mb-1">
              <span className="text-gray-400">Home Team Resolved: </span>
              <span className="text-green-400 break-all">{getLogoUrl(featured.homeTeam.logoUrl) || "NULL"}</span>
            </div>
            <div className="mt-2 text-gray-500">
              NEXT_PUBLIC_SUPABASE_URL: {process.env.NEXT_PUBLIC_SUPABASE_URL || "NOT SET"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Generate slug from team data
function getTeamSlug(team: Team, league: string): string {
  const nameSlug = team.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${league.toLowerCase()}-${team.teamId}-${nameSlug}`;
}

function TeamDisplay({ 
  team, 
  score, 
  side,
  status,
  league
}: { 
  team: Team; 
  score: number | null;
  side: "home" | "away";
  status: FeaturedGame["status"];
  league: string;
}) {
  const [imgError, setImgError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const slug = getTeamSlug(team, league);
  const teamUrl = `/teams/${league.toLowerCase()}/${slug}`;

  // Use helper to resolve logo URL
  const resolvedUrl = getLogoUrl(team.logoUrl);
  const showFallback = !resolvedUrl || imgError;

  return (
    <div className="flex flex-col items-center">
      {/* Team Logo - Clickable */}
      <Link 
        href={teamUrl}
        className="w-20 h-20 md:w-32 md:h-32 rounded-2xl flex items-center justify-center mb-3 shadow-xl overflow-hidden hover:ring-4 hover:ring-white/30 transition relative"
        style={{ 
          backgroundColor: team.primaryColor || "#374151",
          boxShadow: team.primaryColor ? `0 10px 40px ${team.primaryColor}40` : undefined
        }}
      >
        {/* Fallback initials */}
        <span className={`text-white font-bold text-2xl md:text-4xl ${!showFallback && isLoaded ? 'opacity-0' : 'opacity-100'} transition-opacity`}>
          {team.abbreviation}
        </span>
        
        {/* Image overlay - using native img to bypass Next.js Image optimization */}
        {resolvedUrl && !imgError && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resolvedUrl}
            alt={team.fullName}
            width={80}
            height={80}
            data-img-src={resolvedUrl}
            data-original-logo={team.logoUrl || "null"}
            className={`object-contain w-16 h-16 md:w-24 md:h-24 absolute transition-opacity duration-200 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setIsLoaded(true)}
            onError={() => setImgError(true)}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
          />
        )}
      </Link>

      {/* Score (if game has started) */}
      {status !== "scheduled" && score !== null && (
        <div className="text-3xl md:text-5xl font-black text-white mb-2">
          {score}
        </div>
      )}

      {/* Team Name */}
      <div className="text-center">
        <div className="text-white font-bold text-sm md:text-lg">{team.city}</div>
        <div className="text-white/70 text-xs md:text-sm">{team.name}</div>
      </div>

      {/* Home indicator */}
      {side === "home" && (
        <div className="mt-2 text-xs text-white/50 uppercase tracking-wider">Home</div>
      )}
    </div>
  );
}

function OffseasonHero() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1f2e] to-[#0d1117] p-8 md:p-12">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 text-center py-8">
        <div className="text-6xl mb-4">🏈</div>
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
          NFL Season Returning Soon
        </h2>
        <p className="text-white/60 max-w-md mx-auto mb-6">
          Check back when the season starts to make your picks on upcoming matchups
        </p>
        <Link href="/sports">
          <Button 
            className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold px-6 shadow-lg"
          >
            View All Teams
          </Button>
        </Link>
      </div>
    </div>
  );
}
