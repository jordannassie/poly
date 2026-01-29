"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Zap, Calendar, ArrowLeft } from "lucide-react";
import Link from "next/link";

type ApiResponse = {
  ok: boolean;
  status: number;
  ms: number;
  date?: string;
  endpoint?: string;
  data?: unknown;
  error?: string;
};

export default function AdminApiSportsNflPage() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin" className="text-gray-400 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">API Sports (NFL)</h1>
          <p className="text-gray-400 text-sm">Test NFL endpoints from API-Sports</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Date Input */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-2 bg-[#21262d] border border-[#30363d] rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Action Buttons */}
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

      {/* Result */}
      {result && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
          {/* Result Header */}
          <div className="flex items-center justify-between p-4 border-b border-[#30363d]">
            <div className="flex items-center gap-3">
              <span className={`font-medium ${result.ok ? "text-green-400" : "text-red-400"}`}>
                {result.ok ? "✓ Success" : "✗ Error"}
              </span>
              <span className="text-gray-400">|</span>
              <span className="text-gray-400">Status: {result.status}</span>
              <span className="text-gray-400">|</span>
              <span className="text-gray-400">{result.ms}ms</span>
            </div>
          </div>

          {/* Error Message */}
          {result.error && (
            <div className="px-4 py-3 bg-red-500/10 border-b border-[#30363d]">
              <span className="text-red-400">{result.error}</span>
            </div>
          )}

          {/* Endpoint Info */}
          {result.endpoint && (
            <div className="px-4 py-2 bg-[#0d1117] border-b border-[#30363d]">
              <span className="text-gray-500 text-sm">Endpoint: </span>
              <code className="text-blue-400 text-sm">{result.endpoint}</code>
            </div>
          )}

          {/* JSON Preview */}
          <div className="p-4 max-h-[600px] overflow-auto">
            <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!result && !loading && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-12 text-center">
          <Zap className="h-12 w-12 mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400">Click a button above to test the API-Sports NFL endpoints</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-12 text-center">
          <RefreshCw className="h-12 w-12 mx-auto mb-4 text-blue-500 animate-spin" />
          <p className="text-gray-400">Fetching...</p>
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
        </div>
      </div>
    </div>
  );
}
