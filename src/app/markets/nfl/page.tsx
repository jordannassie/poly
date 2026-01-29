"use client";

import { useState, useEffect, useCallback } from "react";
import { TopNav } from "@/components/TopNav";
import { CategoryTabs } from "@/components/CategoryTabs";
import { MainFooter } from "@/components/MainFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Calendar, Trophy } from "lucide-react";
import { getUntypedSupabaseClient } from "@/lib/supabase";
import { LightningLoader } from "@/components/ui/LightningLoader";

// Types for our cached data
interface NFLTeam {
  team_id: number;
  name: string;
  code: string | null;
  logo: string | null;
}

interface NFLGame {
  game_id: number;
  game_date: string | null;
  status: string | null;
  home_team_id: number | null;
  away_team_id: number | null;
  home_score: number | null;
  away_score: number | null;
}

// Format date helper
function formatGameTime(dateStr: string | null): string {
  if (!dateStr) return "TBD";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Get default date range (today + 7 days, or a known NFL week for testing)
function getDefaultDateRange(): { from: string; to: string } {
  const today = new Date();
  const weekLater = new Date(today);
  weekLater.setDate(weekLater.getDate() + 7);

  // Format as YYYY-MM-DD
  const formatDate = (d: Date) => d.toISOString().split("T")[0];

  return {
    from: formatDate(today),
    to: formatDate(weekLater),
  };
}

export default function NFLMarketsPage() {
  const [teams, setTeams] = useState<Map<number, NFLTeam>>(new Map());
  const [games, setGames] = useState<NFLGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Date range state
  const defaultRange = getDefaultDateRange();
  const [fromDate, setFromDate] = useState(defaultRange.from);
  const [toDate, setToDate] = useState(defaultRange.to);

  // Fetch teams once on mount
  useEffect(() => {
    async function fetchTeams() {
      const supabase = getUntypedSupabaseClient();
      if (!supabase) {
        console.error("Supabase client not available");
        return;
      }

      const { data, error } = await supabase
        .from("api_sports_nfl_teams")
        .select("team_id, name, code, logo");

      if (error) {
        console.error("Failed to fetch teams:", error);
        return;
      }

      const teamMap = new Map<number, NFLTeam>();
      for (const team of data || []) {
        teamMap.set(team.team_id, team);
      }
      setTeams(teamMap);
    }

    fetchTeams();
  }, []);

  // Fetch games for date range
  const fetchGames = useCallback(async () => {
    setLoading(true);
    setError(null);

    const supabase = getUntypedSupabaseClient();
    if (!supabase) {
      setError("Supabase client not available");
      setLoading(false);
      return;
    }

    try {
      // Query games in date range
      const { data, error: queryError } = await supabase
        .from("api_sports_nfl_games")
        .select("game_id, game_date, status, home_team_id, away_team_id, home_score, away_score")
        .gte("game_date", `${fromDate}T00:00:00Z`)
        .lte("game_date", `${toDate}T23:59:59Z`)
        .order("game_date", { ascending: true });

      if (queryError) {
        setError(`Query error: ${queryError.message}`);
        setLoading(false);
        return;
      }

      setGames(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }

    setLoading(false);
  }, [fromDate, toDate]);

  // Initial fetch
  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  // Helper to get team info
  const getTeam = (teamId: number | null): NFLTeam | null => {
    if (teamId === null) return null;
    return teams.get(teamId) || null;
  };

  return (
    <div className="min-h-screen bg-[color:var(--app-bg)] text-[color:var(--text-strong)]">
      <TopNav />
      <CategoryTabs activeLabel="NFL Schedule" />

      <main className="flex-1 p-4 md:p-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <Trophy className="h-6 w-6 text-orange-500" />
              <h1 className="text-2xl font-bold">NFL Schedule</h1>
              <span className="text-sm text-[color:var(--text-muted)] bg-[color:var(--surface-2)] px-2 py-1 rounded">
                From DB Cache
              </span>
            </div>
          </div>

          {/* Date Range Picker */}
          <div className="flex flex-wrap items-end gap-3 mb-6 p-4 bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[color:var(--text-muted)]">From</label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[color:var(--text-muted)]" />
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-40 bg-[color:var(--surface-2)] border-[color:var(--border-soft)]"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[color:var(--text-muted)]">To</label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[color:var(--text-muted)]" />
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-40 bg-[color:var(--surface-2)] border-[color:var(--border-soft)]"
                />
              </div>
            </div>
            <Button
              onClick={fetchGames}
              disabled={loading}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>

            {/* Quick date presets */}
            <div className="flex gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFromDate("2025-09-07");
                  setToDate("2025-09-15");
                }}
                className="text-xs"
              >
                Week 1 (Sep 7-15)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date();
                  const nextWeek = new Date(today);
                  nextWeek.setDate(nextWeek.getDate() + 7);
                  setFromDate(today.toISOString().split("T")[0]);
                  setToDate(nextWeek.toISOString().split("T")[0]);
                }}
                className="text-xs"
              >
                Next 7 Days
              </Button>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center py-12">
              <LightningLoader size="lg" text="Loading games..." />
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 mb-6">
              {error}
            </div>
          )}

          {/* No Games Found */}
          {!loading && !error && games.length === 0 && (
            <div className="p-8 text-center bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl">
              <Trophy className="h-12 w-12 text-[color:var(--text-muted)] mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Games Found</h3>
              <p className="text-[color:var(--text-muted)] mb-4">
                No NFL games found in the selected date range.
              </p>
              <p className="text-sm text-[color:var(--text-subtle)]">
                Try using &quot;Week 1 (Sep 7-15)&quot; to see synced games, or sync more games from the Admin panel.
              </p>
            </div>
          )}

          {/* Games List */}
          {!loading && !error && games.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-[color:var(--text-muted)] mb-4">
                Showing {games.length} game{games.length !== 1 ? "s" : ""}
              </p>

              {games.map((game) => {
                const homeTeam = getTeam(game.home_team_id);
                const awayTeam = getTeam(game.away_team_id);
                const hasScore = game.home_score !== null || game.away_score !== null;

                return (
                  <div
                    key={game.game_id}
                    className="bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl p-4 hover:border-[color:var(--border-strong)] transition"
                  >
                    {/* Game Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium bg-[color:var(--surface-2)] px-3 py-1 rounded">
                          {formatGameTime(game.game_date)}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            game.status === "Finished" || game.status === "FT"
                              ? "bg-green-500/20 text-green-400"
                              : game.status === "NS" || game.status === "Not Started"
                              ? "bg-blue-500/20 text-blue-400"
                              : "bg-yellow-500/20 text-yellow-400"
                          }`}
                        >
                          {game.status || "Unknown"}
                        </span>
                      </div>
                      <span className="text-xs text-[color:var(--text-subtle)]">
                        ID: {game.game_id}
                      </span>
                    </div>

                    {/* Teams Display */}
                    <div className="flex items-center justify-between">
                      {/* Away Team (Left) */}
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-12 h-12 rounded-lg bg-[color:var(--surface-2)] flex items-center justify-center overflow-hidden">
                          {awayTeam?.logo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={awayTeam.logo}
                              alt={awayTeam.name}
                              className="w-10 h-10 object-contain"
                              loading="lazy"
                            />
                          ) : (
                            <span className="text-lg font-bold text-[color:var(--text-muted)]">
                              {awayTeam?.code || "?"}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{awayTeam?.name || "Unknown Team"}</div>
                          <div className="text-xs text-[color:var(--text-subtle)]">
                            {awayTeam?.code || "---"}
                          </div>
                        </div>
                      </div>

                      {/* Score / VS */}
                      <div className="flex flex-col items-center px-6">
                        {hasScore ? (
                          <div className="flex items-center gap-3">
                            <span className="text-2xl font-bold">
                              {game.away_score ?? "-"}
                            </span>
                            <span className="text-[color:var(--text-muted)]">-</span>
                            <span className="text-2xl font-bold">
                              {game.home_score ?? "-"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-lg font-semibold text-[color:var(--text-muted)]">
                            VS
                          </span>
                        )}
                      </div>

                      {/* Home Team (Right) */}
                      <div className="flex items-center gap-3 flex-1 justify-end text-right">
                        <div>
                          <div className="font-medium">{homeTeam?.name || "Unknown Team"}</div>
                          <div className="text-xs text-[color:var(--text-subtle)]">
                            {homeTeam?.code || "---"}
                          </div>
                        </div>
                        <div className="w-12 h-12 rounded-lg bg-[color:var(--surface-2)] flex items-center justify-center overflow-hidden">
                          {homeTeam?.logo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={homeTeam.logo}
                              alt={homeTeam.name}
                              className="w-10 h-10 object-contain"
                              loading="lazy"
                            />
                          ) : (
                            <span className="text-lg font-bold text-[color:var(--text-muted)]">
                              {homeTeam?.code || "?"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <MainFooter />
    </div>
  );
}
