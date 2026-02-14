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
  Activity,
  Lock,
  Zap
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

interface LeagueInfo {
  key: string;
  label: string;
  enabled: boolean;
}

interface LeagueStatus {
  key: string;
  label: string;
  enabled: boolean;
  status: "ONLINE" | "DEGRADED" | "DISABLED" | "UNKNOWN";
  lastSuccess: string | null;
  endpointCount: number;
}

interface StatusResponse {
  health: "LIVE" | "ONLINE" | "DEGRADED" | "OFFLINE";
  gamesInProgress: boolean;
  leagues: {
    all: LeagueInfo[];
    enabled: string[];
    status: LeagueStatus[];
  };
  statuses: EndpointStatus[];
  cache: {
    stats: { totalEntries: number; sportsDataEntries: number };
    entries: CacheEntry[];
  };
  timestamp: string;
}

export default function AdminSportsPage() {
  const [token, setToken] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState(true); // Default true since middleware protects this route
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [selectedLeague, setSelectedLeague] = useState<string>("all");

  // Get token from URL or cookie on mount - middleware already protects this route
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");
    if (urlToken) {
      setToken(urlToken);
    }
    // Since middleware protects /admin/*, we're already authenticated
    setIsAuthenticated(true);
  }, []);

  // Fetch status - uses cookie auth, falls back to token if provided
  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const url = token 
        ? `/api/admin/sports/status?token=${token}` 
        : `/api/admin/sports/status`;
      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 401) {
          setIsAuthenticated(false);
          setMessage({ type: "error", text: "Session expired. Please log in again." });
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

  // Perform action - uses cookie auth, falls back to token if provided
  const performAction = async (action: string, league: string, date?: string) => {
    setActionLoading(`${action}-${league}`);
    setMessage(null);
    
    try {
      const url = token 
        ? `/api/admin/sports/refresh?token=${token}` 
        : `/api/admin/sports/refresh`;
      const res = await fetch(url, {
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

  // Note: Login is handled by middleware - if user reaches here, they are authenticated

  return (
    <div className="min-h-screen bg-[#141414] text-white p-6">
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
              className="border-[#2a2a2a] text-gray-300"
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

        {/* League Status Overview */}
        {status?.leagues?.status && (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5" />
              League Status
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {status.leagues.status.map((league) => (
                <div
                  key={league.key}
                  className={`p-3 rounded-lg border ${
                    !league.enabled
                      ? "border-gray-700 bg-gray-800/30 opacity-50"
                      : league.status === "ONLINE"
                      ? "border-green-500/30 bg-green-500/10"
                      : league.status === "DEGRADED"
                      ? "border-yellow-500/30 bg-yellow-500/10"
                      : "border-gray-600 bg-gray-700/20"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm">{league.label}</span>
                    {!league.enabled && <Lock className="h-3 w-3 text-gray-500" />}
                  </div>
                  <div className={`text-xs ${
                    !league.enabled
                      ? "text-gray-500"
                      : league.status === "ONLINE"
                      ? "text-green-400"
                      : league.status === "DEGRADED"
                      ? "text-yellow-400"
                      : "text-gray-400"
                  }`}>
                    {league.enabled ? league.status : "DISABLED"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Quick Actions
          </h2>
          <div className="flex flex-wrap items-center gap-4">
            <select
              value={selectedLeague}
              onChange={(e) => setSelectedLeague(e.target.value)}
              className="px-4 py-2 bg-[#141414] border border-[#2a2a2a] rounded-lg text-white"
            >
              <option value="all">⚡ All Enabled Leagues</option>
              <optgroup label="Enabled">
                {status?.leagues?.all.filter(l => l.enabled).map((league) => (
                  <option key={league.key} value={league.key}>
                    {league.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Disabled">
                {status?.leagues?.all.filter(l => !l.enabled).map((league) => (
                  <option key={league.key} value={league.key} disabled>
                    {league.label} (Coming Soon)
                  </option>
                ))}
              </optgroup>
            </select>
            
            <Button
              onClick={() => performAction("teams", selectedLeague)}
              disabled={actionLoading !== null}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {actionLoading?.startsWith("teams") ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh Teams
            </Button>
            
            <Button
              onClick={() => performAction("games", selectedLeague)}
              disabled={actionLoading !== null}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {actionLoading?.startsWith("games") ? (
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
              {actionLoading?.startsWith("warm") ? (
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
              {actionLoading?.startsWith("flush") ? (
                <Trash2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Flush Cache
            </Button>
          </div>
          
          {selectedLeague === "all" && (
            <p className="text-xs text-gray-500 mt-3">
              Actions will run for all enabled leagues: {status?.leagues?.enabled.map(l => l.toUpperCase()).join(", ")}
            </p>
          )}
        </div>

        {/* Endpoint Status Table */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Endpoint Status
          </h2>
          
          {status?.statuses && status.statuses.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2a2a2a] text-gray-400">
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
                    <tr key={s.key} className={`border-b border-[#2a2a2a]/50 hover:bg-[#141414]/50 ${s.lastErrorMessage ? "bg-red-500/5" : ""}`}>
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
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
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
                  <tr className="border-b border-[#2a2a2a] text-gray-400">
                    <th className="text-left py-3 px-4">Cache Key</th>
                    <th className="text-left py-3 px-4">Age</th>
                    <th className="text-left py-3 px-4">TTL Remaining</th>
                    <th className="text-left py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {status.cache.entries.map((entry) => (
                    <tr key={entry.key} className="border-b border-[#2a2a2a]/50 hover:bg-[#141414]/50">
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
