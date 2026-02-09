"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Zap, Calendar, ArrowLeft, Database, Users, Radio } from "lucide-react";
import Link from "next/link";

type ApiResponse = {
  ok: boolean;
  status?: number;
  ms?: number;
  date?: string;
  endpoint?: string;
  endpointUsed?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
  error?: string;
  message?: string;
  fetched?: number;
  synced?: number;
  inserted?: number;
  updated?: number;
  count?: number;
  fromDate?: string;
  toDate?: string;
  dates?: string[];
  chunks?: number;
  totalFetched?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chunkDetails?: any[];
};

export default function AdminApiSportsNflPage() {
  // Default to a known NFL week (2025-09-07 to 2025-09-15)
  const [date, setDate] = useState("2025-09-07");
  const [toDate, setToDate] = useState("2025-09-15");
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResponse | null>(null);

  const checkStatus = async () => {
    setLoading("status");
    setResult(null);
    
    try {
      const res = await fetch("/api/admin/api-sports-nfl/status");
      const data: ApiResponse = await res.json();
      setResult(data);
    } catch (error) {
      setResult({
        ok: false,
        status: 500,
        ms: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(null);
    }
  };

  const fetchGames = async () => {
    setLoading("games");
    setResult(null);
    
    try {
      const res = await fetch(`/api/admin/api-sports-nfl/games?date=${date}`);
      const data: ApiResponse = await res.json();
      setResult(data);
    } catch (error) {
      setResult({
        ok: false,
        status: 500,
        ms: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(null);
    }
  };

  const syncTeams = async () => {
    setLoading("syncTeams");
    setResult(null);
    
    try {
      const res = await fetch("/api/admin/api-sports-nfl/sync/teams", {
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

  const syncGames = async () => {
    setLoading("syncGames");
    setResult(null);
    
    try {
      const res = await fetch(`/api/admin/api-sports-nfl/sync/games?from=${date}&to=${toDate}`, {
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

  const syncLive = async () => {
    setLoading("syncLive");
    setResult(null);
    
    try {
      const res = await fetch("/api/admin/api-sports-nfl/sync/live", {
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

  const syncNextYear = async () => {
    setLoading("syncNextYear");
    setResult(null);
    
    try {
      const res = await fetch("/api/admin/api-sports-nfl/sync/next-year", {
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin" className="text-gray-400 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">API Sports (NFL)</h1>
          <p className="text-gray-400 text-sm">Test NFL endpoints and sync to Supabase</p>
        </div>
      </div>

      {/* Test Controls */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 space-y-4">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <Zap className="h-4 w-4 text-blue-400" />
          Test API Endpoints
        </h3>
        <div className="flex flex-wrap gap-4 items-end">
          {/* Date Input */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">From Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
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

          {/* Test Buttons */}
          <Button
            onClick={checkStatus}
            disabled={loading !== null}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading === "status" ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            Check Status
          </Button>
          
          <Button
            onClick={fetchGames}
            disabled={loading !== null}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {loading === "games" ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Calendar className="h-4 w-4 mr-2" />
            )}
            Fetch Games
          </Button>
        </div>
      </div>

      {/* Sync Controls */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 space-y-4">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <Database className="h-4 w-4 text-purple-400" />
          Sync to Supabase
        </h3>
        <p className="text-gray-400 text-sm">
          Fetch data from API-Sports and cache it in your Supabase database.
        </p>
        <div className="flex flex-wrap gap-4">
          <Button
            onClick={syncTeams}
            disabled={loading !== null}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {loading === "syncTeams" ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Users className="h-4 w-4 mr-2" />
            )}
            Sync Teams to DB
          </Button>
          
          <Button
            onClick={syncGames}
            disabled={loading !== null}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {loading === "syncGames" ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Calendar className="h-4 w-4 mr-2" />
            )}
            Sync Games Range to DB
          </Button>

          <Button
            onClick={syncLive}
            disabled={loading !== null}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {loading === "syncLive" ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Radio className="h-4 w-4 mr-2" />
            )}
            Update Live Scores (DB)
          </Button>

          <Button
            onClick={syncNextYear}
            disabled={loading !== null}
            className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white"
          >
            {loading === "syncNextYear" ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Calendar className="h-4 w-4 mr-2" />
            )}
            Sync Next 365 Days
          </Button>
        </div>
        <p className="text-xs text-gray-500">
          Uses date range above: {date} to {toDate}
        </p>
        <p className="text-xs text-gray-500">
          <strong>Sync Next 365 Days</strong>: Fetches all NFL games for the next year in monthly chunks. May take 1-2 minutes.
        </p>
      </div>

      {/* Result */}
      {result && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
          {/* Result Header */}
          <div className="flex items-center justify-between p-4 border-b border-[#30363d]">
            <div className="flex items-center gap-3">
              <span className={`font-medium ${result.ok ? "text-green-400" : "text-red-400"}`}>
                {result.ok ? "✓ Success" : "✗ Error"}
              </span>
              {result.ms !== undefined && (
                <>
                  <span className="text-gray-400">|</span>
                  <span className="text-gray-400">{result.ms}ms</span>
                </>
              )}
            </div>
          </div>

          {/* Sync Stats */}
          {(result.inserted !== undefined || result.updated !== undefined || result.count !== undefined || result.chunks !== undefined) && (
            <div className="px-4 py-3 bg-green-500/10 border-b border-[#30363d] flex flex-wrap gap-6">
              {result.chunks !== undefined && (
                <div>
                  <span className="text-gray-400 text-sm">Chunks: </span>
                  <span className="text-purple-400 font-bold">{result.chunks}</span>
                </div>
              )}
              {result.totalFetched !== undefined && (
                <div>
                  <span className="text-gray-400 text-sm">Fetched: </span>
                  <span className="text-cyan-400 font-bold">{result.totalFetched}</span>
                </div>
              )}
              {result.count !== undefined && (
                <div>
                  <span className="text-gray-400 text-sm">Total: </span>
                  <span className="text-green-400 font-bold">{result.count}</span>
                </div>
              )}
              {result.inserted !== undefined && (
                <div>
                  <span className="text-gray-400 text-sm">Inserted: </span>
                  <span className="text-blue-400 font-bold">{result.inserted}</span>
                </div>
              )}
              {result.updated !== undefined && (
                <div>
                  <span className="text-gray-400 text-sm">Updated: </span>
                  <span className="text-yellow-400 font-bold">{result.updated}</span>
                </div>
              )}
            </div>
          )}

          {/* Message */}
          {result.message ? (
            <div className="px-4 py-2 bg-blue-500/10 border-b border-[#30363d]">
              <span className="text-blue-400 text-sm">{result.message}</span>
            </div>
          ) : null}

          {/* Error Message */}
          {result.error && (
            <div className="px-4 py-3 bg-red-500/10 border-b border-[#30363d]">
              <span className="text-red-400">{result.error}</span>
            </div>
          )}

          {/* Endpoint Info */}
          {(result.endpoint || result.endpointUsed) && (
            <div className="px-4 py-2 bg-[#0d1117] border-b border-[#30363d]">
              <span className="text-gray-500 text-sm">Endpoint: </span>
              <code className="text-blue-400 text-sm">{result.endpoint || result.endpointUsed}</code>
            </div>
          )}

          {/* JSON Preview */}
          {result.data && (
            <div className="p-4 max-h-[400px] overflow-auto">
              <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!result && !loading && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-12 text-center">
          <Zap className="h-12 w-12 mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400">Click a button above to test or sync data</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-12 text-center">
          <RefreshCw className="h-12 w-12 mx-auto mb-4 text-blue-500 animate-spin" />
          <p className="text-gray-400">
            {loading === "syncTeams" ? "Syncing teams to database..." :
             loading === "syncGames" ? "Syncing games to database..." :
             loading === "syncLive" ? "Fetching live scores..." :
             loading === "syncNextYear" ? "Syncing next 365 days (this may take 1-2 minutes)..." :
             "Fetching..."}
          </p>
        </div>
      )}

      {/* Info */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6">
        <h3 className="text-white font-semibold mb-3">Required Environment Variables</h3>
        <div className="space-y-2 text-sm">
          <div>
            <code className="bg-[#21262d] px-2 py-1 rounded text-orange-400">API_SPORTS_KEY</code>
            <span className="text-gray-400 ml-2">- Your API-Sports API key</span>
          </div>
          <div>
            <code className="bg-[#21262d] px-2 py-1 rounded text-orange-400">API_SPORTS_BASE_URL</code>
            <span className="text-gray-400 ml-2">- Default: https://v1.american-football.api-sports.io</span>
          </div>
          <div>
            <code className="bg-[#21262d] px-2 py-1 rounded text-orange-400">SUPABASE_SERVICE_ROLE_KEY</code>
            <span className="text-gray-400 ml-2">- Required for syncing to database</span>
          </div>
        </div>
      </div>
    </div>
  );
}
