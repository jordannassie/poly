"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Calendar, Tv, Trophy, ChevronRight } from "lucide-react";
import { LightningLoader } from "@/components/ui/LightningLoader";
import { Button } from "@/components/ui/button";

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
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1f2e] to-[#0d1117]">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500 rounded-full blur-3xl" />
      </div>

      {/* Super Bowl badge */}
      {featured.isSuperBowl && (
        <div className="absolute top-4 left-4 md:top-6 md:left-6 z-10">
          <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
            <Trophy className="h-4 w-4" />
            <span>SUPER BOWL</span>
          </div>
        </div>
      )}

      {/* Live badge */}
      {featured.status === "in_progress" && (
        <div className="absolute top-4 right-4 md:top-6 md:right-6 z-10">
          <div className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-full text-sm font-bold animate-pulse">
            <span className="w-2 h-2 bg-white rounded-full" />
            <span>LIVE</span>
          </div>
        </div>
      )}

      <div className="relative z-10 p-6 md:p-12">
        {/* Game Name */}
        <div className="text-center mb-8">
          <h2 className="text-sm md:text-base text-orange-400 font-semibold uppercase tracking-wider mb-2">
            Featured Matchup
          </h2>
          <h1 className="text-2xl md:text-4xl font-bold text-white">
            {featured.name}
          </h1>
        </div>

        {/* Teams VS Display */}
        <div className="flex items-center justify-center gap-4 md:gap-12 mb-8">
          {/* Away Team */}
          <TeamDisplay team={featured.awayTeam} score={featured.awayScore} side="away" status={featured.status} />

          {/* VS */}
          <div className="flex flex-col items-center">
            {featured.status === "scheduled" ? (
              <div className="text-3xl md:text-5xl font-black text-white/30">VS</div>
            ) : (
              <div className="text-xl md:text-3xl font-bold text-white/50">-</div>
            )}
          </div>

          {/* Home Team */}
          <TeamDisplay team={featured.homeTeam} score={featured.homeScore} side="home" status={featured.status} />
        </div>

        {/* Game Info */}
        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-white/70 text-sm mb-8">
          {featured.status === "scheduled" && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
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
            <div className="flex items-center gap-2">
              <Tv className="h-4 w-4" />
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
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold px-8 py-6 text-lg rounded-xl shadow-lg shadow-orange-500/25 group"
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
      </div>
    </div>
  );
}

function TeamDisplay({ 
  team, 
  score, 
  side,
  status 
}: { 
  team: Team; 
  score: number | null;
  side: "home" | "away";
  status: FeaturedGame["status"];
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="flex flex-col items-center">
      {/* Team Logo */}
      <div 
        className="w-20 h-20 md:w-32 md:h-32 rounded-2xl flex items-center justify-center mb-3 shadow-xl overflow-hidden"
        style={{ 
          backgroundColor: team.primaryColor || "#374151",
          boxShadow: team.primaryColor ? `0 10px 40px ${team.primaryColor}40` : undefined
        }}
      >
        {team.logoUrl && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={team.logoUrl}
            alt={team.fullName}
            width={80}
            height={80}
            className="object-contain w-16 h-16 md:w-24 md:h-24"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <span className="text-white font-bold text-2xl md:text-4xl">
            {team.abbreviation}
          </span>
        )}
      </div>

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
