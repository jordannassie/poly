"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { 
  RefreshCw, 
  Trash2, 
  Flame, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Clock,
  Database,
  Activity
} from "lucide-react";

// Types matching API responses
interface EndpointStatus {
  key: string;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
  lastLatencyMs: number | null;
  successCount: number;
  errorCount: number;
}

interface CacheEntry {
  key: string;
  createdAt: string;
  expiresAt: string;
  ttlMs: number;
  ageMs: number;
  remainingMs: number;
  isExpired: boolean;
}

interface StatusResponse {
  health: "LIVE" | "ONLINE" | "DEGRADED" | "OFFLINE";
  gamesInProgress: boolean;
  statuses: EndpointStatus[];
  cache: {
    stats: { totalEntries: number; sportsDataEntries: number };
    entries: CacheEntry[];
  };
  timestamp: string;
}

const LEAGUES = ["nfl", "nba", "mlb", "nhl"] as const;

export default function AdminSportsPage() {
  const [token, setToken] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [selectedLeague, setSelectedLeague] = useState<string>("nfl");

  // Get token from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");
    if (urlToken) {
      setToken(urlToken);
      setIsAuthenticated(true);
    }
  }, []);

  // Fetch status
  const fetchStatus = useCallback(async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/sports/status?token=${token}`);
      if (!res.ok) {
        if (res.status === 401) {
          setIsAuthenticated(false);
          setMessage({ type: "error", text: "Invalid token" });
          return;
        }
        throw new Error("Failed to fetch status");
      }
      const data = await res.json();
      setStatus(data);
      setIsAuthenticated(true);
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Error fetching status" });
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Auto-refresh status
  useEffect(() => {
    if (isAuthenticated) {
      fetchStatus();
      const interval = setInterval(fetchStatus, 30000); // Refresh every 30s
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, fetchStatus]);

  // Perform action
  const performAction = async (action: string, league: string, date?: string) => {
    setActionLoading(`${action}-${league}`);
    setMessage(null);
    
    try {
      const res = await fetch(`/api/admin/sports/refresh?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, league, date }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Action failed");
      }
      
      setMessage({ type: "success", text: data.message });
      // Refresh status after action
      await fetchStatus();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Action failed" });
    } finally {
      setActionLoading(null);
    }
  };

  // Format time ago
  const timeAgo = (dateStr: string | null): string => {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  // Format milliseconds
  const formatMs = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Health status badge
  const HealthBadge = ({ health, gamesInProgress }: { health: "LIVE" | "ONLINE" | "DEGRADED" | "OFFLINE"; gamesInProgress?: boolean }) => {
    const config = {
      LIVE: { bg: "bg-purple-500/20", text: "text-purple-400", icon: Activity, pulse: true },
      ONLINE: { bg: "bg-green-500/20", text: "text-green-500", icon: CheckCircle, pulse: false },
      DEGRADED: { bg: "bg-yellow-500/20", text: "text-yellow-500", icon: AlertTriangle, pulse: false },
      OFFLINE: { bg: "bg-red-500/20", text: "text-red-500", icon: XCircle, pulse: false },
    };
    const { bg, text, icon: Icon, pulse } = config[health];
    
    return (
      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${bg}`}>
        <Icon className={`h-5 w-5 ${text} ${pulse ? "animate-pulse" : ""}`} />
        <span className={`font-bold ${text}`}>{health}</span>
        {gamesInProgress && health !== "LIVE" && (
          <span className="text-xs text-purple-400">(games active)</span>
        )}
      </div>
    );
  };

  // Login form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4">
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-white mb-6">Admin Access</h1>
          <div className="space-y-4">
            <input
              type="password"
              placeholder="Enter admin token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full px-4 py-3 bg-[#0d1117] border border-[#30363d] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            <Button
              onClick={() => {
                if (token) {
                  setIsAuthenticated(true);
                  // Update URL with token
                  window.history.replaceState({}, "", `?token=${token}`);
                }
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              Access Dashboard
            </Button>
            {message?.type === "error" && (
              <p className="text-red-500 text-sm text-center">{message.text}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">SportsDataIO Admin</h1>
            <p className="text-gray-400 text-sm">Monitor feed health and manage cache</p>
          </div>
          <div className="flex items-center gap-4">
            {status && <HealthBadge health={status.health} gamesInProgress={status.gamesInProgress} />}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchStatus}
              disabled={loading}
              className="border-[#30363d] text-gray-300"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Message Toast */}
        {message && (
          <div className={`p-4 rounded-lg ${
            message.type === "success" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
          }`}>
            {message.text}
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Quick Actions
          </h2>
          <div className="flex flex-wrap items-center gap-4">
            <select
              value={selectedLeague}
              onChange={(e) => setSelectedLeague(e.target.value)}
              className="px-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-white"
            >
              {LEAGUES.map((league) => (
                <option key={league} value={league}>
                  {league.toUpperCase()}
                </option>
              ))}
            </select>
            
            <Button
              onClick={() => performAction("teams", selectedLeague)}
              disabled={actionLoading !== null}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {actionLoading === `teams-${selectedLeague}` ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh Teams
            </Button>
            
            <Button
              onClick={() => performAction("games", selectedLeague)}
              disabled={actionLoading !== null}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {actionLoading === `games-${selectedLeague}` ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh Today&apos;s Games
            </Button>
            
            <Button
              onClick={() => performAction("warm", selectedLeague)}
              disabled={actionLoading !== null}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {actionLoading === `warm-${selectedLeague}` ? (
                <Flame className="h-4 w-4 mr-2 animate-pulse" />
              ) : (
                <Flame className="h-4 w-4 mr-2" />
              )}
              Warm Cache
            </Button>
            
            <Button
              onClick={() => performAction("flush", selectedLeague)}
              disabled={actionLoading !== null}
              variant="outline"
              className="border-red-500 text-red-500 hover:bg-red-500/10"
            >
              {actionLoading === `flush-${selectedLeague}` ? (
                <Trash2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Flush Cache
            </Button>
          </div>
        </div>

        {/* Endpoint Status Table */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Endpoint Status
          </h2>
          
          {status?.statuses && status.statuses.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#30363d] text-gray-400">
                    <th className="text-left py-3 px-4">Endpoint</th>
                    <th className="text-left py-3 px-4">Last Success</th>
                    <th className="text-left py-3 px-4">Latency</th>
                    <th className="text-left py-3 px-4">Success</th>
                    <th className="text-left py-3 px-4">Errors</th>
                    <th className="text-left py-3 px-4">Last Error</th>
                  </tr>
                </thead>
                <tbody>
                  {status.statuses.map((s) => (
                    <tr key={s.key} className={`border-b border-[#30363d]/50 hover:bg-[#0d1117]/50 ${s.lastErrorMessage ? "bg-red-500/5" : ""}`}>
                      <td className="py-3 px-4 font-mono text-blue-400">{s.key}</td>
                      <td className="py-3 px-4">
                        {s.lastSuccessAt ? (
                          <span className="text-green-400">{timeAgo(s.lastSuccessAt)}</span>
                        ) : (
                          <span className="text-gray-500">Never</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {s.lastLatencyMs ? (
                          <span className={s.lastLatencyMs > 2000 ? "text-yellow-400" : "text-gray-300"}>
                            {formatMs(s.lastLatencyMs)}
                          </span>
                        ) : "-"}
                      </td>
                      <td className="py-3 px-4 text-green-400">{s.successCount}</td>
                      <td className="py-3 px-4">
                        {s.errorCount > 0 ? (
                          <span className="text-red-400 font-semibold">{s.errorCount}</span>
                        ) : (
                          <span className="text-gray-500">0</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {s.lastErrorMessage ? (
                          <div className="bg-red-500/10 border border-red-500/30 rounded px-2 py-1 text-xs text-red-400 max-w-md">
                            <div className="font-mono break-all">{s.lastErrorMessage}</div>
                            {s.lastErrorAt && (
                              <div className="text-red-500/60 mt-1">{timeAgo(s.lastErrorAt)}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              No endpoint data yet. Trigger a refresh to populate.
            </p>
          )}
        </div>

        {/* Cache Entries */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Database className="h-5 w-5" />
            Cache Entries
            {status?.cache.stats && (
              <span className="text-sm font-normal text-gray-400">
                ({status.cache.stats.sportsDataEntries} entries)
              </span>
            )}
          </h2>
          
          {status?.cache.entries && status.cache.entries.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#30363d] text-gray-400">
                    <th className="text-left py-3 px-4">Cache Key</th>
                    <th className="text-left py-3 px-4">Age</th>
                    <th className="text-left py-3 px-4">TTL Remaining</th>
                    <th className="text-left py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {status.cache.entries.map((entry) => (
                    <tr key={entry.key} className="border-b border-[#30363d]/50 hover:bg-[#0d1117]/50">
                      <td className="py-3 px-4 font-mono text-blue-400 text-xs">{entry.key}</td>
                      <td className="py-3 px-4">{formatMs(entry.ageMs)}</td>
                      <td className="py-3 px-4">
                        {entry.isExpired ? (
                          <span className="text-red-400">Expired</span>
                        ) : (
                          formatMs(entry.remainingMs)
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {entry.isExpired ? (
                          <span className="inline-flex items-center gap-1 text-red-400">
                            <XCircle className="h-3 w-3" /> Expired
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-green-400">
                            <CheckCircle className="h-3 w-3" /> Valid
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              No cache entries. Warm the cache to populate.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm">
          Last updated: {status?.timestamp ? new Date(status.timestamp).toLocaleString() : "-"}
        </div>
      </div>
    </div>
  );
}
