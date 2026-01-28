"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { TopNav } from "@/components/TopNav";
import { MainFooter } from "@/components/MainFooter";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  AlertCircle, 
  Calendar, 
  Tv, 
  ChevronLeft,
  Trophy,
  Clock,
  MapPin
} from "lucide-react";

interface Team {
  teamId: number;
  name: string;
  city: string;
  abbreviation: string;
  fullName: string;
  logoUrl: string | null;
  primaryColor: string | null;
}

interface GameDetails {
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
  quarter: string | null;
  timeRemaining: string | null;
  possession: string | null;
  isPlayoffs: boolean;
}

interface GameResponse {
  game: GameDetails | null;
  error?: string;
}

export default function NFLGamePage() {
  const params = useParams();
  const gameId = params.gameId as string;
  
  const [game, setGame] = useState<GameDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGame() {
      if (!gameId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const res = await fetch(`/api/sports/game?league=nfl&gameId=${gameId}`);
        const data: GameResponse = await res.json();
        
        if (!res.ok || !data.game) {
          throw new Error(data.error || "Game not found");
        }
        
        setGame(data.game);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load game");
      } finally {
        setLoading(false);
      }
    }

    fetchGame();
  }, [gameId]);

  return (
    <div className="min-h-screen bg-[color:var(--app-bg)] text-[color:var(--text-strong)]">
      <TopNav />
      
      <main className="max-w-4xl mx-auto p-4 md:p-6">
        {/* Back Link */}
        <Link 
          href="/nfl" 
          className="inline-flex items-center gap-2 text-sm text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)] mb-6"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to NFL
        </Link>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-20">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <p className="text-red-500 mb-4">{error}</p>
            <Link href="/sports">
              <Button variant="outline">Back to NFL Games</Button>
            </Link>
          </div>
        )}

        {game && (
          <>
            {/* Game Header */}
            <div className="bg-gradient-to-br from-[#1a1f2e] to-[#0d1117] rounded-2xl p-6 md:p-8 mb-6">
              {/* Status Badge */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  {game.isPlayoffs && (
                    <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                      <Trophy className="h-4 w-4" />
                      <span>PLAYOFFS</span>
                    </div>
                  )}
                  <span className="text-white/70 text-sm">{game.name}</span>
                </div>
                <StatusBadge status={game.status} quarter={game.quarter} timeRemaining={game.timeRemaining} />
              </div>

              {/* Teams Display */}
              <div className="flex items-center justify-between gap-4 mb-8">
                <TeamDisplay team={game.awayTeam} score={game.awayScore} isWinner={game.status === "final" && (game.awayScore || 0) > (game.homeScore || 0)} />
                
                <div className="text-center">
                  {game.status === "scheduled" ? (
                    <div className="text-3xl font-black text-white/30">VS</div>
                  ) : (
                    <div className="text-2xl font-bold text-white/50">-</div>
                  )}
                </div>
                
                <TeamDisplay team={game.homeTeam} score={game.homeScore} isWinner={game.status === "final" && (game.homeScore || 0) > (game.awayScore || 0)} isHome />
              </div>

              {/* Game Info */}
              <div className="flex flex-wrap items-center justify-center gap-6 text-white/70 text-sm">
                {game.status === "scheduled" && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {new Date(game.startTime).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                )}
                {game.channel && (
                  <div className="flex items-center gap-2">
                    <Tv className="h-4 w-4" />
                    <span>{game.channel}</span>
                  </div>
                )}
                {game.venue && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{game.venue}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Make a Pick Section */}
            {game.status === "scheduled" && (
              <div className="bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4">Make Your Pick</h2>
                <p className="text-sm text-[color:var(--text-muted)] mb-6">
                  Who do you think will win this matchup?
                </p>
                <div className="flex gap-4">
                  <Button 
                    className="flex-1 h-14 bg-green-600 hover:bg-green-700 text-white font-bold"
                    style={{ backgroundColor: game.awayTeam.primaryColor || undefined }}
                  >
                    <span className="flex flex-col">
                      <span className="text-lg">{game.awayTeam.abbreviation}</span>
                      <span className="text-xs opacity-80">{game.awayTeam.name}</span>
                    </span>
                  </Button>
                  <Button 
                    className="flex-1 h-14 bg-green-600 hover:bg-green-700 text-white font-bold"
                    style={{ backgroundColor: game.homeTeam.primaryColor || undefined }}
                  >
                    <span className="flex flex-col">
                      <span className="text-lg">{game.homeTeam.abbreviation}</span>
                      <span className="text-xs opacity-80">{game.homeTeam.name}</span>
                    </span>
                  </Button>
                </div>
                <p className="text-xs text-[color:var(--text-subtle)] text-center mt-4">
                  Picks are for entertainment purposes only
                </p>
              </div>
            )}

            {/* Game In Progress */}
            {game.status === "in_progress" && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 text-center">
                <div className="flex items-center justify-center gap-2 text-green-500 mb-2">
                  <Clock className="h-5 w-5 animate-pulse" />
                  <span className="font-semibold">Game In Progress</span>
                </div>
                <p className="text-sm text-[color:var(--text-muted)]">
                  {game.quarter && game.timeRemaining && `${game.quarter} - ${game.timeRemaining}`}
                </p>
              </div>
            )}

            {/* Game Final */}
            {game.status === "final" && (
              <div className="bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl p-6 text-center">
                <p className="text-lg font-semibold mb-2">Final Score</p>
                <p className="text-[color:var(--text-muted)]">
                  {(game.awayScore || 0) > (game.homeScore || 0) 
                    ? `${game.awayTeam.city} ${game.awayTeam.name} win!`
                    : `${game.homeTeam.city} ${game.homeTeam.name} win!`
                  }
                </p>
              </div>
            )}
          </>
        )}
      </main>

      <MainFooter />
    </div>
  );
}

function StatusBadge({ 
  status, 
  quarter, 
  timeRemaining 
}: { 
  status: GameDetails["status"]; 
  quarter: string | null; 
  timeRemaining: string | null;
}) {
  switch (status) {
    case "in_progress":
      return (
        <div className="flex items-center gap-2 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">
          <span className="w-2 h-2 bg-white rounded-full" />
          <span>LIVE</span>
          {quarter && <span>• {quarter}</span>}
        </div>
      );
    case "final":
      return (
        <div className="bg-white/10 text-white/70 px-3 py-1 rounded-full text-sm font-medium">
          Final
        </div>
      );
    case "postponed":
      return (
        <div className="bg-yellow-500/20 text-yellow-500 px-3 py-1 rounded-full text-sm font-medium">
          Postponed
        </div>
      );
    case "canceled":
      return (
        <div className="bg-red-500/20 text-red-500 px-3 py-1 rounded-full text-sm font-medium">
          Canceled
        </div>
      );
    default:
      return (
        <div className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm font-medium">
          Scheduled
        </div>
      );
  }
}

function TeamDisplay({ 
  team, 
  score, 
  isWinner = false,
  isHome = false
}: { 
  team: Team; 
  score: number | null;
  isWinner?: boolean;
  isHome?: boolean;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="flex-1 text-center">
      {/* Team Logo */}
      <div 
        className="w-20 h-20 md:w-28 md:h-28 mx-auto rounded-2xl flex items-center justify-center mb-3 shadow-xl overflow-hidden"
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
            className="object-contain w-14 h-14 md:w-20 md:h-20"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <span className="text-white font-bold text-2xl md:text-3xl">
            {team.abbreviation}
          </span>
        )}
      </div>

      {/* Score */}
      {score !== null && (
        <div className={`text-4xl md:text-5xl font-black mb-2 ${isWinner ? "text-green-500" : "text-white"}`}>
          {score}
        </div>
      )}

      {/* Team Name */}
      <div className="text-white font-bold text-sm md:text-base">{team.city}</div>
      <div className="text-white/60 text-xs md:text-sm">{team.name}</div>
      
      {/* Home indicator */}
      {isHome && (
        <div className="mt-2 text-xs text-white/40 uppercase tracking-wider">Home</div>
      )}
    </div>
  );
}
