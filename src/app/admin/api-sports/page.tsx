"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  RefreshCw, 
  Zap,
  Users,
  Calendar,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  ArrowLeft
} from "lucide-react";
import Link from "next/link";

type ApiResponse = {
  ok: boolean;
  status: number;
  ms: number;
  sport?: string;
  endpoint?: string;
  params?: Record<string, string>;
  triedEndpoints?: string[];
  note?: string;
  data?: unknown;
  error?: string;
};

export default function AdminApiSportsPage() {
  const [sport, setSport] = useState<"nfl" | "nba">("nfl");
  const [fromDate, setFromDate] = useState(new Date().toISOString().split("T")[0]);
  const [toDate, setToDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [lastEndpoint, setLastEndpoint] = useState<string>("");

  const fetchEndpoint = async (endpoint: string, params?: Record<string, string>) => {
    setLoading(endpoint);
    setResult(null);
    setLastEndpoint(endpoint);
    
    try {
      const queryParams = new URLSearchParams({
        sport,
        ...params,
      });
      
      const res = await fetch(`/api/admin/api-sports/${endpoint}?${queryParams}`);
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
          <h1 className="text-2xl font-bold text-white">API Sports Sandbox</h1>
          <p className="text-gray-400 text-sm">Test API-Sports endpoints for NFL/NBA</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Sport Selector */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Sport</label>
            <div className="flex gap-2">
              <button
                onClick={() => setSport("nfl")}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  sport === "nfl"
                    ? "bg-orange-500 text-white"
                    : "bg-[#242424] text-gray-400 hover:text-white"
                }`}
              >
                NFL
              </button>
              <button
                onClick={() => setSport("nba")}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  sport === "nba"
                    ? "bg-orange-500 text-white"
                    : "bg-[#242424] text-gray-400 hover:text-white"
                }`}
              >
                NBA
              </button>
            </div>
          </div>

          {/* From Date */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-3 py-2 bg-[#242424] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-3 py-2 bg-[#242424] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 pt-4 border-t border-[#2a2a2a]">
          <Button
            onClick={() => fetchEndpoint("test")}
            disabled={loading !== null}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {loading === "test" ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            Test Connection
          </Button>
          
          <div className="flex flex-col gap-1">
            <Button
              onClick={() => fetchEndpoint("teams")}
              disabled={loading !== null}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {loading === "teams" ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Users className="h-4 w-4 mr-2" />
              )}
              Fetch Teams
            </Button>
            {sport === "nfl" && (
              <span className="text-xs text-gray-500">NFL: fetched without season (fallback to 2025)</span>
            )}
          </div>
          
          <Button
            onClick={() => fetchEndpoint("fixtures", { from: fromDate, to: toDate })}
            disabled={loading !== null}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {loading === "fixtures" ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Calendar className="h-4 w-4 mr-2" />
            )}
            Fetch Fixtures
          </Button>
          
          <Button
            onClick={() => fetchEndpoint("live")}
            disabled={loading !== null}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {loading === "live" ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Activity className="h-4 w-4 mr-2" />
            )}
            Live Scores
          </Button>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
          {/* Result Header */}
          <div className="flex items-center justify-between p-4 border-b border-[#2a2a2a]">
            <div className="flex items-center gap-3">
              {result.ok ? (
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Success</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-400">
                  <XCircle className="h-5 w-5" />
                  <span className="font-medium">Error</span>
                </div>
              )}
              <span className="text-gray-400">|</span>
              <span className="text-gray-400">Status: {result.status}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Clock className="h-4 w-4" />
              <span>{result.ms}ms</span>
            </div>
          </div>

          {/* Endpoint Info */}
          {result.endpoint && (
            <div className="px-4 py-2 bg-[#141414] border-b border-[#2a2a2a]">
              <span className="text-gray-500 text-sm">Endpoint: </span>
              <code className="text-blue-400 text-sm break-all">{result.endpoint}</code>
            </div>
          )}

          {/* Tried Endpoints (for debugging) */}
          {result.triedEndpoints && result.triedEndpoints.length > 1 && (
            <div className="px-4 py-2 bg-[#141414] border-b border-[#2a2a2a]">
              <span className="text-gray-500 text-sm">Tried endpoints: </span>
              <div className="mt-1 space-y-1">
                {result.triedEndpoints.map((ep, i) => (
                  <code key={i} className="block text-xs text-gray-400">{i + 1}. {ep}</code>
                ))}
              </div>
            </div>
          )}

          {/* Note */}
          {result.note && (
            <div className="px-4 py-2 bg-yellow-500/10 border-b border-[#2a2a2a]">
              <span className="text-yellow-400 text-sm">{result.note}</span>
            </div>
          )}

          {/* Error Message */}
          {result.error && (
            <div className="px-4 py-3 bg-red-500/10 border-b border-[#2a2a2a]">
              <span className="text-red-400">{result.error}</span>
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
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-12 text-center">
          <Zap className="h-12 w-12 mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400">Select an action above to test the API-Sports endpoints</p>
          <p className="text-gray-500 text-sm mt-2">
            Make sure <code className="text-orange-400">API_SPORTS_KEY</code> is configured in your environment
          </p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-12 text-center">
          <RefreshCw className="h-12 w-12 mx-auto mb-4 text-blue-500 animate-spin" />
          <p className="text-gray-400">Fetching {lastEndpoint} for {sport.toUpperCase()}...</p>
        </div>
      )}

      {/* Info Panel */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
        <h3 className="text-white font-semibold mb-3">Required Environment Variables</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <code className="bg-[#242424] px-2 py-1 rounded text-orange-400">API_SPORTS_KEY</code>
            <span className="text-gray-400">- Your API-Sports API key</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="bg-[#242424] px-2 py-1 rounded text-orange-400">API_SPORTS_BASE_URL</code>
            <span className="text-gray-400">- (Optional) Custom base URL</span>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-[#2a2a2a]">
          <h4 className="text-white font-medium mb-2">API-Sports Endpoints</h4>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>• NFL: <code className="text-blue-400">v1.american-football.api-sports.io</code></li>
            <li>• NBA: <code className="text-blue-400">v1.basketball.api-sports.io</code></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
