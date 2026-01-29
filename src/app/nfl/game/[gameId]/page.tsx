"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { TopNav } from "@/components/TopNav";
import { MainFooter } from "@/components/MainFooter";
import { MarketGamePage } from "@/components/market/MarketGamePage";
import { gameToMarketViewModel } from "@/lib/adapters/gameToMarketViewModel";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, ChevronLeft } from "lucide-react";

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

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[color:var(--app-bg)] text-[color:var(--text-strong)]">
        <TopNav />
        <main className="max-w-4xl mx-auto p-4 md:p-6">
          <Link 
            href="/nfl" 
            className="inline-flex items-center gap-2 text-sm text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)] mb-6"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to NFL
          </Link>
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
          </div>
        </main>
        <MainFooter />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-[color:var(--app-bg)] text-[color:var(--text-strong)]">
        <TopNav />
        <main className="max-w-4xl mx-auto p-4 md:p-6">
          <Link 
            href="/nfl" 
            className="inline-flex items-center gap-2 text-sm text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)] mb-6"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to NFL
          </Link>
          <div className="flex flex-col items-center justify-center py-20">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <p className="text-red-500 mb-4">{error}</p>
            <Link href="/nfl">
              <Button variant="outline">Back to NFL Games</Button>
            </Link>
          </div>
        </main>
        <MainFooter />
      </div>
    );
  }

  // No game found
  if (!game) {
    return (
      <div className="min-h-screen bg-[color:var(--app-bg)] text-[color:var(--text-strong)]">
        <TopNav />
        <main className="max-w-4xl mx-auto p-4 md:p-6">
          <Link 
            href="/nfl" 
            className="inline-flex items-center gap-2 text-sm text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)] mb-6"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to NFL
          </Link>
          <div className="flex flex-col items-center justify-center py-20">
            <AlertCircle className="h-12 w-12 text-[color:var(--text-muted)] mb-4" />
            <p className="text-[color:var(--text-muted)] mb-4">Game not found</p>
            <Link href="/nfl">
              <Button variant="outline">Back to NFL Games</Button>
            </Link>
          </div>
        </main>
        <MainFooter />
      </div>
    );
  }

  // Convert game data to MarketViewModel using the adapter
  const marketViewModel = gameToMarketViewModel({
    league: "nfl",
    game: {
      gameId: game.gameId,
      name: game.name,
      startTime: game.startTime,
      status: game.status,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      homeScore: game.homeScore,
      awayScore: game.awayScore,
      venue: game.venue,
      week: game.week,
      channel: game.channel,
      quarter: game.quarter,
      timeRemaining: game.timeRemaining,
      possession: game.possession,
      isPlayoffs: game.isPlayoffs,
    },
  });

  // Render the full market page UI
  return <MarketGamePage market={marketViewModel} />;
}
