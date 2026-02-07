"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";

/**
 * Safe JSON fetch helper - prevents "Unexpected token <" errors
 * by checking content-type before parsing
 */
async function safeFetchJson<T>(url: string, options?: RequestInit): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get("content-type") || "";
    
    if (!contentType.includes("application/json")) {
      const text = await res.text();
      const preview = text.slice(0, 200);
      return { 
        data: null, 
        error: `HTTP ${res.status}: Expected JSON but got ${contentType || "unknown"}. Response: ${preview}${text.length > 200 ? '...' : ''}` 
      };
    }
    
    if (!res.ok) {
      const data = await res.json();
      return { data: null, error: `HTTP ${res.status}: ${data.error || JSON.stringify(data)}` };
    }
    
    const data = await res.json();
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Unknown fetch error" };
  }
}

interface FirstError {
  message: string;
  code?: string;
  details?: string;
  league?: string;
}

interface JobResult {
  success: boolean;
  job?: string;
  skipped?: boolean;
  summary?: {
    fetched: number;
    upserted: number;
    finalized: number;
    enqueued: number;
    duration: number;
  };
  results?: any;
  error?: string;
  firstError?: FirstError;
  errors?: string[];
}

interface SettlementStats {
  queued: number;
  processing: number;
  done: number;
  failed: number;
  skipped: number;
  total: number;
}

interface HealthCheck {
  status: 'ok' | 'warning' | 'critical';
  count: number;
  threshold: number;
  description: string;
  items?: Array<{
    id: number;
    league: string;
    external_game_id: string;
    home_team?: string;
    away_team?: string;
    status_norm?: string;
    attempts?: number;
  }>;
}

interface HealthResult {
  status: 'healthy' | 'warning' | 'critical';
  checks: {
    stuck_live: HealthCheck;
    stuck_scheduled: HealthCheck;
    final_not_queued: HealthCheck;
    queued_too_long: HealthCheck;
    failed_many: HealthCheck;
    processing_stale: HealthCheck;
  };
  summary: {
    total_issues: number;
    critical_count: number;
    warning_count: number;
  };
  checked_at: string;
}

interface BackfillProgress {
  status: 'idle' | 'running' | 'completed' | 'failed';
  currentDay?: number;
  totalDays?: number;
  currentLeague?: string;
  gamesProcessed: number;
  gamesUpserted: number;
  gamesFinalized: number;
  errors: string[];
  startedAt?: string;
  completedAt?: string;
}

interface FinalizeCandidate {
  id: number;
  league: string;
  external_game_id: string;
  home_team?: string;
  away_team?: string;
  starts_at?: string;
  status_raw?: string;
  status_norm?: string;
  provider_status?: string;
  provider_status_norm?: string;
  markets_count?: number;
}

interface FinalizeDebugResult {
  candidates: FinalizeCandidate[];
  stats: {
    total_candidates: number;
    already_final: number;
    still_live: number;
    still_scheduled: number;
    provider_not_found: number;
    final_flipped: number;
    final_no_markets: number;
    final_with_markets: number;
  };
}

interface ScheduledJobRun {
  job_name: string;
  status: 'running' | 'ok' | 'error' | 'never' | 'unknown';
  started_at: string | null;
  finished_at: string | null;
  duration_ms: number | null;
  counts: Record<string, unknown> | null;
  error: string | null;
}

interface ScheduledJobsStatus {
  ok: boolean;
  jobs: ScheduledJobRun[];
  fetched_at?: string;
  error?: string;
}

export default function AdminLifecyclePage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<JobResult | null>(null);
  const [stats, setStats] = useState<SettlementStats | null>(null);
  const [queueItems, setQueueItems] = useState<any[]>([]);
  const [health, setHealth] = useState<HealthResult | null>(null);
  const [backfill, setBackfill] = useState<BackfillProgress | null>(null);
  const [backfillDays, setBackfillDays] = useState(30);
  const [finalizeDebug, setFinalizeDebug] = useState<FinalizeDebugResult | null>(null);
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledJobsStatus | null>(null);
  const [copiedError, setCopiedError] = useState<string | null>(null);

  // Fetch scheduled jobs status
  const fetchScheduledJobsStatus = useCallback(async () => {
    const { data, error } = await safeFetchJson<ScheduledJobsStatus>("/api/job-status");
    if (error) {
      console.error("Failed to fetch scheduled jobs status:", error);
      setScheduledJobs({ ok: false, jobs: [], error });
    } else if (data) {
      setScheduledJobs(data);
    }
  }, []);

  // Initial fetch + auto-refresh scheduled jobs every 60s
  useEffect(() => {
    fetchScheduledJobsStatus();
    const interval = setInterval(fetchScheduledJobsStatus, 60000);
    return () => clearInterval(interval);
  }, [fetchScheduledJobsStatus]);

  // Auto-refresh health and backfill status
  useEffect(() => {
    const interval = setInterval(() => {
      if (backfill?.status === 'running') {
        fetchBackfillStatus();
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [backfill?.status]);

  const runJob = async (job: string) => {
    setLoading(job);
    setResult(null);

    const { data, error } = await safeFetchJson<JobResult>("/api/admin/lifecycle/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job }),
    });

    if (error) {
      setResult({ success: false, error });
    } else if (data) {
      setResult(data);
    }
    setLoading(null);
  };

  const fetchSettlementQueue = async () => {
    setLoading("queue");

    const { data, error } = await safeFetchJson<{ stats: SettlementStats; items: any[] }>("/api/admin/lifecycle/settlements");
    if (error) {
      console.error("Failed to fetch queue:", error);
      setResult({ success: false, error });
    } else if (data) {
      setStats(data.stats);
      setQueueItems(data.items || []);
    }
    setLoading(null);
  };

  const processSettlements = async (action: string) => {
    setLoading(action);

    const { data, error } = await safeFetchJson<any>("/api/admin/lifecycle/settlements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });

    if (error) {
      setResult({ success: false, error });
    } else if (data) {
      setResult({
        success: data.success,
        summary: {
          fetched: 0,
          upserted: 0,
          finalized: 0,
          enqueued: 0,
          duration: 0,
        },
        results: data,
      });
      await fetchSettlementQueue();
    }
    setLoading(null);
  };

  const fetchHealthChecks = async () => {
    setLoading("health");

    const { data, error } = await safeFetchJson<HealthResult>("/api/admin/lifecycle/health");
    if (error) {
      console.error("Failed to fetch health:", error);
      setResult({ success: false, error });
    } else if (data) {
      setHealth(data);
    }
    setLoading(null);
  };

  const runHealthRemediation = async (action: string) => {
    setLoading(action);

    const { data, error } = await safeFetchJson<any>("/api/admin/lifecycle/health", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });

    if (error) {
      setResult({ success: false, error });
    } else if (data) {
      setResult({ success: data.success, results: data });
      await fetchHealthChecks();
    }
    setLoading(null);
  };

  const fetchBackfillStatus = async () => {
    const { data, error } = await safeFetchJson<BackfillProgress>("/api/admin/lifecycle/backfill");
    if (error) {
      console.error("Failed to fetch backfill status:", error);
    } else if (data) {
      setBackfill(data);
    }
  };

  const startBackfill = async () => {
    setLoading("backfill-start");

    const { data, error } = await safeFetchJson<{ progress: BackfillProgress }>("/api/admin/lifecycle/backfill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start", days: backfillDays }),
    });

    if (error) {
      console.error("Failed to start backfill:", error);
      setResult({ success: false, error });
    } else if (data) {
      setBackfill(data.progress);
    }
    setLoading(null);
  };

  const cancelBackfill = async () => {
    setLoading("backfill-cancel");

    const { error } = await safeFetchJson<any>("/api/admin/lifecycle/backfill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });

    if (error) {
      console.error("Failed to cancel backfill:", error);
    } else {
      setBackfill({ status: 'idle', gamesProcessed: 0, gamesUpserted: 0, gamesFinalized: 0, errors: [] });
    }
    setLoading(null);
  };

  const fetchFinalizeDebug = async () => {
    setLoading("finalize-debug");

    const { data, error } = await safeFetchJson<FinalizeDebugResult>("/api/admin/lifecycle/debug");
    if (error) {
      console.error("Failed to fetch finalize debug:", error);
      setResult({ success: false, error });
    } else if (data) {
      setFinalizeDebug(data);
    }
    setLoading(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ok':
      case 'healthy':
        return 'text-green-400';
      case 'warning':
        return 'text-yellow-400';
      case 'critical':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'ok':
      case 'healthy':
        return 'bg-green-900/30 border-green-700';
      case 'warning':
        return 'bg-yellow-900/30 border-yellow-700';
      case 'critical':
        return 'bg-red-900/30 border-red-700';
      default:
        return 'bg-gray-700/30 border-gray-600';
    }
  };

  const formatTimeAgo = (dateStr: string | null): string => {
    if (!dateStr) return 'never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const getJobStatusBadge = (status: string) => {
    switch (status) {
      case 'ok':
        return 'bg-green-600 text-white';
      case 'running':
        return 'bg-blue-600 text-white animate-pulse';
      case 'error':
        return 'bg-red-600 text-white';
      case 'never':
        return 'bg-gray-600 text-gray-300';
      default:
        return 'bg-gray-600 text-gray-300';
    }
  };

  const formatDuration = (ms: number | null): string => {
    if (ms === null) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatCounts = (counts: Record<string, unknown> | null): string => {
    if (!counts) return '-';
    const entries = Object.entries(counts)
      .filter(([k, v]) => typeof v === 'number')
      .map(([k, v]) => `${k}:${v}`)
      .slice(0, 3);
    return entries.length > 0 ? entries.join(', ') : '-';
  };

  const copyError = (jobName: string, error: string) => {
    navigator.clipboard.writeText(error);
    setCopiedError(jobName);
    setTimeout(() => setCopiedError(null), 2000);
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Game Lifecycle Manager</h1>
        <p className="text-gray-400 mt-1">
          Production-grade game state machine and settlement system
        </p>
      </div>

      {/* Scheduled Jobs Status Card */}
      <div className="bg-gray-800/50 rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Scheduled Jobs Status</h2>
            <p className="text-sm text-gray-400">
              Netlify cron jobs running in production
              {scheduledJobs?.fetched_at && (
                <span className="ml-2 text-xs text-gray-500">
                  (updated {formatTimeAgo(scheduledJobs.fetched_at)})
                </span>
              )}
            </p>
          </div>
          <Button
            onClick={fetchScheduledJobsStatus}
            disabled={loading !== null}
            variant="outline"
            size="sm"
            className="text-white border-gray-600"
          >
            Refresh
          </Button>
        </div>

        {scheduledJobs?.error && (
          <div className="text-sm text-yellow-400 bg-yellow-900/20 rounded p-2">
            {scheduledJobs.error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(scheduledJobs?.jobs || []).map((job) => (
            <div
              key={job.job_name}
              className="bg-gray-700/50 rounded-lg p-3 border border-gray-600"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-white text-sm">
                  {job.job_name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getJobStatusBadge(job.status)}`}>
                  {job.status.toUpperCase()}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-400">Last run:</span>
                  <span className="text-white ml-1">{formatTimeAgo(job.finished_at || job.started_at)}</span>
                </div>
                <div>
                  <span className="text-gray-400">Duration:</span>
                  <span className="text-white ml-1">{formatDuration(job.duration_ms)}</span>
                </div>
              </div>
              
              {job.counts && (
                <div className="mt-1 text-xs text-gray-400 truncate">
                  {formatCounts(job.counts)}
                </div>
              )}
              
              {job.status === 'error' && job.error && (
                <div className="mt-2 flex items-start gap-2">
                  <p className="text-xs text-red-400 flex-1 truncate" title={job.error}>
                    {job.error.slice(0, 120)}
                    {job.error.length > 120 && '...'}
                  </p>
                  <button
                    onClick={() => copyError(job.job_name, job.error!)}
                    className="text-xs px-2 py-0.5 bg-gray-600 hover:bg-gray-500 rounded text-gray-300 flex-shrink-0"
                  >
                    {copiedError === job.job_name ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {(!scheduledJobs || scheduledJobs.jobs.length === 0) && !scheduledJobs?.error && (
          <div className="text-sm text-gray-400 text-center py-4">
            Loading scheduled jobs status...
          </div>
        )}
      </div>

      {/* Health Checks Section */}
      <div className="bg-gray-800/50 rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Health Checks</h2>
            <p className="text-sm text-gray-400">Monitor for stuck games and processing issues</p>
          </div>
          <Button
            onClick={fetchHealthChecks}
            disabled={loading !== null}
            variant="outline"
            className="text-white border-gray-600"
          >
            {loading === "health" ? "Loading..." : "Run Health Checks"}
          </Button>
        </div>

        {health && (
          <div className="space-y-4">
            {/* Overall Status */}
            <div className={`rounded-lg p-3 border ${getStatusBg(health.status)}`}>
              <div className="flex items-center justify-between">
                <span className={`text-lg font-bold ${getStatusColor(health.status)}`}>
                  {health.status.toUpperCase()}
                </span>
                <span className="text-sm text-gray-400">
                  {health.summary.total_issues} issues | Checked: {new Date(health.checked_at).toLocaleTimeString()}
                </span>
              </div>
            </div>

            {/* Individual Checks */}
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(health.checks).map(([key, check]) => (
                <div
                  key={key}
                  className={`rounded-lg p-3 border ${getStatusBg(check.status)}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-white">{key.replace(/_/g, ' ')}</span>
                    <span className={`text-sm font-bold ${getStatusColor(check.status)}`}>
                      {check.count}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{check.description}</p>
                  {check.items && check.items.length > 0 && (
                    <div className="mt-2 text-xs text-gray-500 max-h-20 overflow-y-auto">
                      {check.items.slice(0, 3).map((item, i) => (
                        <div key={i}>{item.league.toUpperCase()} - {item.home_team} vs {item.away_team}</div>
                      ))}
                      {check.items.length > 3 && <div>...and {check.items.length - 3} more</div>}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Remediation Actions */}
            <div className="flex gap-3 mt-2">
              <Button
                onClick={() => runHealthRemediation("release-stale-locks")}
                disabled={loading !== null}
                size="sm"
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                Release Stale Locks
              </Button>
              <Button
                onClick={() => runHealthRemediation("enqueue-orphaned")}
                disabled={loading !== null}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                Enqueue Orphaned Games
              </Button>
              <Button
                onClick={() => runHealthRemediation("fix-all")}
                disabled={loading !== null}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700"
              >
                Fix All Issues
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Jobs Section */}
      <div className="bg-gray-800/50 rounded-lg p-4 space-y-4">
        <h2 className="text-lg font-semibold text-white">Lifecycle Jobs</h2>
        <p className="text-sm text-gray-400">
          Run jobs manually to test the lifecycle flow. Jobs are locked to prevent concurrent execution.
        </p>

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => runJob("discover")}
            disabled={loading !== null}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading === "discover" ? "Running..." : "1. Discover Games"}
          </Button>

          <Button
            onClick={() => runJob("sync")}
            disabled={loading !== null}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading === "sync" ? "Running..." : "2. Sync Live Games"}
          </Button>

          <Button
            onClick={() => runJob("finalize")}
            disabled={loading !== null}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {loading === "finalize" ? "Running..." : "3. Finalize & Enqueue"}
          </Button>

          <Button
            onClick={() => runJob("all")}
            disabled={loading !== null}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {loading === "all" ? "Running..." : "Run All (Full Cycle)"}
          </Button>
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <p><strong>Discover:</strong> Ingest games for rolling 72h window (36h back, 36h forward)</p>
          <p><strong>Sync:</strong> Update scores/status for live games, detect finalized games</p>
          <p><strong>Finalize:</strong> Mark stuck/completed games as FINAL, enqueue for settlement</p>
        </div>
      </div>

      {/* Result Display */}
      {result && (
        <div className={`rounded-lg p-4 ${result.success ? 'bg-green-900/30 border border-green-700' : 'bg-red-900/30 border border-red-700'}`}>
          <h3 className="font-semibold text-white mb-2">
            {result.success ? "✓ Job Completed" : "✗ Job Failed"}
            {result.skipped && " (Skipped - already running)"}
          </h3>
          {result.summary && (
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Fetched:</span>
                <span className="text-white ml-2">{result.summary.fetched}</span>
              </div>
              <div>
                <span className="text-gray-400">Upserted:</span>
                <span className={`ml-2 ${result.summary.upserted === 0 && result.summary.fetched > 0 ? 'text-red-400 font-bold' : 'text-white'}`}>
                  {result.summary.upserted}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Finalized:</span>
                <span className="text-white ml-2">{result.summary.finalized}</span>
              </div>
              <div>
                <span className="text-gray-400">Enqueued:</span>
                <span className="text-white ml-2">{result.summary.enqueued}</span>
              </div>
            </div>
          )}
          
          {/* Show first error details */}
          {result.firstError && (
            <div className="mt-3 p-3 bg-red-950/50 rounded border border-red-800">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-red-400">
                  First Error {result.firstError.league && `(${result.firstError.league})`}
                </span>
                <button
                  onClick={() => {
                    const errorText = `${result.firstError?.message}\nCode: ${result.firstError?.code || 'N/A'}\nDetails: ${result.firstError?.details || 'N/A'}`;
                    navigator.clipboard.writeText(errorText);
                  }}
                  className="text-xs text-gray-400 hover:text-white px-2 py-1 bg-gray-700 rounded"
                >
                  Copy Error
                </button>
              </div>
              <p className="text-sm text-red-300 font-mono">{result.firstError.message}</p>
              {result.firstError.code && (
                <p className="text-xs text-red-400 mt-1">Code: {result.firstError.code}</p>
              )}
              {result.firstError.details && result.firstError.details !== '""' && (
                <p className="text-xs text-red-400 mt-1 break-all">Details: {result.firstError.details}</p>
              )}
              {/* Schema cache hint for admins */}
              {result.firstError.message?.toLowerCase().includes('schema cache') && (
                <div className="mt-2 p-2 bg-yellow-900/30 rounded border border-yellow-700">
                  <p className="text-xs text-yellow-400">
                    <strong>Hint:</strong> Run in Supabase SQL editor: <code className="bg-gray-800 px-1 rounded">NOTIFY pgrst, &apos;reload schema&apos;;</code>
                  </p>
                </div>
              )}
            </div>
          )}
          
          {/* Show additional errors list */}
          {result.errors && result.errors.length > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-400">All Errors ({result.errors.length})</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(result.errors?.join('\n') || '');
                  }}
                  className="text-xs text-gray-400 hover:text-white px-2 py-1 bg-gray-700 rounded"
                >
                  Copy All
                </button>
              </div>
              <div className="text-xs text-red-400 max-h-24 overflow-y-auto space-y-1 font-mono bg-red-950/30 p-2 rounded">
                {result.errors.slice(0, 5).map((err, i) => (
                  <div key={i} className="truncate">{err}</div>
                ))}
                {result.errors.length > 5 && (
                  <div className="text-gray-500">...and {result.errors.length - 5} more</div>
                )}
              </div>
            </div>
          )}
          
          {result.error && !result.firstError && (
            <p className="text-red-400 mt-2">{result.error}</p>
          )}
        </div>
      )}

      {/* Settlement Queue Section */}
      <div className="bg-gray-800/50 rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Settlement Queue</h2>
            <p className="text-sm text-gray-400">Games waiting for settlement</p>
          </div>
          <Button
            onClick={fetchSettlementQueue}
            disabled={loading !== null}
            variant="outline"
            className="text-white border-gray-600"
          >
            {loading === "queue" ? "Loading..." : "Refresh"}
          </Button>
        </div>

        {stats && (
          <div className="grid grid-cols-5 gap-4 text-center">
            <div className="bg-yellow-900/30 rounded p-2">
              <div className="text-2xl font-bold text-yellow-400">{stats.queued}</div>
              <div className="text-xs text-gray-400">Queued</div>
            </div>
            <div className="bg-blue-900/30 rounded p-2">
              <div className="text-2xl font-bold text-blue-400">{stats.processing}</div>
              <div className="text-xs text-gray-400">Processing</div>
            </div>
            <div className="bg-green-900/30 rounded p-2">
              <div className="text-2xl font-bold text-green-400">{stats.done}</div>
              <div className="text-xs text-gray-400">Done</div>
            </div>
            <div className="bg-red-900/30 rounded p-2">
              <div className="text-2xl font-bold text-red-400">{stats.failed}</div>
              <div className="text-xs text-gray-400">Failed</div>
            </div>
            <div className="bg-gray-700/50 rounded p-2">
              <div className="text-2xl font-bold text-gray-300">{stats.skipped}</div>
              <div className="text-xs text-gray-400">Skipped</div>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            onClick={() => processSettlements("process-one")}
            disabled={loading !== null}
            className="bg-green-600 hover:bg-green-700"
          >
            Process One
          </Button>
          <Button
            onClick={() => processSettlements("process-all")}
            disabled={loading !== null}
            className="bg-green-700 hover:bg-green-800"
          >
            Process All
          </Button>
          <Button
            onClick={() => processSettlements("retry-failed")}
            disabled={loading !== null}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            Retry Failed
          </Button>
        </div>

        {queueItems.length > 0 && (
          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-semibold text-gray-300">Recent Queue Items</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {queueItems.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between bg-gray-700/50 rounded p-2 text-sm"
                >
                  <div>
                    <span className="text-white">{item.league.toUpperCase()}</span>
                    <span className="text-gray-400 ml-2">
                      {item.game?.home_team} vs {item.game?.away_team}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      item.status === 'QUEUED' ? 'bg-yellow-600' :
                      item.status === 'PROCESSING' ? 'bg-blue-600' :
                      item.status === 'DONE' ? 'bg-green-600' :
                      item.status === 'FAILED' ? 'bg-red-600' :
                      'bg-gray-600'
                    }`}>
                      {item.status}
                    </span>
                    <span className="text-gray-400 text-xs">
                      {item.outcome || '-'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Backfill Section */}
      <div className="bg-gray-800/50 rounded-lg p-4 space-y-4">
        <h2 className="text-lg font-semibold text-white">Backfill Tool</h2>
        <p className="text-sm text-gray-400">
          Backfill games from the last N days. Useful for populating historical data.
        </p>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">Days to backfill:</label>
            <input
              type="number"
              value={backfillDays}
              onChange={(e) => setBackfillDays(parseInt(e.target.value) || 30)}
              className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              min={1}
              max={90}
            />
          </div>

          <Button
            onClick={startBackfill}
            disabled={loading !== null || backfill?.status === 'running'}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            Start Backfill
          </Button>

          {backfill?.status === 'running' && (
            <Button
              onClick={cancelBackfill}
              disabled={loading !== null}
              variant="outline"
              className="text-red-400 border-red-600 hover:bg-red-900/30"
            >
              Cancel
            </Button>
          )}

          <Button
            onClick={fetchBackfillStatus}
            disabled={loading !== null}
            variant="outline"
            className="text-white border-gray-600"
          >
            Refresh Status
          </Button>
        </div>

        {backfill && backfill.status !== 'idle' && (
          <div className={`rounded-lg p-3 border ${
            backfill.status === 'running' ? 'bg-blue-900/30 border-blue-700' :
            backfill.status === 'completed' ? 'bg-green-900/30 border-green-700' :
            backfill.status === 'failed' ? 'bg-red-900/30 border-red-700' :
            'bg-gray-700/30 border-gray-600'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-white">
                Backfill {backfill.status.toUpperCase()}
              </span>
              {backfill.status === 'running' && (
                <span className="text-sm text-gray-400">
                  Day {backfill.currentDay}/{backfill.totalDays} ({backfill.currentLeague})
                </span>
              )}
            </div>

            {backfill.status === 'running' && (
              <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${((backfill.currentDay || 0) / (backfill.totalDays || 1)) * 100}%` }}
                />
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Processed:</span>
                <span className="text-white ml-2">{backfill.gamesProcessed}</span>
              </div>
              <div>
                <span className="text-gray-400">Upserted:</span>
                <span className="text-white ml-2">{backfill.gamesUpserted}</span>
              </div>
              <div>
                <span className="text-gray-400">Finalized:</span>
                <span className="text-white ml-2">{backfill.gamesFinalized}</span>
              </div>
            </div>

            {backfill.errors.length > 0 && (
              <div className="mt-2 text-xs text-red-400 max-h-20 overflow-y-auto">
                {backfill.errors.slice(-5).map((err, i) => (
                  <div key={i}>{err}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Finalize Debug Section */}
      <div className="bg-gray-800/50 rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Finalize Debug</h2>
            <p className="text-sm text-gray-400">View finalize candidates and diagnose why Finalized=0</p>
          </div>
          <Button
            onClick={fetchFinalizeDebug}
            disabled={loading !== null}
            variant="outline"
            className="text-white border-gray-600"
          >
            {loading === "finalize-debug" ? "Loading..." : "Show Finalize Candidates"}
          </Button>
        </div>

        {finalizeDebug && (
          <div className="space-y-4">
            {/* Stats Summary */}
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="bg-gray-700/50 rounded p-2">
                <div className="text-xl font-bold text-white">{finalizeDebug.stats.total_candidates}</div>
                <div className="text-xs text-gray-400">Candidates</div>
              </div>
              <div className="bg-green-900/30 rounded p-2">
                <div className="text-xl font-bold text-green-400">{finalizeDebug.stats.final_flipped}</div>
                <div className="text-xs text-gray-400">Final (Provider)</div>
              </div>
              <div className="bg-yellow-900/30 rounded p-2">
                <div className="text-xl font-bold text-yellow-400">{finalizeDebug.stats.still_live}</div>
                <div className="text-xs text-gray-400">Still Live</div>
              </div>
              <div className="bg-blue-900/30 rounded p-2">
                <div className="text-xl font-bold text-blue-400">{finalizeDebug.stats.still_scheduled}</div>
                <div className="text-xs text-gray-400">Still Scheduled</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-red-900/30 rounded p-2">
                <div className="text-xl font-bold text-red-400">{finalizeDebug.stats.provider_not_found}</div>
                <div className="text-xs text-gray-400">Not Found (Provider)</div>
              </div>
              <div className="bg-purple-900/30 rounded p-2">
                <div className="text-xl font-bold text-purple-400">{finalizeDebug.stats.final_with_markets}</div>
                <div className="text-xs text-gray-400">Final + Markets</div>
              </div>
              <div className="bg-orange-900/30 rounded p-2">
                <div className="text-xl font-bold text-orange-400">{finalizeDebug.stats.final_no_markets}</div>
                <div className="text-xs text-gray-400">Final No Markets</div>
              </div>
            </div>

            {/* Interpretation */}
            <div className="p-3 bg-gray-700/30 rounded border border-gray-600">
              <h4 className="text-sm font-semibold text-white mb-2">Interpretation</h4>
              <ul className="text-xs text-gray-400 space-y-1">
                {finalizeDebug.stats.total_candidates === 0 && (
                  <li className="text-yellow-400">No candidates: No games started &gt; 4 hours ago that need finalization</li>
                )}
                {finalizeDebug.stats.final_flipped === 0 && finalizeDebug.stats.total_candidates > 0 && (
                  <li className="text-yellow-400">No finals: Provider shows games as still LIVE or SCHEDULED</li>
                )}
                {finalizeDebug.stats.provider_not_found > 0 && (
                  <li className="text-red-400">Provider not found: {finalizeDebug.stats.provider_not_found} games not found when re-fetching</li>
                )}
                {finalizeDebug.stats.final_no_markets > 0 && (
                  <li className="text-orange-400">No markets: {finalizeDebug.stats.final_no_markets} FINAL games have no linked markets (not enqueued)</li>
                )}
                {finalizeDebug.stats.final_with_markets > 0 && (
                  <li className="text-green-400">Ready: {finalizeDebug.stats.final_with_markets} FINAL games have markets and can be enqueued</li>
                )}
              </ul>
            </div>

            {/* Candidates Table */}
            {finalizeDebug.candidates.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-700">
                      <th className="p-2">League</th>
                      <th className="p-2">Game ID</th>
                      <th className="p-2">Teams</th>
                      <th className="p-2">Started</th>
                      <th className="p-2">DB Status</th>
                      <th className="p-2">Provider Status</th>
                      <th className="p-2">Markets</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finalizeDebug.candidates.slice(0, 20).map((c, i) => (
                      <tr key={i} className="border-b border-gray-800 text-gray-300">
                        <td className="p-2 uppercase">{c.league}</td>
                        <td className="p-2 font-mono text-xs">{c.external_game_id}</td>
                        <td className="p-2 truncate max-w-32">{c.home_team} vs {c.away_team}</td>
                        <td className="p-2">{c.starts_at ? new Date(c.starts_at).toLocaleString() : '-'}</td>
                        <td className="p-2">
                          <span className={`px-1 rounded text-xs ${
                            c.status_norm === 'FINAL' ? 'bg-green-600' :
                            c.status_norm === 'LIVE' ? 'bg-blue-600' :
                            'bg-gray-600'
                          }`}>
                            {c.status_norm || c.status_raw || '-'}
                          </span>
                        </td>
                        <td className="p-2">
                          <span className={`px-1 rounded text-xs ${
                            c.provider_status_norm === 'FINAL' ? 'bg-green-600' :
                            c.provider_status_norm === 'LIVE' ? 'bg-blue-600' :
                            c.provider_status_norm ? 'bg-gray-600' : 'bg-red-900'
                          }`}>
                            {c.provider_status_norm || 'NOT FOUND'}
                          </span>
                        </td>
                        <td className="p-2">
                          <span className={c.markets_count && c.markets_count > 0 ? 'text-green-400' : 'text-gray-500'}>
                            {c.markets_count || 0}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {finalizeDebug.candidates.length > 20 && (
                  <p className="text-xs text-gray-500 mt-2">...and {finalizeDebug.candidates.length - 20} more</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Documentation */}
      <div className="bg-gray-800/30 rounded-lg p-4 text-sm text-gray-400 space-y-2">
        <h3 className="font-semibold text-white">State Machine</h3>
        <p>SCHEDULED → LIVE → FINAL → SETTLED → ARCHIVED</p>
        <p>Terminal states: CANCELED, POSTPONED (full refund, markets voided)</p>
        
        <h3 className="font-semibold text-white mt-3">DB Protections (Hardened)</h3>
        <ul className="list-disc list-inside">
          <li>FINAL status cannot regress to LIVE/SCHEDULED</li>
          <li>Settled games are immutable (scores, winner cannot change)</li>
          <li>Settlement receipts prevent double-pay</li>
          <li>Job locks prevent concurrent cron execution</li>
        </ul>
        
        <h3 className="font-semibold text-white mt-3">Scheduled Jobs (Netlify)</h3>
        <ul className="list-disc list-inside">
          <li>sync-games-daily.mts: Every 15 min (discover + sync)</li>
          <li>sync-games-live.mts: Every 2 min (sync live games)</li>
          <li>lifecycle-finalize.mts: Every 10 min (finalize + settle)</li>
        </ul>
      </div>
    </div>
  );
}
