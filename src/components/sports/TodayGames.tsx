"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, AlertCircle, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Team {
  TeamID: number;
  Key: string;
  City: string;
  Name: string;
  WikipediaLogoUrl?: string;
  PrimaryColor?: string;
}

interface Game {
  GameKey: string;
  Date: string;
  AwayTeam: string;
  HomeTeam: string;
  AwayScore: number | null;
  HomeScore: number | null;
  Quarter: string | null;
  TimeRemaining: string | null;
  HasStarted: boolean;
  IsInProgress: boolean;
  IsOver: boolean;
  QuarterDescription: string | null;
  Channel: string | null;
  AwayTeamData?: Team;
  HomeTeamData?: Team;
}

interface GamesResponse {
  league: string;
  date: string;
  count: number;
  games: Game[];
}

interface TodayGamesProps {
  league?: string;
  date?: string; // YYYY-MM-DD format
}

export function TodayGames({ league = "nfl", date }: TodayGamesProps) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayDate, setDisplayDate] = useState<string>("");

  useEffect(() => {
    async function fetchGames() {
      try {
        setLoading(true);
        setError(null);
        
        // Use provided date or today
        const targetDate = date || new Date().toISOString().split("T")[0];
        setDisplayDate(targetDate);
        
        const res = await fetch(`/api/sports/games?league=${league}&date=${targetDate}`);
        
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || `Failed to fetch games: ${res.status}`);
        }
        
        const data: GamesResponse = await res.json();
        setGames(data.games);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load games");
      } finally {
        setLoading(false);
      }
    }

    fetchGames();
  }, [league, date]);

  // Format date for display
  const formattedDate = displayDate 
    ? new Date(displayDate + "T12:00:00").toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : "";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[color:var(--text-muted)]" />
        <span className="ml-3 text-[color:var(--text-muted)]">Loading games...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12 text-red-500">
        <AlertCircle className="h-6 w-6 mr-2" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div>
      {/* Date Header */}
      <div className="flex items-center gap-2 mb-4 text-[color:var(--text-muted)]">
        <Calendar className="h-4 w-4" />
        <span className="text-sm">{formattedDate}</span>
      </div>

      {games.length === 0 ? (
        <div className="text-center py-12 bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-[color:var(--text-muted)]" />
          <p className="text-[color:var(--text-muted)]">
            No {league.toUpperCase()} games today
          </p>
          <p className="text-sm text-[color:var(--text-subtle)] mt-1">
            Check back on game days for live updates
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {games.map((game) => (
            <GameCard key={game.GameKey} game={game} />
          ))}
        </div>
      )}
    </div>
  );
}

function GameCard({ game }: { game: Game }) {
  const [awayImgError, setAwayImgError] = useState(false);
  const [homeImgError, setHomeImgError] = useState(false);

  // Determine game status
  const getStatusDisplay = () => {
    if (game.IsOver) {
      return { text: "Final", color: "text-[color:var(--text-muted)]" };
    }
    if (game.IsInProgress) {
      return { 
        text: game.QuarterDescription || `Q${game.Quarter} ${game.TimeRemaining}`, 
        color: "text-green-500",
        live: true
      };
    }
    if (game.HasStarted) {
      return { text: "In Progress", color: "text-green-500", live: true };
    }
    // Game hasn't started - show time
    const gameDate = new Date(game.Date);
    const timeStr = gameDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return { text: timeStr, color: "text-[color:var(--text-muted)]" };
  };

  const status = getStatusDisplay();
  const awayTeam = game.AwayTeamData;
  const homeTeam = game.HomeTeamData;

  // Determine the game detail route based on league
  // NFL has dedicated /nfl/game route, others use /sports for now
  const getGameHref = () => {
    // For now, all leagues link to their respective game pages when available
    // NFL has a dedicated route, others can use a generic sports game route
    return `/nfl/game/${game.GameKey}`; // TODO: Add routes for other leagues
  };

  return (
    <div className="bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl p-4 hover:border-[color:var(--border-strong)] transition cursor-pointer">
        {/* Status Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {status.live && (
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            )}
            <span className={`text-sm font-medium ${status.color}`}>
              {status.text}
            </span>
          </div>
          {game.Channel && (
            <span className="text-xs text-[color:var(--text-subtle)] bg-[color:var(--surface-2)] px-2 py-1 rounded">
              {game.Channel}
            </span>
          )}
        </div>

        {/* Teams Row */}
        <div className="flex items-center justify-between">
          {/* Away Team */}
          <div className="flex items-center gap-3 flex-1">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden"
              style={{ backgroundColor: awayTeam?.PrimaryColor ? `#${awayTeam.PrimaryColor}` : "var(--surface-2)" }}
            >
              {awayTeam?.WikipediaLogoUrl && !awayImgError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={awayTeam.WikipediaLogoUrl}
                  alt={game.AwayTeam}
                  width={32}
                  height={32}
                  className="object-contain w-8 h-8"
                  onError={() => setAwayImgError(true)}
                  loading="lazy"
                />
              ) : (
                <span className="text-white font-bold text-xs">{game.AwayTeam}</span>
              )}
            </div>
            <div>
              <div className="font-semibold text-[color:var(--text-strong)]">
                {awayTeam?.City || game.AwayTeam}
              </div>
              <div className="text-sm text-[color:var(--text-muted)]">
                {awayTeam?.Name || ""}
              </div>
            </div>
          </div>

          {/* Score */}
          <div className="flex items-center gap-4 px-4">
            <span className={`text-2xl font-bold ${game.IsOver && (game.AwayScore || 0) > (game.HomeScore || 0) ? "text-green-500" : "text-[color:var(--text-strong)]"}`}>
              {game.AwayScore ?? "-"}
            </span>
            <span className="text-[color:var(--text-muted)]">@</span>
            <span className={`text-2xl font-bold ${game.IsOver && (game.HomeScore || 0) > (game.AwayScore || 0) ? "text-green-500" : "text-[color:var(--text-strong)]"}`}>
              {game.HomeScore ?? "-"}
            </span>
          </div>

          {/* Home Team */}
          <div className="flex items-center gap-3 flex-1 justify-end">
            <div className="text-right">
              <div className="font-semibold text-[color:var(--text-strong)]">
                {homeTeam?.City || game.HomeTeam}
              </div>
              <div className="text-sm text-[color:var(--text-muted)]">
                {homeTeam?.Name || ""}
              </div>
            </div>
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden"
              style={{ backgroundColor: homeTeam?.PrimaryColor ? `#${homeTeam.PrimaryColor}` : "var(--surface-2)" }}
            >
              {homeTeam?.WikipediaLogoUrl && !homeImgError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={homeTeam.WikipediaLogoUrl}
                  alt={game.HomeTeam}
                  width={32}
                  height={32}
                  className="object-contain w-8 h-8"
                  onError={() => setHomeImgError(true)}
                  loading="lazy"
                />
              ) : (
                <span className="text-white font-bold text-xs">{game.HomeTeam}</span>
              )}
            </div>
          </div>
        </div>

        {/* Pick Buttons */}
        <div className="mt-4 flex gap-2">
          <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm">
            Pick Yes
          </Button>
          <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm">
            Pick No
          </Button>
        </div>
      </div>
  );
}
