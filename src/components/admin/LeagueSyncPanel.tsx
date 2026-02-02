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
  Clock
} from "lucide-react";

// Supported leagues
const LEAGUES = [
  { id: "nfl", name: "NFL", icon: "🏈", color: "#013369" },
  { id: "nba", name: "NBA", icon: "🏀", color: "#C9082A" },
  { id: "mlb", name: "MLB", icon: "⚾", color: "#002D72" },
  { id: "nhl", name: "NHL", icon: "🏒", color: "#000000" },
  { id: "soccer", name: "Soccer", icon: "⚽", color: "#37003C" },
];

type SyncAction = "test" | "teams" | "games" | "next365" | "scores" | null;

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

  const selectedLeagueConfig = LEAGUES.find(l => l.id === selectedLeague);

  // Test connection
  const testConnection = async () => {
    setLoading("test");
    setResult(null);
    
    try {
      const res = await fetch(`/api/admin/api-sports/${selectedLeague}/test`);
      const data: ApiResponse = await res.json();
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
      const data: ApiResponse = await res.json();
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
      const data: ApiResponse = await res.json();
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
      const data: ApiResponse = await res.json();
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
      const data: ApiResponse = await res.json();
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

  return (
    <div className="space-y-6">
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
