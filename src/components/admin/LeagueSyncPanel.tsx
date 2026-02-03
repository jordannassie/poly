"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  RefreshCw, 
  Zap, 
  Calendar, 
  Database, 
  Users, 
  Radio,
  CheckCircle,
  XCircle,
  Clock,
  Layers
} from "lucide-react";

// Supported leagues
const LEAGUES = [
  { id: "nfl", name: "NFL", icon: "🏈", color: "#013369" },
  { id: "nba", name: "NBA", icon: "🏀", color: "#C9082A" },
  { id: "mlb", name: "MLB", icon: "⚾", color: "#002D72" },
  { id: "nhl", name: "NHL", icon: "🏒", color: "#000000" },
  { id: "soccer", name: "Soccer", icon: "⚽", color: "#37003C" },
];

type SyncAction = "test" | "teams" | "games" | "next365" | "scores" | "syncAll" | "syncLeagues" | "nflGames90" | "syncAllGames" | null;

// Response from sync-all endpoint
interface SyncAllLeagueResult {
  league: string;
  success: boolean;
  totalTeams: number;
  inserted: number;
  updated: number;
  logosUploaded: number;
  logosFailed: number;
  error?: string;
  reason?: string;
  attemptedSeasons?: string[];
}

interface SyncAllResponse {
  ok: boolean;
  results: SyncAllLeagueResult[];
  totals: {
    totalTeams: number;
    inserted: number;
    updated: number;
    logosUploaded: number;
    logosFailed: number;
  };
  message: string;
  error?: string;
}

// Response from leagues sync-all endpoint
interface SyncLeaguesLeagueResult {
  sport: string;
  success: boolean;
  totalLeagues: number;
  inserted: number;
  updated: number;
  leagues?: Array<{ id: number; name: string }>;
  error?: string;
}

interface SyncLeaguesResponse {
  ok: boolean;
  results: SyncLeaguesLeagueResult[];
  totals: {
    totalLeagues: number;
    inserted: number;
    updated: number;
  };
  message: string;
  error?: string;
}

interface ApiResponse {
  ok: boolean;
  error?: string;
  message?: string;
  league?: string;
  totalTeams?: number;
  inserted?: number;
  updated?: number;
  logosUploaded?: number;
  logosFailed?: number;
  gamesInserted?: number;
  gamesUpdated?: number;
  status?: number;
  // Season info for teams sync
  seasonUsed?: number | null;
  seasonsTried?: number[];
  endpoint?: string;
  latencyMs?: number;
  account?: {
    firstname?: string;
    lastname?: string;
    email?: string;
  };
  subscription?: {
    plan?: string;
    active?: boolean;
  };
  requests?: {
    current?: number;
    limit_day?: number;
    remaining?: number;
  };
  dateRange?: {
    from: string;
    to: string;
    days: number;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

// Response from NFL games sync
interface NFLGamesSyncResult {
  ok: boolean;
  ms?: number;
  league?: string;
  fromDate?: string;
  toDate?: string;
  totalGames?: number;
  inserted?: number;
  updated?: number;
  message?: string;
  error?: string;
}

// Job for syncing games in windows
interface SyncGameJob {
  league: string;
  windowIndex: number;
  totalWindows: number;
  fromDate: string;
  toDate: string;
}

// Progress tracking for Sync All Games
interface SyncAllGamesProgress {
  totalJobs: number;
  completedJobs: number;
  currentLeague: string;
  currentWindow: number;
  totalWindowsForLeague: number;
  leagueProgress: {
    [league: string]: {
      completed: number;
      total: number;
      games: number;
      inserted: number;
      updated: number;
      error?: string;
    };
  };
  totals: {
    games: number;
    inserted: number;
    updated: number;
  };
  failedJobIndex?: number;
  failedError?: string;
  done: boolean;
}

export function LeagueSyncPanel() {
  const [selectedLeague, setSelectedLeague] = useState<string>("nfl");
  const [fromDate, setFromDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(() => {
    const future = new Date();
    future.setDate(future.getDate() + 7);
    return future.toISOString().split("T")[0];
  });
  const [loading, setLoading] = useState<SyncAction>(null);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [syncAllResult, setSyncAllResult] = useState<SyncAllResponse | null>(null);
  const [syncLeaguesResult, setSyncLeaguesResult] = useState<SyncLeaguesResponse | null>(null);
  const [nflGamesResult, setNflGamesResult] = useState<NFLGamesSyncResult | null>(null);
  const [syncAllGamesProgress, setSyncAllGamesProgress] = useState<SyncAllGamesProgress | null>(null);
  const [syncAllGamesJobs, setSyncAllGamesJobs] = useState<SyncGameJob[]>([]);
  const [syncAllGamesDays, setSyncAllGamesDays] = useState<number>(0);

  const selectedLeagueConfig = LEAGUES.find(l => l.id === selectedLeague);

  // Helper for safe JSON parsing
  const safeParseResponse = async (res: Response): Promise<ApiResponse> => {
    const contentType = res.headers.get("content-type") || "";
    
    if (!contentType.includes("application/json")) {
      const bodyText = await res.text();
      return {
        ok: false,
        error: `Non-JSON response (status: ${res.status}, type: ${contentType}). Body: ${bodyText.substring(0, 200)}`,
      };
    }
    
    try {
      return await res.json();
    } catch (error) {
      const bodyText = await res.text().catch(() => "Could not read body");
      return {
        ok: false,
        error: `JSON parse error: ${error instanceof Error ? error.message : "Unknown"}. Body: ${bodyText.substring(0, 200)}`,
      };
    }
  };

  // Test connection
  const testConnection = async () => {
    setLoading("test");
    setResult(null);
    
    try {
      const res = await fetch(`/api/admin/api-sports/${selectedLeague}/test`);
      const data = await safeParseResponse(res);
      setResult(data);
    } catch (error) {
      setResult({
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(null);
    }
  };

  // Sync teams
  const syncTeams = async () => {
    setLoading("teams");
    setResult(null);
    
    try {
      const res = await fetch(`/api/admin/api-sports/${selectedLeague}/teams/sync`, {
        method: "POST",
      });
      const data = await safeParseResponse(res);
      setResult(data);
    } catch (error) {
      setResult({
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(null);
    }
  };

  // Sync games for date range
  const syncGames = async () => {
    setLoading("games");
    setResult(null);
    
    try {
      const res = await fetch(
        `/api/admin/api-sports/${selectedLeague}/games/sync?from=${fromDate}&to=${toDate}`,
        { method: "POST" }
      );
      const data = await safeParseResponse(res);
      setResult(data);
    } catch (error) {
      setResult({
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(null);
    }
  };

  // Sync next 365 days
  const syncNext365 = async () => {
    setLoading("next365");
    setResult(null);
    
    try {
      const res = await fetch(`/api/admin/api-sports/${selectedLeague}/games/sync-next-365`, {
        method: "POST",
      });
      const data = await safeParseResponse(res);
      setResult(data);
    } catch (error) {
      setResult({
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(null);
    }
  };

  // Update live scores
  const updateScores = async () => {
    setLoading("scores");
    setResult(null);
    
    try {
      const res = await fetch(`/api/admin/api-sports/${selectedLeague}/scores/update`, {
        method: "POST",
      });
      const data = await safeParseResponse(res);
      setResult(data);
    } catch (error) {
      setResult({
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(null);
    }
  };

  // Sync ALL teams - CHUNKED (one sport at a time to avoid timeout)
  const syncAllTeams = async () => {
    setLoading("syncAll");
    setResult(null);
    setSyncAllResult(null);
    
    const sports = ["nfl", "nba", "mlb", "nhl", "soccer"];
    const results: SyncAllLeagueResult[] = [];
    const totals = { totalTeams: 0, inserted: 0, updated: 0, logosUploaded: 0, logosFailed: 0 };
    let hasErrors = false;

    try {
      // Sync each sport sequentially with retries built into the endpoint
      for (const sport of sports) {
        // Update progress before each sport
        setSyncAllResult({
          ok: true,
          results: [...results],
          totals: { ...totals },
          message: `Syncing ${sport.toUpperCase()}... (${results.length}/${sports.length} done)`,
        });
        
        try {
          const res = await fetch(`/api/admin/api-sports/sync/teams?sport=${sport}`, {
            method: "POST",
          });
          
          // Check content-type to avoid JSON parse errors
          const contentType = res.headers.get("content-type") || "";
          if (!contentType.includes("application/json")) {
            const bodyText = await res.text();
            console.error(`[syncAllTeams] ${sport}: Non-JSON response`, {
              status: res.status,
              contentType,
              body: bodyText.substring(0, 200),
            });
            results.push({
              league: sport.toUpperCase(),
              success: false,
              totalTeams: 0,
              inserted: 0,
              updated: 0,
              logosUploaded: 0,
              logosFailed: 0,
              error: `Upstream returned HTML (status ${res.status})`,
            });
            hasErrors = true;
            continue;
          }
          
          const data = await res.json();
          
          // Handle both old (success) and new (ok) response formats
          const isSuccess = data.ok ?? data.success ?? false;
          
          results.push({
            league: sport.toUpperCase(),
            success: isSuccess,
            totalTeams: data.total || 0,
            inserted: data.inserted || 0,
            updated: data.updated || 0,
            logosUploaded: 0,
            logosFailed: 0,
            error: data.error || (data.errors?.join("; ")),
            reason: data.reason,
            attemptedSeasons: data.attemptedSeasons,
          });
          
          totals.totalTeams += data.total || 0;
          totals.inserted += data.inserted || 0;
          totals.updated += data.updated || 0;
          
          if (!isSuccess) hasErrors = true;
          
        } catch (sportError) {
          const msg = sportError instanceof Error ? sportError.message : "Unknown error";
          console.error(`[syncAllTeams] ${sport}: Fetch error`, msg);
          
          // Check for JSON parse errors specifically
          let errorMsg = msg;
          if (msg.includes("Unexpected token")) {
            errorMsg = "Server returned HTML instead of JSON";
          }
          
          results.push({
            league: sport.toUpperCase(),
            success: false,
            totalTeams: 0,
            inserted: 0,
            updated: 0,
            logosUploaded: 0,
            logosFailed: 0,
            error: errorMsg,
          });
          hasErrors = true;
        }
        
        // Update UI after each sport
        setSyncAllResult({
          ok: !hasErrors || results.some(r => r.success),
          results: [...results],
          totals: { ...totals },
          message: `Synced ${results.length}/${sports.length} sports`,
        });
      }
      
      // Final result
      const successCount = results.filter(r => r.success).length;
      setSyncAllResult({
        ok: successCount > 0,
        results,
        totals,
        message: hasErrors 
          ? `Synced ${successCount}/${sports.length} sports (some errors occurred)`
          : `Successfully synced all ${sports.length} sports`,
      });
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error("[syncAllTeams] Global error:", errorMsg);
      setSyncAllResult({
        ok: false,
        results,
        totals,
        message: "Sync failed",
        error: errorMsg,
      });
    } finally {
      setLoading(null);
    }
  };

  // Sync ALL leagues for all sports
  const syncAllLeagues = async () => {
    setLoading("syncLeagues");
    setResult(null);
    setSyncLeaguesResult(null);
    
    try {
      const res = await fetch("/api/admin/api-sports/leagues/sync-all", {
        method: "POST",
      });
      
      // Safe response parsing - check content-type before parsing as JSON
      const contentType = res.headers.get("content-type") || "";
      
      if (!contentType.includes("application/json")) {
        // Response is not JSON (might be HTML error page)
        const bodyText = await res.text();
        setSyncLeaguesResult({
          ok: false,
          results: [],
          totals: { totalLeagues: 0, inserted: 0, updated: 0 },
          message: "",
          error: `Server returned non-JSON (status: ${res.status}, type: ${contentType}). Body: ${bodyText.substring(0, 200)}`,
        });
        return;
      }
      
      const data: SyncLeaguesResponse = await res.json();
      setSyncLeaguesResult(data);
    } catch (error) {
      // JSON parse error or network error
      let errorMsg = error instanceof Error ? error.message : "Unknown error";
      if (errorMsg.includes("Unexpected token")) {
        errorMsg = "Server returned invalid JSON (possibly HTML error page). Check server logs.";
      }
      setSyncLeaguesResult({
        ok: false,
        results: [],
        totals: { totalLeagues: 0, inserted: 0, updated: 0 },
        message: "",
        error: errorMsg,
      });
    } finally {
      setLoading(null);
    }
  };

  // Build jobs for syncing all games across leagues
  const buildSyncJobs = (totalDays: number): SyncGameJob[] => {
    const leagues = ["nfl", "nba", "mlb", "nhl", "soccer"];
    const jobs: SyncGameJob[] = [];
    const windowSize = 7; // 7-day windows
    const totalWindows = Math.ceil(totalDays / windowSize);
    
    const today = new Date();
    
    for (const league of leagues) {
      for (let w = 0; w < totalWindows; w++) {
        const fromOffset = w * windowSize;
        const toOffset = Math.min((w + 1) * windowSize - 1, totalDays - 1);
        
        const fromDate = new Date(today);
        fromDate.setDate(fromDate.getDate() + fromOffset);
        
        const toDate = new Date(today);
        toDate.setDate(toDate.getDate() + toOffset);
        
        jobs.push({
          league,
          windowIndex: w,
          totalWindows,
          fromDate: fromDate.toISOString().split("T")[0],
          toDate: toDate.toISOString().split("T")[0],
        });
      }
    }
    
    return jobs;
  };

  // Sync All Games for all leagues
  const syncAllGames = async (totalDays: number, resumeFromIndex: number = 0) => {
    setLoading("syncAllGames");
    setSyncAllGamesDays(totalDays);
    
    // Build jobs if starting fresh
    let jobs = syncAllGamesJobs;
    if (resumeFromIndex === 0 || jobs.length === 0) {
      jobs = buildSyncJobs(totalDays);
      setSyncAllGamesJobs(jobs);
    }
    
    const leagues = ["nfl", "nba", "mlb", "nhl", "soccer"];
    const windowsPerLeague = Math.ceil(totalDays / 7);
    
    // Initialize progress
    const leagueProgress: SyncAllGamesProgress["leagueProgress"] = {};
    for (const league of leagues) {
      leagueProgress[league] = {
        completed: 0,
        total: windowsPerLeague,
        games: 0,
        inserted: 0,
        updated: 0,
      };
    }
    
    // If resuming, restore previous progress
    if (resumeFromIndex > 0 && syncAllGamesProgress) {
      Object.assign(leagueProgress, syncAllGamesProgress.leagueProgress);
    }
    
    const progress: SyncAllGamesProgress = {
      totalJobs: jobs.length,
      completedJobs: resumeFromIndex,
      currentLeague: "",
      currentWindow: 0,
      totalWindowsForLeague: windowsPerLeague,
      leagueProgress,
      totals: syncAllGamesProgress?.totals || { games: 0, inserted: 0, updated: 0 },
      done: false,
    };
    
    setSyncAllGamesProgress(progress);
    
    try {
      for (let i = resumeFromIndex; i < jobs.length; i++) {
        const job = jobs[i];
        
        // Update current job info
        progress.currentLeague = job.league.toUpperCase();
        progress.currentWindow = job.windowIndex + 1;
        progress.completedJobs = i;
        setSyncAllGamesProgress({ ...progress });
        
        try {
          const res = await fetch(
            `/api/admin/api-sports/${job.league}/games/sync?from=${job.fromDate}&to=${job.toDate}`,
            { method: "POST" }
          );
          
          const contentType = res.headers.get("content-type") || "";
          
          if (!contentType.includes("application/json")) {
            const bodyText = await res.text();
            throw new Error(`Non-JSON response (${res.status}): ${bodyText.substring(0, 100)}`);
          }
          
          const data = await res.json();
          
          if (!data.ok) {
            throw new Error(data.error || "Sync failed");
          }
          
          // Update league progress
          leagueProgress[job.league].completed++;
          leagueProgress[job.league].games += data.totalGames || 0;
          leagueProgress[job.league].inserted += data.inserted || 0;
          leagueProgress[job.league].updated += data.updated || 0;
          
          // Update totals
          progress.totals.games += data.totalGames || 0;
          progress.totals.inserted += data.inserted || 0;
          progress.totals.updated += data.updated || 0;
          
          progress.completedJobs = i + 1;
          setSyncAllGamesProgress({ ...progress });
          
        } catch (jobError) {
          const errorMsg = jobError instanceof Error ? jobError.message : "Unknown error";
          console.error(`[syncAllGames] Job ${i} failed:`, errorMsg);
          
          // Store failure info for resume
          leagueProgress[job.league].error = errorMsg;
          progress.failedJobIndex = i;
          progress.failedError = `${job.league.toUpperCase()} window ${job.windowIndex + 1}: ${errorMsg}`;
          progress.done = false;
          setSyncAllGamesProgress({ ...progress });
          setLoading(null);
          return; // Stop here, allow resume
        }
      }
      
      // All done!
      progress.done = true;
      progress.completedJobs = jobs.length;
      setSyncAllGamesProgress({ ...progress });
      
    } finally {
      setLoading(null);
    }
  };

  // Resume sync from failed job
  const resumeSyncAllGames = () => {
    if (syncAllGamesProgress?.failedJobIndex !== undefined && syncAllGamesDays > 0) {
      syncAllGames(syncAllGamesDays, syncAllGamesProgress.failedJobIndex);
    }
  };

  // Sync NFL Games (Next 90 Days)
  const syncNFLGames90Days = async () => {
    setLoading("nflGames90");
    setNflGamesResult(null);
    
    try {
      const res = await fetch("/api/admin/api-sports/nfl/games/sync", {
        method: "POST",
      });
      
      const contentType = res.headers.get("content-type") || "";
      
      if (!contentType.includes("application/json")) {
        const bodyText = await res.text();
        setNflGamesResult({
          ok: false,
          error: `Non-JSON response (status: ${res.status}). Body: ${bodyText.substring(0, 200)}`,
        });
        return;
      }
      
      const data: NFLGamesSyncResult = await res.json();
      setNflGamesResult(data);
    } catch (error) {
      let errorMsg = error instanceof Error ? error.message : "Unknown error";
      if (errorMsg.includes("Unexpected token")) {
        errorMsg = "Server returned invalid JSON. Check server logs.";
      }
      setNflGamesResult({
        ok: false,
        error: errorMsg,
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Bulk Sync - ALL Teams */}
      <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/50 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Layers className="h-5 w-5 text-purple-400" />
              Bulk Sync - All Leagues
            </h3>
            <p className="text-gray-400 text-sm mt-1">
              Sync teams + logos for NFL, NBA, MLB, NHL, and Soccer in one click.
            </p>
          </div>
          <Button
            onClick={syncAllTeams}
            disabled={loading !== null}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 text-lg"
          >
            {loading === "syncAll" ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                Syncing All Leagues...
              </>
            ) : (
              <>
                <Layers className="h-5 w-5 mr-2" />
                Sync ALL Teams + Logos
              </>
            )}
          </Button>
        </div>

        {/* Progress/Results for Sync All */}
        {loading === "syncAll" && (
          <div className="mt-4 bg-[#21262d] rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Syncing leagues: NFL → NBA → MLB → NHL → Soccer...</span>
            </div>
          </div>
        )}

        {syncAllResult && (
          <div className={`mt-4 rounded-lg p-4 ${
            syncAllResult.ok ? "bg-green-900/20 border border-green-600/50" : "bg-yellow-900/20 border border-yellow-600/50"
          }`}>
            {/* Summary */}
            <div className="flex items-center gap-2 mb-3">
              {syncAllResult.ok ? (
                <CheckCircle className="h-5 w-5 text-green-400" />
              ) : (
                <XCircle className="h-5 w-5 text-yellow-400" />
              )}
              <span className="text-white font-medium">{syncAllResult.message}</span>
            </div>

            {/* Error message */}
            {syncAllResult.error && (
              <div className="text-yellow-400 bg-yellow-900/30 px-3 py-2 rounded mb-3">
                {syncAllResult.error}
              </div>
            )}

            {/* Per-league results */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-4">
              {syncAllResult.results.map((leagueResult) => {
                const leagueConfig = LEAGUES.find(l => l.id === leagueResult.league.toLowerCase());
                return (
                  <div 
                    key={leagueResult.league}
                    className={`bg-[#21262d] px-3 py-2 rounded text-sm ${
                      leagueResult.success ? "" : "border border-yellow-600/50"
                    }`}
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <span>{leagueConfig?.icon || "🏆"}</span>
                      <span className="text-white font-medium">{leagueResult.league}</span>
                      {leagueResult.success ? (
                        <CheckCircle className="h-3 w-3 text-green-400 ml-auto" />
                      ) : (
                        <XCircle className="h-3 w-3 text-yellow-400 ml-auto" />
                      )}
                    </div>
                    <div className="text-gray-400 text-xs">
                      {leagueResult.success ? (
                        <>{leagueResult.totalTeams} teams, {leagueResult.logosUploaded} logos</>
                      ) : (
                        <span className="text-yellow-400">
                          {leagueResult.reason || leagueResult.error || "Failed"}
                          {leagueResult.attemptedSeasons && (
                            <span className="block text-xs text-gray-500">
                              Tried: {leagueResult.attemptedSeasons.join(", ")}
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Totals */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
              <div className="bg-[#161b22] px-3 py-2 rounded">
                <div className="text-gray-400">Total Teams</div>
                <div className="text-white font-medium">{syncAllResult.totals.totalTeams}</div>
              </div>
              <div className="bg-[#161b22] px-3 py-2 rounded">
                <div className="text-gray-400">Inserted</div>
                <div className="text-green-400 font-medium">{syncAllResult.totals.inserted}</div>
              </div>
              <div className="bg-[#161b22] px-3 py-2 rounded">
                <div className="text-gray-400">Updated</div>
                <div className="text-blue-400 font-medium">{syncAllResult.totals.updated}</div>
              </div>
              <div className="bg-[#161b22] px-3 py-2 rounded">
                <div className="text-gray-400">Logos Synced</div>
                <div className="text-purple-400 font-medium">{syncAllResult.totals.logosUploaded}</div>
              </div>
              <div className="bg-[#161b22] px-3 py-2 rounded">
                <div className="text-gray-400">Logos Failed</div>
                <div className={`font-medium ${syncAllResult.totals.logosFailed > 0 ? "text-yellow-400" : "text-gray-400"}`}>
                  {syncAllResult.totals.logosFailed}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Sync - ALL Leagues (NBA, MLB, NHL, Soccer) */}
      <div className="bg-gradient-to-r from-green-900/30 to-teal-900/30 border border-green-500/50 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Database className="h-5 w-5 text-green-400" />
              Sync Leagues to Database
            </h3>
            <p className="text-gray-400 text-sm mt-1">
              Sync league info for NBA, MLB, NHL, and Soccer (top-tier leagues only).
            </p>
          </div>
          <Button
            onClick={syncAllLeagues}
            disabled={loading !== null}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 text-lg"
          >
            {loading === "syncLeagues" ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                Syncing Leagues...
              </>
            ) : (
              <>
                <Database className="h-5 w-5 mr-2" />
                Sync ALL Leagues
              </>
            )}
          </Button>
        </div>

        {/* Progress/Results for Sync Leagues */}
        {loading === "syncLeagues" && (
          <div className="mt-4 bg-[#21262d] rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Syncing leagues: NBA → MLB → NHL → Soccer...</span>
            </div>
          </div>
        )}

        {syncLeaguesResult && (
          <div className={`mt-4 rounded-lg p-4 ${
            syncLeaguesResult.ok ? "bg-green-900/20 border border-green-600/50" : "bg-yellow-900/20 border border-yellow-600/50"
          }`}>
            {/* Summary */}
            <div className="flex items-center gap-2 mb-3">
              {syncLeaguesResult.ok ? (
                <CheckCircle className="h-5 w-5 text-green-400" />
              ) : (
                <XCircle className="h-5 w-5 text-yellow-400" />
              )}
              <span className="text-white font-medium">{syncLeaguesResult.message}</span>
            </div>

            {/* Error message */}
            {syncLeaguesResult.error && (
              <div className="text-yellow-400 bg-yellow-900/30 px-3 py-2 rounded mb-3">
                {syncLeaguesResult.error}
              </div>
            )}

            {/* Per-sport results */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
              {syncLeaguesResult.results.map((sportResult) => {
                const sportConfig = LEAGUES.find(l => l.id === sportResult.sport.toLowerCase());
                return (
                  <div 
                    key={sportResult.sport}
                    className={`bg-[#21262d] px-3 py-2 rounded text-sm ${
                      sportResult.success ? "" : "border border-yellow-600/50"
                    }`}
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <span>{sportConfig?.icon || "🏆"}</span>
                      <span className="text-white font-medium">{sportResult.sport}</span>
                      {sportResult.success ? (
                        <CheckCircle className="h-3 w-3 text-green-400 ml-auto" />
                      ) : (
                        <XCircle className="h-3 w-3 text-yellow-400 ml-auto" />
                      )}
                    </div>
                    <div className="text-gray-400 text-xs">
                      {sportResult.success ? (
                        <>{sportResult.totalLeagues} leagues ({sportResult.inserted} new, {sportResult.updated} updated)</>
                      ) : (
                        <span className="text-yellow-400">{sportResult.error || "Failed"}</span>
                      )}
                    </div>
                    {/* Show league names */}
                    {sportResult.leagues && sportResult.leagues.length > 0 && (
                      <div className="text-gray-500 text-xs mt-1 truncate" title={sportResult.leagues.map(l => l.name).join(", ")}>
                        {sportResult.leagues.map(l => l.name).join(", ")}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Totals */}
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="bg-[#161b22] px-3 py-2 rounded">
                <div className="text-gray-400">Total Leagues</div>
                <div className="text-white font-medium">{syncLeaguesResult.totals.totalLeagues}</div>
              </div>
              <div className="bg-[#161b22] px-3 py-2 rounded">
                <div className="text-gray-400">Inserted</div>
                <div className="text-green-400 font-medium">{syncLeaguesResult.totals.inserted}</div>
              </div>
              <div className="bg-[#161b22] px-3 py-2 rounded">
                <div className="text-gray-400">Updated</div>
                <div className="text-blue-400 font-medium">{syncLeaguesResult.totals.updated}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sync NFL Games - Next 90 Days */}
      <div className="bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border border-blue-500/50 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-400" />
              NFL Games Sync
            </h3>
            <p className="text-gray-400 text-sm mt-1">
              Sync NFL games for the next 90 days to sports_games table.
            </p>
          </div>
          <Button
            onClick={syncNFLGames90Days}
            disabled={loading !== null}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 text-lg"
          >
            {loading === "nflGames90" ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                Syncing NFL Games...
              </>
            ) : (
              <>
                <Calendar className="h-5 w-5 mr-2" />
                Sync NFL Games (Next 90 Days)
              </>
            )}
          </Button>
        </div>

        {/* Progress for NFL Games Sync */}
        {loading === "nflGames90" && (
          <div className="mt-4 bg-[#21262d] rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Fetching NFL games from API-Sports...</span>
            </div>
          </div>
        )}

        {/* Results for NFL Games Sync */}
        {nflGamesResult && (
          <div className={`mt-4 rounded-lg p-4 ${
            nflGamesResult.ok ? "bg-green-900/20 border border-green-600/50" : "bg-yellow-900/20 border border-yellow-600/50"
          }`}>
            {/* Summary */}
            <div className="flex items-center gap-2 mb-3">
              {nflGamesResult.ok ? (
                <CheckCircle className="h-5 w-5 text-green-400" />
              ) : (
                <XCircle className="h-5 w-5 text-yellow-400" />
              )}
              <span className="text-white font-medium">
                {nflGamesResult.message || (nflGamesResult.ok ? "Success" : "Failed")}
              </span>
            </div>

            {/* Error message */}
            {nflGamesResult.error && (
              <div className="text-yellow-400 bg-yellow-900/30 px-3 py-2 rounded mb-3">
                {nflGamesResult.error}
              </div>
            )}

            {/* Stats */}
            {nflGamesResult.ok && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div className="bg-[#161b22] px-3 py-2 rounded">
                  <div className="text-gray-400">Date Range</div>
                  <div className="text-white font-medium text-xs">
                    {nflGamesResult.fromDate} → {nflGamesResult.toDate}
                  </div>
                </div>
                <div className="bg-[#161b22] px-3 py-2 rounded">
                  <div className="text-gray-400">Total Games</div>
                  <div className="text-white font-medium">{nflGamesResult.totalGames || 0}</div>
                </div>
                <div className="bg-[#161b22] px-3 py-2 rounded">
                  <div className="text-gray-400">Inserted</div>
                  <div className="text-green-400 font-medium">{nflGamesResult.inserted || 0}</div>
                </div>
                <div className="bg-[#161b22] px-3 py-2 rounded">
                  <div className="text-gray-400">Updated</div>
                  <div className="text-blue-400 font-medium">{nflGamesResult.updated || 0}</div>
                </div>
              </div>
            )}

            {/* Timing */}
            {nflGamesResult.ms && (
              <div className="mt-2 text-xs text-gray-500">
                Completed in {(nflGamesResult.ms / 1000).toFixed(1)}s
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sync All Games - All Leagues */}
      <div className="bg-gradient-to-r from-orange-900/30 to-red-900/30 border border-orange-500/50 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-400" />
              Sync All Games - All Leagues
            </h3>
            <p className="text-gray-400 text-sm mt-1">
              Sync games for NFL, NBA, MLB, NHL, and Soccer. Runs in 7-day windows sequentially.
            </p>
          </div>
        </div>

        {/* Sync Buttons */}
        <div className="flex flex-wrap gap-3 mb-4">
          <Button
            onClick={() => syncAllGames(7)}
            disabled={loading !== null}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {loading === "syncAllGames" && syncAllGamesDays === 7 ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Syncing...
              </>
            ) : (
              <>
                <Calendar className="h-4 w-4 mr-2" />
                Sync Next 7 Days
              </>
            )}
          </Button>
          
          <Button
            onClick={() => syncAllGames(30)}
            disabled={loading !== null}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {loading === "syncAllGames" && syncAllGamesDays === 30 ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Syncing...
              </>
            ) : (
              <>
                <Calendar className="h-4 w-4 mr-2" />
                Sync Next 30 Days
              </>
            )}
          </Button>
          
          <Button
            onClick={() => syncAllGames(365)}
            disabled={loading !== null}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {loading === "syncAllGames" && syncAllGamesDays === 365 ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Syncing...
              </>
            ) : (
              <>
                <Calendar className="h-4 w-4 mr-2" />
                Sync Next 365 Days
              </>
            )}
          </Button>
        </div>

        {/* Progress Display */}
        {syncAllGamesProgress && (
          <div className={`rounded-lg p-4 ${
            syncAllGamesProgress.done 
              ? "bg-green-900/20 border border-green-600/50" 
              : syncAllGamesProgress.failedError 
                ? "bg-yellow-900/20 border border-yellow-600/50"
                : "bg-[#21262d]"
          }`}>
            {/* Current Status */}
            <div className="flex items-center gap-2 mb-3">
              {syncAllGamesProgress.done ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-white font-medium">
                    Sync Complete! {syncAllGamesProgress.totals.games} total games synced.
                  </span>
                </>
              ) : syncAllGamesProgress.failedError ? (
                <>
                  <XCircle className="h-5 w-5 text-yellow-400" />
                  <span className="text-white font-medium">
                    Sync paused due to error
                  </span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-orange-400" />
                  <span className="text-white font-medium">
                    {syncAllGamesProgress.currentLeague} - Window {syncAllGamesProgress.currentWindow}/{syncAllGamesProgress.totalWindowsForLeague}
                  </span>
                  <span className="text-gray-400 text-sm ml-2">
                    ({syncAllGamesProgress.completedJobs}/{syncAllGamesProgress.totalJobs} jobs)
                  </span>
                </>
              )}
            </div>

            {/* Error Message + Resume */}
            {syncAllGamesProgress.failedError && (
              <div className="mb-4">
                <div className="text-yellow-400 bg-yellow-900/30 px-3 py-2 rounded mb-2">
                  {syncAllGamesProgress.failedError}
                </div>
                <Button
                  onClick={resumeSyncAllGames}
                  disabled={loading !== null}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Resume from Failed Job
                </Button>
              </div>
            )}

            {/* Per-League Progress */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-4">
              {LEAGUES.map((league) => {
                const lp = syncAllGamesProgress.leagueProgress[league.id];
                if (!lp) return null;
                const isComplete = lp.completed >= lp.total;
                const isCurrent = syncAllGamesProgress.currentLeague === league.id.toUpperCase() && !syncAllGamesProgress.done;
                
                return (
                  <div 
                    key={league.id}
                    className={`bg-[#161b22] px-3 py-2 rounded text-sm ${
                      isCurrent ? "ring-2 ring-orange-500" : ""
                    } ${lp.error ? "border border-yellow-600/50" : ""}`}
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <span>{league.icon}</span>
                      <span className="text-white font-medium">{league.name}</span>
                      {isComplete && !lp.error ? (
                        <CheckCircle className="h-3 w-3 text-green-400 ml-auto" />
                      ) : lp.error ? (
                        <XCircle className="h-3 w-3 text-yellow-400 ml-auto" />
                      ) : isCurrent ? (
                        <RefreshCw className="h-3 w-3 text-orange-400 animate-spin ml-auto" />
                      ) : (
                        <Clock className="h-3 w-3 text-gray-500 ml-auto" />
                      )}
                    </div>
                    <div className="text-gray-400 text-xs">
                      {lp.completed}/{lp.total} windows
                    </div>
                    {lp.games > 0 && (
                      <div className="text-green-400 text-xs">
                        {lp.games} games ({lp.inserted} new)
                      </div>
                    )}
                    {lp.error && (
                      <div className="text-yellow-400 text-xs truncate" title={lp.error}>
                        Error
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Totals */}
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="bg-[#161b22] px-3 py-2 rounded">
                <div className="text-gray-400">Total Games</div>
                <div className="text-white font-medium">{syncAllGamesProgress.totals.games}</div>
              </div>
              <div className="bg-[#161b22] px-3 py-2 rounded">
                <div className="text-gray-400">Inserted</div>
                <div className="text-green-400 font-medium">{syncAllGamesProgress.totals.inserted}</div>
              </div>
              <div className="bg-[#161b22] px-3 py-2 rounded">
                <div className="text-gray-400">Updated</div>
                <div className="text-blue-400 font-medium">{syncAllGamesProgress.totals.updated}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* League Selector */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6">
        <h3 className="text-white font-semibold mb-4">Select League</h3>
        <div className="flex flex-wrap gap-2">
          {LEAGUES.map((league) => (
            <button
              key={league.id}
              onClick={() => {
                setSelectedLeague(league.id);
                setResult(null);
              }}
              className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                selectedLeague === league.id
                  ? "bg-blue-600 text-white"
                  : "bg-[#21262d] text-gray-300 hover:bg-[#30363d] hover:text-white"
              }`}
            >
              <span>{league.icon}</span>
              <span>{league.name}</span>
            </button>
          ))}
        </div>
        
        {selectedLeagueConfig && (
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-400">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: selectedLeagueConfig.color }}
            />
            <span>Selected: {selectedLeagueConfig.name}</span>
          </div>
        )}
      </div>

      {/* Date Range Picker */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-blue-400" />
          Date Range (for Games Sync)
        </h3>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm text-gray-400 mb-2">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-3 py-2 bg-[#21262d] border border-[#30363d] rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-3 py-2 bg-[#21262d] border border-[#30363d] rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Sync Actions */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Database className="h-4 w-4 text-purple-400" />
          Sync Actions
        </h3>
        <p className="text-gray-400 text-sm mb-4">
          Sync {selectedLeagueConfig?.name || selectedLeague.toUpperCase()} data from API-Sports to Supabase.
        </p>
        
        <div className="flex flex-wrap gap-3">
          {/* Test Connection */}
          <Button
            onClick={testConnection}
            disabled={loading !== null}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading === "test" ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            Test Connection
          </Button>

          {/* Sync Teams */}
          <Button
            onClick={syncTeams}
            disabled={loading !== null}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {loading === "teams" ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Users className="h-4 w-4 mr-2" />
            )}
            Sync Teams to DB
          </Button>

          {/* Sync Games */}
          <Button
            onClick={syncGames}
            disabled={loading !== null}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {loading === "games" ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Calendar className="h-4 w-4 mr-2" />
            )}
            Sync Games (Range)
          </Button>

          {/* Sync Next 365 Days */}
          <Button
            onClick={syncNext365}
            disabled={loading !== null}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {loading === "next365" ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Clock className="h-4 w-4 mr-2" />
            )}
            Sync Next 365 Days
          </Button>

          {/* Update Live Scores */}
          <Button
            onClick={updateScores}
            disabled={loading !== null}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {loading === "scores" ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Radio className="h-4 w-4 mr-2" />
            )}
            Update Live Scores
          </Button>
        </div>
      </div>

      {/* Results Panel */}
      {result && (
        <div className={`bg-[#161b22] border rounded-xl p-6 ${
          result.ok ? "border-green-600" : "border-yellow-600"
        }`}>
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            {result.ok ? (
              <CheckCircle className="h-5 w-5 text-green-400" />
            ) : (
              <XCircle className="h-5 w-5 text-yellow-400" />
            )}
            {result.ok ? "Success" : "Result"}
          </h3>
          
          <div className="space-y-3">
            {/* Message */}
            {result.message && (
              <div className="text-gray-300">{result.message}</div>
            )}
            
            {/* Error */}
            {result.error && (
              <div className="text-yellow-400 bg-yellow-900/20 px-3 py-2 rounded">
                {result.error}
              </div>
            )}

            {/* Connection Test Results */}
            {result.latencyMs !== undefined && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="bg-[#21262d] px-3 py-2 rounded">
                  <div className="text-gray-400">Latency</div>
                  <div className="text-white font-medium">{result.latencyMs}ms</div>
                </div>
                {result.requests && (
                  <>
                    <div className="bg-[#21262d] px-3 py-2 rounded">
                      <div className="text-gray-400">Requests Today</div>
                      <div className="text-white font-medium">{result.requests.current || 0}</div>
                    </div>
                    <div className="bg-[#21262d] px-3 py-2 rounded">
                      <div className="text-gray-400">Daily Limit</div>
                      <div className="text-white font-medium">{result.requests.limit_day || 0}</div>
                    </div>
                    <div className="bg-[#21262d] px-3 py-2 rounded">
                      <div className="text-gray-400">Remaining</div>
                      <div className="text-white font-medium">{result.requests.remaining || 0}</div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Teams Sync Results */}
            {result.totalTeams !== undefined && (
              <div className="space-y-3">
                {/* Season Info */}
                {(result.seasonUsed !== undefined || result.seasonsTried) && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                    {result.seasonUsed !== undefined && (
                      <div className="bg-[#21262d] px-3 py-2 rounded">
                        <div className="text-gray-400">Season Used</div>
                        <div className="text-green-400 font-medium">
                          {result.seasonUsed ?? "None found"}
                        </div>
                      </div>
                    )}
                    {result.seasonsTried && result.seasonsTried.length > 0 && (
                      <div className="bg-[#21262d] px-3 py-2 rounded">
                        <div className="text-gray-400">Seasons Tried</div>
                        <div className="text-white font-medium">
                          {result.seasonsTried.join(", ")}
                        </div>
                      </div>
                    )}
                    {result.endpoint && (
                      <div className="bg-[#21262d] px-3 py-2 rounded">
                        <div className="text-gray-400">Endpoint</div>
                        <div className="text-blue-400 font-medium text-xs truncate" title={result.endpoint}>
                          {result.endpoint}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Team Counts */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="bg-[#21262d] px-3 py-2 rounded">
                    <div className="text-gray-400">Total Teams</div>
                    <div className="text-white font-medium">{result.totalTeams}</div>
                  </div>
                  <div className="bg-[#21262d] px-3 py-2 rounded">
                    <div className="text-gray-400">Inserted</div>
                    <div className="text-green-400 font-medium">{result.inserted || 0}</div>
                  </div>
                  <div className="bg-[#21262d] px-3 py-2 rounded">
                    <div className="text-gray-400">Updated</div>
                    <div className="text-blue-400 font-medium">{result.updated || 0}</div>
                  </div>
                  <div className="bg-[#21262d] px-3 py-2 rounded">
                    <div className="text-gray-400">Logos Synced</div>
                    <div className="text-purple-400 font-medium">{result.logosUploaded || 0}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Games Sync Results */}
            {(result.gamesInserted !== undefined || result.inserted !== undefined) && result.totalTeams === undefined && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {result.dateRange && (
                  <div className="bg-[#21262d] px-3 py-2 rounded col-span-2">
                    <div className="text-gray-400">Date Range</div>
                    <div className="text-white font-medium">
                      {result.dateRange.from} to {result.dateRange.to} ({result.dateRange.days} days)
                    </div>
                  </div>
                )}
                <div className="bg-[#21262d] px-3 py-2 rounded">
                  <div className="text-gray-400">Games Inserted</div>
                  <div className="text-green-400 font-medium">{result.gamesInserted || result.inserted || 0}</div>
                </div>
                <div className="bg-[#21262d] px-3 py-2 rounded">
                  <div className="text-gray-400">Games Updated</div>
                  <div className="text-blue-400 font-medium">{result.gamesUpdated || result.updated || 0}</div>
                </div>
              </div>
            )}

            {/* Subscription Info */}
            {result.subscription && (
              <div className="text-sm text-gray-400 mt-2">
                Plan: <span className="text-white">{result.subscription.plan}</span>
                {result.subscription.active !== undefined && (
                  <span className={result.subscription.active ? " text-green-400" : " text-red-400"}>
                    {result.subscription.active ? " (Active)" : " (Inactive)"}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
