"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Calendar } from "lucide-react";
import { LightningLoader } from "@/components/ui/LightningLoader";
import { TeamOutcomeButtonPair } from "@/components/market/TeamOutcomeButton";

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

// Placeholder team names to filter out
const PLACEHOLDER_NAMES = new Set([
  "tbd", "tba", "unknown", "team", "team 1", "team 2",
  "home", "away", "nfc", "afc", "east", "west", "north", "south"
]);

/**
 * Check if a team name is valid (not empty, not a placeholder)
 */
function isValidTeamName(name: string | undefined | null): boolean {
  if (!name || typeof name !== "string") return false;
  const trimmed = name.trim().toLowerCase();
  if (trimmed.length < 2) return false;
  if (PLACEHOLDER_NAMES.has(trimmed)) return false;
  // Check for "Team X" pattern
  if (/^team\s+\d+$/i.test(trimmed) || /^team\s+unknown$/i.test(trimmed)) return false;
  return true;
}

/**
 * Check if a game has valid teams (filters out placeholder games)
 */
function isValidGame(game: Game): boolean {
  // Must have valid home and away team names
  const homeName = game.HomeTeamData?.Name || game.HomeTeam;
  const awayName = game.AwayTeamData?.Name || game.AwayTeam;
  return isValidTeamName(homeName) && isValidTeamName(awayName);
}

interface GamesResponse {
  league: string;
  date: string;
  count: number;
  games: Game[];
  message?: string;
}

interface TodayGamesProps {
  league?: string;
  date?: string; // YYYY-MM-DD format
}

export function TodayGames({ league = "nfl", date }: TodayGamesProps) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayDate, setDisplayDate] = useState<string>("");
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGames() {
      try {
        setLoading(true);
        setSyncMessage(null);
        
        // Use provided date or today
        const targetDate = date || new Date().toISOString().split("T")[0];
        setDisplayDate(targetDate);
        
        const res = await fetch(`/api/sports/games?league=${league}&date=${targetDate}`);
        const data: GamesResponse = await res.json();
        
        // Check for message (friendly empty state from cache)
        if (data.message) {
          setSyncMessage(data.message);
        }
        
        setGames(data.games || []);
      } catch (err) {
        // Set sync message instead of error for better UX
        setSyncMessage("Games will appear once synced from Admin.");
        setGames([]);
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
        <LightningLoader size="md" text="Loading games..." />
      </div>
    );
  }

  // No longer show red error - we use syncMessage for friendly empty state

  return (
    <div>
      {/* Date Header */}
      <div className="flex items-center gap-2 mb-4 text-[color:var(--text-muted)]">
        <Calendar className="h-4 w-4" />
        <span className="text-sm">{formattedDate}</span>
      </div>

      {(() => {
        // Filter out games with invalid/placeholder teams
        const validGames = games.filter(isValidGame);
        
        if (validGames.length === 0) {
          return (
            <div className="text-center py-12 bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-[color:var(--text-muted)]" />
              <p className="text-[color:var(--text-muted)]">
                No {league.toUpperCase()} games today
              </p>
              <p className="text-sm text-[color:var(--text-subtle)] mt-1">
                {syncMessage || "Check back on game days for live updates"}
              </p>
            </div>
          );
        }
        
        return (
          <div className="space-y-3">
            {validGames.map((game) => (
              <GameCard key={game.GameKey} game={game} league={league} />
            ))}
          </div>
        );
      })()}
    </div>
  );
}

function GameCard({ game, league }: { game: Game; league: string }) {
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
  const getGameHref = () => {
    return `/${league}/game/${game.GameKey}`;
  };

  return (
    <Link 
      href={getGameHref()}
      className="block bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl p-4 hover:border-[color:var(--border-strong)] transition"
    >
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
                  alt={awayTeam?.Name || game.AwayTeam || "Away"}
                  width={32}
                  height={32}
                  className="object-contain w-8 h-8"
                  onError={() => setAwayImgError(true)}
                  loading="lazy"
                />
              ) : (
                <span className="text-white font-bold text-xs">{game.AwayTeam || "AWY"}</span>
              )}
            </div>
            <div>
              <div className="font-semibold text-[color:var(--text-strong)]">
                {awayTeam?.City || awayTeam?.Name || game.AwayTeam || "Away Team"}
              </div>
              <div className="text-sm text-[color:var(--text-muted)]">
                {awayTeam?.Name && awayTeam?.City ? awayTeam.Name : ""}
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
                {homeTeam?.City || homeTeam?.Name || game.HomeTeam || "Home Team"}
              </div>
              <div className="text-sm text-[color:var(--text-muted)]">
                {homeTeam?.Name && homeTeam?.City ? homeTeam.Name : ""}
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
                  alt={homeTeam?.Name || game.HomeTeam || "Home"}
                  width={32}
                  height={32}
                  className="object-contain w-8 h-8"
                  onError={() => setHomeImgError(true)}
                  loading="lazy"
                />
              ) : (
                <span className="text-white font-bold text-xs">{game.HomeTeam || "HOM"}</span>
              )}
            </div>
          </div>
        </div>

        {/* Pick Buttons */}
        <div className="mt-4">
          <TeamOutcomeButtonPair
            teamA={{
              name: awayTeam?.Name || game.AwayTeam || "Away",
              abbr: game.AwayTeam || "AWY",
              logoUrl: awayTeam?.WikipediaLogoUrl,
              color: awayTeam?.PrimaryColor ? `#${awayTeam.PrimaryColor}` : "#6366f1",
            }}
            teamB={{
              name: homeTeam?.Name || game.HomeTeam || "Home",
              abbr: game.HomeTeam || "HOM",
              logoUrl: homeTeam?.WikipediaLogoUrl,
              color: homeTeam?.PrimaryColor ? `#${homeTeam.PrimaryColor}` : "#6366f1",
            }}
            priceA={50}
            priceB={50}
            selectedTeam={null}
            onSelectTeam={() => {}}
            compact
          />
        </div>
      </Link>
  );
}
