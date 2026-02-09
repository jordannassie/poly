"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Activity, Clock, CheckCircle, AlertTriangle, Loader2, Download, RefreshCw } from "lucide-react";

interface Market {
  id: string;
  league: string;
  sportsdata_game_id: number;
  slug: string;
  home_team: string;
  away_team: string;
  start_time: string;
  game_status: string;
  market_status: string;
  final_outcome: string | null;
  created_at: string;
}

export default function AdminMarketsPage() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "live" | "settled">("all");
  
  // Import state
  const [importLeague, setImportLeague] = useState("NFL");
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchMarkets = async () => {
    try {
      const res = await fetch("/api/admin/markets");
      const data = await res.json();
      
      if (data.error === "Admin service key not configured") {
        setError(data.error);
      } else if (data.error) {
        setError(data.error);
      } else {
        setMarkets(data.markets || []);
      }
    } catch (err) {
      setError("Failed to load markets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarkets();
  }, []);

  const handleImport = async () => {
    setImporting(true);
    setImportMessage(null);

    try {
      const res = await fetch(`/api/admin/markets/import-today?league=${importLeague}`, {
        method: "POST",
      });
      const data = await res.json();

      if (data.success) {
        // Show cache source in message
        const sourceNote = data.cacheSource === "supabase" 
          ? " (from Supabase persistent cache)" 
          : " (from memory cache)";
        setImportMessage({ type: "success", text: data.message + sourceNote });
        // Refresh markets table
        setLoading(true);
        await fetchMarkets();
      } else {
        setImportMessage({ type: "error", text: data.error });
      }
    } catch (err) {
      setImportMessage({ type: "error", text: "Failed to import games" });
    } finally {
      setImporting(false);
    }
  };

  const filteredMarkets = markets.filter(m => {
    const matchesSearch = 
      m.home_team.toLowerCase().includes(search.toLowerCase()) ||
      m.away_team.toLowerCase().includes(search.toLowerCase()) ||
      m.slug.toLowerCase().includes(search.toLowerCase());
    
    if (statusFilter === "open") return matchesSearch && m.market_status === "open" && m.game_status === "scheduled";
    if (statusFilter === "live") return matchesSearch && m.game_status === "live";
    if (statusFilter === "settled") return matchesSearch && m.market_status === "settled";
    return matchesSearch;
  });

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const getStatusBadge = (gameStatus: string, marketStatus: string) => {
    if (gameStatus === "live") {
      return <span className="flex items-center gap-1 text-purple-400 text-sm"><Activity className="h-3 w-3 animate-pulse" />Live</span>;
    }
    if (marketStatus === "settled") {
      return <span className="flex items-center gap-1 text-gray-400 text-sm"><CheckCircle className="h-3 w-3" />Settled</span>;
    }
    return <span className="flex items-center gap-1 text-green-400 text-sm"><Clock className="h-3 w-3" />Open</span>;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error === "Admin service key not configured") {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Markets</h1>
          <p className="text-gray-400">View all prediction markets</p>
        </div>
        <Card className="bg-yellow-500/10 border-yellow-500/30">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-6 w-6 text-yellow-500" />
              <div>
                <h3 className="text-yellow-400 font-semibold">Admin Service Key Not Configured</h3>
                <p className="text-yellow-400/80 text-sm mt-1">
                  Add <code className="bg-yellow-500/20 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> to your environment variables to view markets.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Markets</h1>
          <p className="text-gray-400">View and import prediction markets</p>
        </div>
        <div className="text-sm text-gray-400">
          {markets.length} total markets
        </div>
      </div>

      {/* Import Section */}
      <Card className="bg-[#161b22] border-[#30363d]">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-blue-500" />
              <span className="text-white font-medium">Import Today&apos;s Games</span>
            </div>
            <select
              value={importLeague}
              onChange={(e) => setImportLeague(e.target.value)}
              className="px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-white"
            >
              <option value="NFL">NFL</option>
              <option value="NBA">NBA</option>
              <option value="MLB">MLB</option>
              <option value="NHL">NHL</option>
            </select>
            <Button
              onClick={handleImport}
              disabled={importing}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Import from Cache
                </>
              )}
            </Button>
            <Button
              onClick={() => { setLoading(true); fetchMarkets(); }}
              variant="outline"
              size="sm"
              className="border-[#30363d] text-gray-400"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          
          {importMessage && (
            <div className={`mt-3 px-3 py-2 rounded text-sm ${
              importMessage.type === "success" 
                ? "bg-green-500/20 text-green-400" 
                : "bg-red-500/20 text-red-400"
            }`}>
              {importMessage.text}
            </div>
          )}
          
          <p className="text-xs text-gray-500 mt-2">
            Imports games from SportsDataIO cache into the markets database. Make sure to warm the cache first via SportsDataIO Admin.
          </p>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search by team or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-[#0d1117] border-[#30363d] text-white"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "open", "live", "settled"] as const).map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(status)}
              className={statusFilter === status ? "bg-blue-600" : "border-[#30363d] text-gray-400"}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Markets Table */}
      <Card className="bg-[#161b22] border-[#30363d]">
        <CardContent className="p-0">
          {filteredMarkets.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#30363d] text-gray-400 text-sm">
                  <th className="text-left p-4">League</th>
                  <th className="text-left p-4">Matchup</th>
                  <th className="text-left p-4">Start Time</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-left p-4">Outcome</th>
                  <th className="text-left p-4">SportsData ID</th>
                </tr>
              </thead>
              <tbody>
                {filteredMarkets.map((market) => (
                  <tr key={market.id} className="border-b border-[#30363d]/50 hover:bg-[#0d1117]/50">
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        market.league === "NFL" ? "bg-blue-500/20 text-blue-400" : 
                        market.league === "NBA" ? "bg-orange-500/20 text-orange-400" :
                        market.league === "MLB" ? "bg-red-500/20 text-red-400" :
                        "bg-cyan-500/20 text-cyan-400"
                      }`}>
                        {market.league}
                      </span>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="text-white font-medium">{market.away_team} @ {market.home_team}</p>
                        <p className="text-gray-400 text-sm">{market.slug}</p>
                      </div>
                    </td>
                    <td className="p-4 text-gray-300">{formatDateTime(market.start_time)}</td>
                    <td className="p-4">{getStatusBadge(market.game_status, market.market_status)}</td>
                    <td className="p-4">
                      {market.final_outcome ? (
                        <span className={`text-sm font-medium ${
                          market.final_outcome === "HOME" ? "text-green-400" : "text-blue-400"
                        }`}>
                          {market.final_outcome === "HOME" ? market.home_team : market.away_team} Win
                        </span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      <code className="text-gray-400 text-sm">{market.sportsdata_game_id}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-gray-400">
              {search ? "No markets found matching your criteria." : "No markets in database yet. Import games from the SportsDataIO cache above."}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
