"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Calendar, ChevronRight } from "lucide-react";
import { LightningLoader } from "@/components/ui/LightningLoader";
import { Button } from "@/components/ui/button";
import { getLogoUrl } from "@/lib/images/getLogoUrl";

interface Team {
  teamId: number;
  abbreviation: string;
  name: string;
  city: string;
  fullName: string;
  logoUrl: string | null;
  primaryColor: string | null;
}

interface Game {
  gameId: string;
  status: "scheduled" | "in_progress" | "final" | "postponed" | "canceled";
  startTime: string;
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number | null;
  awayScore: number | null;
  venue: string | null;
  channel: string | null;
  week: number;
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
  const homeName = game.homeTeam?.name || game.homeTeam?.fullName;
  const awayName = game.awayTeam?.name || game.awayTeam?.fullName;
  return isValidTeamName(homeName) && isValidTeamName(awayName);
}

interface UpcomingResponse {
  range: { startDate: string; endDate: string };
  count: number;
  games: Game[];
  message?: string;
}

interface UpcomingGamesProps {
  league?: string;
  days?: number;
}

// Filter options for date range
const DATE_FILTERS = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
  { label: "365D", days: 365 },
];

// Get game detail route based on league
function getGameRoute(league: string, gameId: string): string {
  // All leagues can use their dedicated game routes
  const validLeagues = ["nfl", "nba", "mlb", "nhl", "soccer"];
  if (validLeagues.includes(league.toLowerCase())) {
    return `/${league.toLowerCase()}/game/${gameId}`;
  }
  // Fallback to sports page
  return `/sports?league=${league}`;
}

export function UpcomingGames({ league = "nfl", days: initialDays }: UpcomingGamesProps) {
  // Default to 30 days for all leagues - shows more games without being overwhelming
  const defaultDays = 30;
  const [selectedDays, setSelectedDays] = useState(initialDays || defaultDays);
  const [data, setData] = useState<UpcomingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [fallbackTriggered, setFallbackTriggered] = useState(false);
  const [fallbackMessage, setFallbackMessage] = useState<string | null>(null);
  const fallbackLeagues = new Set(["nhl", "soccer", "mlb"]);

  useEffect(() => {
    async function fetchGames() {
      try {
        setLoading(true);
        setSyncMessage(null);
        
        const res = await fetch(`/api/sports/upcoming?league=${league}&days=${selectedDays}`);
        const responseData: UpcomingResponse = await res.json();
        
        // Store message for friendly empty state
        if (responseData.message) {
          setSyncMessage(responseData.message);
        }
        
        const leagueKey = league.toLowerCase();
        console.log(`[UpcomingGames] league=${leagueKey} days=${selectedDays} count=${responseData.count} fallback=${fallbackTriggered}`);

        const shouldFallback =
          fallbackLeagues.has(leagueKey) &&
          selectedDays === 7 &&
          responseData.count === 0 &&
          !fallbackTriggered;

        if (shouldFallback) {
          const fallbackMsg = "No games in the next 7 days. Try 30D/90D/365D.";
          setSyncMessage(fallbackMsg);
          setFallbackMessage(fallbackMsg);
          setFallbackTriggered(true);
          setSelectedDays(365);
          console.log(`[UpcomingGames] fallback triggered for ${leagueKey}`);
          return;
        }
        
        setFallbackMessage(null);
        
        setData(responseData);
      } catch (err) {
        // Set friendly message instead of error
        setSyncMessage("Games will appear once synced from Admin.");
        setData({ range: { startDate: "", endDate: "" }, count: 0, games: [] });
      } finally {
        setLoading(false);
      }
    }

    fetchGames();
  }, [league, selectedDays]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LightningLoader size="md" text="Loading upcoming matchups..." />
      </div>
    );
  }

  if (!data || data.games.length === 0) {
    return (
      <div className="space-y-4">
        {/* Filter Buttons - Show for all leagues */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-[color:var(--text-muted)]">Show:</span>
          {DATE_FILTERS.map((filter) => (
            <Button
              key={filter.days}
              variant={selectedDays === filter.days ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedDays(filter.days)}
              className={selectedDays === filter.days ? "bg-orange-500 hover:bg-orange-600" : ""}
            >
              {filter.label}
            </Button>
          ))}
        </div>
        
        <div className="text-center py-12 bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-[color:var(--text-muted)]" />
          <p className="text-[color:var(--text-muted)]">
            No {league.toUpperCase()} games in the next {selectedDays} days
          </p>
          <p className="text-sm text-[color:var(--text-subtle)] mt-2 max-w-md mx-auto">
          {fallbackMessage || syncMessage || (league === "nfl" 
              ? "Sync more games in Admin → API Sports using \"Sync Next 365 Days\"."
              : "Games will appear once synced from Admin.")}
          </p>
        </div>
      </div>
    );
  }

  // Filter out games with invalid/placeholder teams
  const validGames = data.games.filter(isValidGame);
  
  // Group valid games by date
  const gamesByDate = new Map<string, Game[]>();
  for (const game of validGames) {
    const dateKey = new Date(game.startTime).toISOString().split("T")[0];
    if (!gamesByDate.has(dateKey)) {
      gamesByDate.set(dateKey, []);
    }
    gamesByDate.get(dateKey)!.push(game);
  }

  // Sort dates
  const sortedDates = Array.from(gamesByDate.keys()).sort();
  
  // If no valid games remain after filtering, show empty state
  if (validGames.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-[color:var(--text-muted)]">Show:</span>
          {DATE_FILTERS.map((filter) => (
            <Button
              key={filter.days}
              variant={selectedDays === filter.days ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedDays(filter.days)}
              className={selectedDays === filter.days ? "bg-orange-500 hover:bg-orange-600" : ""}
            >
              {filter.label}
            </Button>
          ))}
        </div>
        
        <div className="text-center py-12 bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-[color:var(--text-muted)]" />
          <p className="text-[color:var(--text-muted)]">
            No {league.toUpperCase()} games in the next {selectedDays} days
          </p>
          <p className="text-sm text-[color:var(--text-subtle)] mt-2 max-w-md mx-auto">
            {fallbackMessage || syncMessage || "Games will appear once synced from Admin."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Buttons - Show for all leagues */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-[color:var(--text-muted)]">Show:</span>
          {DATE_FILTERS.map((filter) => (
            <Button
              key={filter.days}
              variant={selectedDays === filter.days ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedDays(filter.days)}
              className={selectedDays === filter.days ? "bg-orange-500 hover:bg-orange-600" : ""}
            >
              {filter.label}
            </Button>
          ))}
        </div>
        <span className="text-sm text-[color:var(--text-muted)]">
          {validGames.length} matchup{validGames.length !== 1 ? "s" : ""} found
        </span>
      </div>

      {sortedDates.map((dateKey) => {
        const games = gamesByDate.get(dateKey)!;
        const dateObj = new Date(dateKey + "T12:00:00");
        const formattedDate = dateObj.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        });

        return (
          <div key={dateKey}>
            {/* Date Header */}
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-[color:var(--text-muted)]" />
              <h3 className="font-semibold text-[color:var(--text-strong)]">{formattedDate}</h3>
              <span className="text-sm text-[color:var(--text-muted)]">
                ({games.length} {games.length === 1 ? "matchup" : "matchups"})
              </span>
            </div>

            {/* Games for this date */}
            <div className="space-y-3">
              {games.map((game) => (
                <GameCard key={game.gameId} game={game} league={league} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GameCard({ game, league }: { game: Game; league: string }) {
  const [awayImgError, setAwayImgError] = useState(false);
  const [homeImgError, setHomeImgError] = useState(false);

  // Format game time
  const gameTime = new Date(game.startTime).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  // Status display
  const getStatusDisplay = () => {
    switch (game.status) {
      case "in_progress":
        return { text: "LIVE", color: "text-green-500", bg: "bg-green-500/10", live: true };
      case "final":
        return { text: "Final", color: "text-[color:var(--text-muted)]", bg: "", live: false };
      case "postponed":
        return { text: "Postponed", color: "text-yellow-500", bg: "bg-yellow-500/10", live: false };
      case "canceled":
        return { text: "Canceled", color: "text-red-500", bg: "bg-red-500/10", live: false };
      default:
        return { text: gameTime, color: "text-[color:var(--text-muted)]", bg: "", live: false };
    }
  };

  const status = getStatusDisplay();

  return (
    <div className="bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl p-4 hover:border-[color:var(--border-strong)] transition">
      {/* Top Row: Status & Week */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {status.live && (
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          )}
          <span className={`text-sm font-medium ${status.color} ${status.bg} ${status.bg ? "px-2 py-0.5 rounded" : ""}`}>
            {status.text}
          </span>
          {game.channel && (
            <span className="text-xs text-[color:var(--text-subtle)] bg-[color:var(--surface-2)] px-2 py-1 rounded">
              {game.channel}
            </span>
          )}
        </div>
        <span className="text-xs text-[color:var(--text-muted)]">Week {game.week}</span>
      </div>

      {/* Teams Row */}
      <div className="flex items-center justify-between">
        {/* Away Team */}
        <div className="flex items-center gap-3 flex-1">
          <TeamLogo 
            team={game.awayTeam}
            league={league}
            hasError={awayImgError}
            onError={() => setAwayImgError(true)}
          />
          <div>
            <div className="font-semibold text-[color:var(--text-strong)]">
              {game.awayTeam.city}
            </div>
            <div className="text-sm text-[color:var(--text-muted)]">
              {game.awayTeam.name}
            </div>
          </div>
        </div>

        {/* VS / Score */}
        <div className="flex items-center gap-3 px-4">
          {game.status === "scheduled" ? (
            <span className="text-lg font-bold text-[color:var(--text-muted)]">VS</span>
          ) : (
            <>
              <span className={`text-2xl font-bold ${game.status === "final" && (game.awayScore || 0) > (game.homeScore || 0) ? "text-green-500" : "text-[color:var(--text-strong)]"}`}>
                {game.awayScore ?? "-"}
              </span>
              <span className="text-[color:var(--text-muted)]">-</span>
              <span className={`text-2xl font-bold ${game.status === "final" && (game.homeScore || 0) > (game.awayScore || 0) ? "text-green-500" : "text-[color:var(--text-strong)]"}`}>
                {game.homeScore ?? "-"}
              </span>
            </>
          )}
        </div>

        {/* Home Team */}
        <div className="flex items-center gap-3 flex-1 justify-end">
          <div className="text-right">
            <div className="font-semibold text-[color:var(--text-strong)]">
              {game.homeTeam.city}
            </div>
            <div className="text-sm text-[color:var(--text-muted)]">
              {game.homeTeam.name}
            </div>
          </div>
          <TeamLogo 
            team={game.homeTeam}
            league={league}
            hasError={homeImgError}
            onError={() => setHomeImgError(true)}
          />
        </div>
      </div>

      {/* Action Button */}
      {game.status === "scheduled" && (
        <div className="mt-4">
          <Link href={getGameRoute(league, game.gameId)}>
            <Button 
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium group"
            >
              <span>Make Your Pick</span>
              <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

// Generate slug from team data
function getTeamSlug(team: Team, league: string): string {
  const nameSlug = team.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${league.toLowerCase()}-${team.teamId}-${nameSlug}`;
}

function TeamLogo({ 
  team, 
  league,
  hasError, 
  onError 
}: { 
  team: Team; 
  league: string;
  hasError: boolean; 
  onError: () => void;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const slug = getTeamSlug(team, league);
  const teamUrl = `/teams/${league.toLowerCase()}/${slug}`;

  // Use helper to resolve logo URL (converts storage paths to full URLs)
  const resolvedUrl = getLogoUrl(team.logoUrl);
  const showFallback = !resolvedUrl || hasError;

  return (
    <Link 
      href={teamUrl}
      className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-[color:var(--accent)] transition relative"
      style={{ backgroundColor: team.primaryColor || "var(--surface-2)" }}
    >
      {/* Fallback initials - always rendered, hidden when image loads */}
      <span className={`text-white font-bold text-sm ${!showFallback && isLoaded ? 'opacity-0' : 'opacity-100'} transition-opacity`}>
        {team.abbreviation}
      </span>
      
      {/* Image overlay - using native img to bypass Next.js Image optimization */}
      {resolvedUrl && !hasError && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolvedUrl}
          alt={team.fullName}
          width={40}
          height={40}
          data-img-src={resolvedUrl}
          data-original-logo={team.logoUrl || "null"}
          className={`object-contain w-10 h-10 absolute transition-opacity duration-200 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setIsLoaded(true)}
          onError={onError}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
        />
      )}
    </Link>
  );
}
