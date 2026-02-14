"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Globe, 
  RefreshCw, 
  Download, 
  Search, 
  Check, 
  X, 
  Loader2,
  AlertCircle,
  CheckCircle2
} from "lucide-react";

interface SoccerLeague {
  id: number;
  sport: string;
  api_provider: string;
  league_id: number;
  name: string;
  type: string | null;
  country: string | null;
  country_code: string | null;
  season: string | null;
  logo_url: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export default function AdminSoccerLeaguesPage() {
  const [leagues, setLeagues] = useState<SoccerLeague[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [updatingIds, setUpdatingIds] = useState<Set<number>>(new Set());
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showEnabledOnly, setShowEnabledOnly] = useState(false);

  // Fetch leagues
  const fetchLeagues = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/soccer-leagues?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (data.ok) {
        setLeagues(data.leagues || []);
      } else {
        setMessage({ type: "error", text: data.error || "Failed to fetch leagues" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Network error fetching leagues" });
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchLeagues();
  }, [fetchLeagues]);

  // Import leagues from API
  const handleImport = async () => {
    setImporting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/soccer-leagues/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topTierOnly: false, currentSeasonOnly: true }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessage({ type: "success", text: data.message });
        await fetchLeagues();
      } else {
        setMessage({ type: "error", text: data.error || "Import failed" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Network error during import" });
    } finally {
      setImporting(false);
    }
  };

  // Toggle enabled status for a single league
  const toggleEnabled = async (league: SoccerLeague) => {
    setUpdatingIds(prev => new Set(prev).add(league.id));
    try {
      const res = await fetch("/api/admin/soccer-leagues", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: league.id, enabled: !league.enabled }),
      });
      const data = await res.json();
      if (data.ok) {
        setLeagues(prev => 
          prev.map(l => l.id === league.id ? { ...l, enabled: !l.enabled } : l)
        );
      } else {
        setMessage({ type: "error", text: data.error || "Failed to update" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Network error" });
    } finally {
      setUpdatingIds(prev => {
        const next = new Set(prev);
        next.delete(league.id);
        return next;
      });
    }
  };

  // Bulk enable/disable
  const bulkUpdate = async (enabled: boolean) => {
    if (selectedIds.size === 0) return;
    
    const ids = Array.from(selectedIds);
    setUpdatingIds(new Set(ids));
    
    try {
      const res = await fetch("/api/admin/soccer-leagues", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, enabled }),
      });
      const data = await res.json();
      if (data.ok) {
        setLeagues(prev => 
          prev.map(l => ids.includes(l.id) ? { ...l, enabled } : l)
        );
        setSelectedIds(new Set());
        setMessage({ type: "success", text: `${enabled ? "Enabled" : "Disabled"} ${ids.length} leagues` });
      } else {
        setMessage({ type: "error", text: data.error || "Bulk update failed" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Network error" });
    } finally {
      setUpdatingIds(new Set());
    }
  };

  // Toggle selection
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select/deselect all visible
  const toggleSelectAll = () => {
    const visibleIds = filteredLeagues.map(l => l.id);
    const allSelected = visibleIds.every(id => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleIds));
    }
  };

  // Filter leagues
  const filteredLeagues = leagues.filter(l => {
    if (showEnabledOnly && !l.enabled) return false;
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return l.name.toLowerCase().includes(searchLower) || 
           (l.country?.toLowerCase().includes(searchLower));
  });

  const enabledCount = leagues.filter(l => l.enabled).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-gray-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Globe className="h-6 w-6 text-green-400" />
              Soccer League Manager
            </h1>
            <p className="text-gray-400 text-sm">
              Control which soccer leagues appear on the public site
            </p>
          </div>
        </div>
        
        <button
          onClick={handleImport}
          disabled={importing}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-blue-800 text-white rounded-lg transition"
        >
          {importing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {importing ? "Importing..." : "Import from API"}
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg border flex items-center gap-2 ${
          message.type === "success" 
            ? "bg-green-900/30 border-green-600 text-green-400"
            : "bg-red-900/30 border-red-600 text-red-400"
        }`}>
          {message.type === "success" ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          {message.text}
          <button 
            onClick={() => setMessage(null)}
            className="ml-auto text-gray-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#242424] border border-[#2a2a2a] rounded-xl p-4">
          <div className="text-gray-400 text-sm">Total Leagues</div>
          <div className="text-2xl font-bold text-white">{leagues.length}</div>
        </div>
        <div className="bg-[#242424] border border-[#2a2a2a] rounded-xl p-4">
          <div className="text-gray-400 text-sm">Enabled</div>
          <div className="text-2xl font-bold text-green-400">{enabledCount}</div>
        </div>
        <div className="bg-[#242424] border border-[#2a2a2a] rounded-xl p-4">
          <div className="text-gray-400 text-sm">Disabled</div>
          <div className="text-2xl font-bold text-gray-500">{leagues.length - enabledCount}</div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-[#242424] border border-[#2a2a2a] rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search leagues..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#141414] border border-[#2a2a2a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Enabled only toggle */}
          <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showEnabledOnly}
              onChange={(e) => setShowEnabledOnly(e.target.checked)}
              className="rounded border-gray-600"
            />
            Show enabled only
          </label>

          {/* Refresh */}
          <button
            onClick={fetchLeagues}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded-lg transition"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          {/* Bulk actions */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-gray-400">{selectedIds.size} selected</span>
              <button
                onClick={() => bulkUpdate(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition"
              >
                <Check className="h-3 w-3" />
                Enable
              </button>
              <button
                onClick={() => bulkUpdate(false)}
                className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition"
              >
                <X className="h-3 w-3" />
                Disable
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#242424] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#1a1a1a] border-b border-[#2a2a2a]">
            <tr>
              <th className="w-12 px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={filteredLeagues.length > 0 && filteredLeagues.every(l => selectedIds.has(l.id))}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-600"
                />
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">League</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Country</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">API ID</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Season</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">Enabled</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Loading leagues...
                </td>
              </tr>
            ) : filteredLeagues.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                  {leagues.length === 0 ? (
                    <div>
                      <p className="mb-2">No leagues found.</p>
                      <p className="text-sm">Click &quot;Import from API&quot; to fetch leagues.</p>
                    </div>
                  ) : (
                    "No leagues match your search"
                  )}
                </td>
              </tr>
            ) : (
              filteredLeagues.map((league) => (
                <tr
                  key={league.id}
                  className={`border-b border-[#2a2a2a] hover:bg-[#2a2a2a]/50 transition ${
                    selectedIds.has(league.id) ? "bg-blue-900/20" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(league.id)}
                      onChange={() => toggleSelect(league.id)}
                      className="rounded border-gray-600"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {league.logo_url && (
                        <img 
                          src={league.logo_url} 
                          alt="" 
                          className="w-6 h-6 object-contain"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      )}
                      <div>
                        <div className="text-white font-medium">{league.name}</div>
                        <div className="text-xs text-gray-500">{league.type}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{league.country || "—"}</td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-sm">{league.league_id}</td>
                  <td className="px-4 py-3 text-gray-400">{league.season || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleEnabled(league)}
                      disabled={updatingIds.has(league.id)}
                      className={`relative w-12 h-6 rounded-full transition ${
                        league.enabled 
                          ? "bg-green-600" 
                          : "bg-gray-600"
                      }`}
                    >
                      {updatingIds.has(league.id) ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Loader2 className="h-4 w-4 animate-spin text-white" />
                        </div>
                      ) : (
                        <div
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            league.enabled ? "left-7" : "left-1"
                          }`}
                        />
                      )}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Instructions */}
      <div className="bg-[#242424] border border-[#2a2a2a] rounded-xl p-4">
        <h4 className="text-white font-medium mb-2">How It Works</h4>
        <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
          <li>Click <strong className="text-blue-400">Import from API</strong> to fetch all soccer leagues from API-Sports</li>
          <li>Top leagues (EPL, La Liga, UCL, MLS, etc.) are enabled by default</li>
          <li>Toggle individual leagues or use bulk actions to enable/disable multiple</li>
          <li>Only <strong className="text-green-400">enabled</strong> leagues will appear on the public site</li>
          <li>Changes take effect immediately</li>
        </ul>
      </div>
    </div>
  );
}
