"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";

/**
 * Safe JSON fetch helper - prevents "Unexpected token <" errors
 * by checking content-type before parsing. Also returns status for special handling.
 */
async function safeFetchJson<T>(url: string, options?: RequestInit): Promise<{ data: T | null; error: string | null; status?: number }> {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get("content-type") || "";
    
    if (!contentType.includes("application/json")) {
      const text = await res.text();
      const preview = text.slice(0, 200);
      return { 
        data: null, 
        error: `HTTP ${res.status}: Expected JSON but got ${contentType || "unknown"}. Response: ${preview}${text.length > 200 ? '...' : ''}`,
        status: res.status,
      };
    }
    
    if (!res.ok) {
      const data = await res.json();
      return { data: null, error: `HTTP ${res.status}: ${data.error || JSON.stringify(data)}`, status: res.status };
    }
    
    const data = await res.json();
    return { data, error: null, status: res.status };
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
  // Batch info
  hasMore?: boolean;
  nextCursor?: { step?: string; leagueIndex?: number };
  batchInfo?: {
    currentStep: string;
    leagueIndex: number;
    totalLeagues: number;
    currentLeague: string;
  };
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
  const [batchProgress, setBatchProgress] = useState<string | null>(null);
  const [backfillLockWarning, setBackfillLockWarning] = useState<string | null>(null);
  const [backfillCooldown, setBackfillCooldown] = useState(0);
  const [showClearLockConfirm, setShowClearLockConfirm] = useState(false);
  const [clearingLock, setClearingLock] = useState(false);
  const [lockCleared, setLockCleared] = useState(false);
  
  // Treasury state
  const [treasury, setTreasury] = useState<{
    totalFeesCollected: number;
    totalWithdrawn: number;
    currentBalance: number;
    totalEntries: number;
    lastUpdated: string | null;
  } | null>(null);
  const [treasuryLedger, setTreasuryLedger] = useState<any[]>([]);
  const [settlementPreview, setSettlementPreview] = useState<{
    gameId: number;
    outcome: string;
    totals: {
      grossPool: number;
      winningPool: number;
      losingPool: number;
      platformFee: number;
      netDistributed: number;
      winnersCount: number;
      losersCount: number;
    };
    markets: any[];
  } | null>(null);
  const [previewGameId, setPreviewGameId] = useState<string>('');

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
    fetchTreasuryBalance(); // Also fetch treasury on load
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

  // Run job with auto-batching (up to 3 batches per click)
  const runJob = async (job: string, cursor?: any, batchCount = 0) => {
    const MAX_BATCHES_PER_CLICK = 3;
    
    setLoading(job);
    if (batchCount === 0) {
      setResult(null);
      setBatchProgress(null);
    }

    const { data, error } = await safeFetchJson<JobResult>("/api/admin/lifecycle/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job, cursor }),
    });

    if (error) {
      setResult({ success: false, error });
      setBatchProgress(null);
      setLoading(null);
      return;
    }
    
    if (data) {
      // Update result with cumulative counts
      setResult(prev => {
        if (!prev) return data;
        return {
          ...data,
          summary: {
            ...data.summary,
            fetched: (prev.summary?.fetched || 0) + (data.summary?.fetched || 0),
            upserted: (prev.summary?.upserted || 0) + (data.summary?.upserted || 0),
            finalized: (prev.summary?.finalized || 0) + (data.summary?.finalized || 0),
            enqueued: (prev.summary?.enqueued || 0) + (data.summary?.enqueued || 0),
            duration: (prev.summary?.duration || 0) + (data.summary?.duration || 0),
          },
        };
      });
      
      // Show batch progress
      if (data.batchInfo) {
        const { currentStep, leagueIndex, totalLeagues, currentLeague } = data.batchInfo;
        setBatchProgress(`${currentStep}: ${currentLeague} (${leagueIndex + 1}/${totalLeagues})`);
      }
      
      // Auto-continue if there's more and we haven't hit the limit
      if (data.hasMore && data.nextCursor && batchCount + 1 < MAX_BATCHES_PER_CLICK) {
        await runJob(job, data.nextCursor, batchCount + 1);
        return;
      }
      
      // Show "click again to continue" message if more batches needed
      if (data.hasMore) {
        setBatchProgress(`Processed ${batchCount + 1} batches. Click again to continue.`);
      } else {
        setBatchProgress("Complete!");
      }
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
      // Refresh treasury after settlements
      await fetchTreasuryBalance();
    }
    setLoading(null);
  };

  // Treasury functions
  const fetchTreasuryBalance = async () => {
    const { data, error } = await safeFetchJson<{ success: boolean; treasury: any }>("/api/admin/lifecycle/settlements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "treasury-balance" }),
    });

    if (error) {
      console.error("Failed to fetch treasury:", error);
    } else if (data?.treasury) {
      setTreasury(data.treasury);
    }
  };

  const fetchTreasuryLedger = async () => {
    setLoading("treasury-ledger");

    const { data, error } = await safeFetchJson<{ success: boolean; balance: any; ledger: any[] }>("/api/admin/lifecycle/settlements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "treasury-ledger", limit: 20 }),
    });

    if (error) {
      console.error("Failed to fetch treasury ledger:", error);
    } else if (data) {
      setTreasury(data.balance);
      setTreasuryLedger(data.ledger || []);
    }
    setLoading(null);
  };

  const fetchSettlementPreview = async () => {
    if (!previewGameId) return;
    
    setLoading("preview");

    const { data, error } = await safeFetchJson<{ success: boolean; alreadyProcessed: boolean; preview: any }>("/api/admin/lifecycle/settlements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "preview", gameId: parseInt(previewGameId) }),
    });

    if (error) {
      console.error("Failed to fetch settlement preview:", error);
      setResult({ success: false, error });
    } else if (data) {
      if (data.alreadyProcessed) {
        setResult({ success: true, error: `Game ${previewGameId} was already settled.` });
        setSettlementPreview(null);
      } else {
        setSettlementPreview(data.preview);
      }
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
    setBackfillLockWarning(null);

    const { data, error, status } = await safeFetchJson<{ progress: BackfillProgress }>("/api/admin/lifecycle/backfill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start", days: backfillDays }),
    });

    if (error) {
      // Handle 409 Conflict (lock active) as a warning, not an error
      if (status === 409) {
        setBackfillLockWarning("Backfill already running or lock active. Please wait 1–2 minutes and try again.");
        // Disable button for 60 seconds
        setBackfillCooldown(60);
        const countdown = setInterval(() => {
          setBackfillCooldown(prev => {
            if (prev <= 1) {
              clearInterval(countdown);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        console.error("Failed to start backfill:", error);
        setResult({ success: false, error });
      }
    } else if (data) {
      setBackfill(data.progress);
      setBackfillLockWarning(null);
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

  const forceClearBackfillLock = async () => {
    setClearingLock(true);
    setLockCleared(false);

    const { data, error } = await safeFetchJson<{ success: boolean; released: boolean }>("/api/admin/lifecycle/health", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "force-release-job-lock", jobName: "backfill" }),
    });

    if (error) {
      console.error("Failed to clear backfill lock:", error);
      setResult({ success: false, error });
    } else if (data) {
      // Clear the warning and cooldown
      setBackfillLockWarning(null);
      setBackfillCooldown(0);
      setLockCleared(true);
      // Auto-hide after 3s
      setTimeout(() => setLockCleared(false), 3000);
    }

    setClearingLock(false);
    setShowClearLockConfirm(false);
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
        return 'text-slate-400';
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
        return 'bg-slate-700/30 border-slate-600';
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
        return 'bg-slate-600 text-slate-300';
      default:
        return 'bg-slate-600 text-slate-300';
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
        <h1 className="text-2xl font-bold text-slate-100">Game Lifecycle Manager</h1>
        <p className="text-slate-400 mt-1">
          Production-grade game state machine and settlement system
        </p>
      </div>

      {/* Scheduled Jobs Status Card */}
      <div className="bg-slate-800/50 rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Scheduled Jobs Status</h2>
            <p className="text-sm text-slate-400">
              Netlify cron jobs running in production
              {scheduledJobs?.fetched_at && (
                <span className="ml-2 text-xs text-slate-500">
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
            className="text-slate-100 border-slate-700 hover:bg-slate-700"
          >
            Refresh
          </Button>
        </div>

        {scheduledJobs?.error && (
          <div className="text-sm text-yellow-400 bg-yellow-900/20 border border-yellow-800/50 rounded p-2">
            {scheduledJobs.error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(scheduledJobs?.jobs || []).map((job) => (
            <div
              key={job.job_name}
              className="bg-slate-700/50 rounded-lg p-3 border border-slate-600"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-slate-100 text-sm">
                  {job.job_name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getJobStatusBadge(job.status)}`}>
                  {job.status.toUpperCase()}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400">Last run:</span>
                  <span className="text-slate-100 ml-1">{formatTimeAgo(job.finished_at || job.started_at)}</span>
                </div>
                <div>
                  <span className="text-slate-400">Duration:</span>
                  <span className="text-slate-100 ml-1">{formatDuration(job.duration_ms)}</span>
                </div>
              </div>
              
              {job.counts && (
                <div className="mt-1 text-xs text-slate-400 truncate">
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
                    className="text-xs px-2 py-0.5 bg-slate-600 hover:bg-slate-500 rounded text-slate-300 flex-shrink-0"
                  >
                    {copiedError === job.job_name ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {(!scheduledJobs || scheduledJobs.jobs.length === 0) && !scheduledJobs?.error && (
          <div className="text-sm text-slate-400 text-center py-4">
            <div className="flex items-center justify-center gap-2">
              <div className="animate-pulse flex gap-2">
                <div className="h-2 w-2 bg-slate-600 rounded-full"></div>
                <div className="h-2 w-2 bg-slate-600 rounded-full"></div>
                <div className="h-2 w-2 bg-slate-600 rounded-full"></div>
              </div>
              <span>Loading scheduled jobs status...</span>
            </div>
          </div>
        )}
      </div>

      {/* Health Checks Section */}
      <div className="bg-slate-800/50 rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Health Checks</h2>
            <p className="text-sm text-slate-400">Monitor for stuck games and processing issues</p>
          </div>
          <Button
            onClick={fetchHealthChecks}
            disabled={loading !== null}
            variant="outline"
            className="text-slate-100 border-slate-700 hover:bg-slate-700"
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
                <span className="text-sm text-slate-400">
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
                    <span className="text-sm font-semibold text-slate-100">{key.replace(/_/g, ' ')}</span>
                    <span className={`text-sm font-bold ${getStatusColor(check.status)}`}>
                      {check.count}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{check.description}</p>
                  {check.items && check.items.length > 0 && (
                    <div className="mt-2 text-xs text-slate-500 max-h-20 overflow-y-auto">
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
      <div className="bg-slate-800/50 rounded-lg p-4 space-y-4">
        <h2 className="text-lg font-semibold text-slate-100">Lifecycle Jobs</h2>
        <p className="text-sm text-slate-400">
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

        {/* Batch progress indicator */}
        {batchProgress && (
          <div className="text-sm text-blue-400 bg-blue-900/20 border border-blue-800/50 rounded p-2">
            {loading ? "Processing: " : ""}{batchProgress}
          </div>
        )}

        <div className="text-xs text-slate-500 space-y-1">
          <p><strong className="text-slate-400">Discover:</strong> Ingest games for rolling 72h window (36h back, 36h forward)</p>
          <p><strong className="text-slate-400">Sync:</strong> Update scores/status for live games, detect finalized games</p>
          <p><strong className="text-slate-400">Finalize:</strong> Mark stuck/completed games as FINAL, enqueue for settlement</p>
          <p className="text-slate-600 italic">Jobs run in small batches to prevent timeouts. Click multiple times for large datasets.</p>
        </div>
      </div>

      {/* Result Display */}
      {result && (
        <div className={`rounded-lg p-4 ${result.success ? 'bg-green-900/30 border border-green-700' : 'bg-red-900/30 border border-red-700'}`}>
          <h3 className="font-semibold text-slate-100 mb-2">
            {result.success ? "✓ Job Completed" : "✗ Job Failed"}
            {result.skipped && " (Skipped - already running)"}
          </h3>
          {result.summary && (
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-slate-400">Fetched:</span>
                <span className="text-slate-100 ml-2">{result.summary.fetched}</span>
              </div>
              <div>
                <span className="text-slate-400">Upserted:</span>
                <span className={`ml-2 ${result.summary.upserted === 0 && result.summary.fetched > 0 ? 'text-red-400 font-bold' : 'text-slate-100'}`}>
                  {result.summary.upserted}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Finalized:</span>
                <span className="text-slate-100 ml-2">{result.summary.finalized}</span>
              </div>
              <div>
                <span className="text-slate-400">Enqueued:</span>
                <span className="text-slate-100 ml-2">{result.summary.enqueued}</span>
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
                  className="text-xs text-slate-400 hover:text-slate-100 px-2 py-1 bg-slate-700 rounded"
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
                    <strong>Hint:</strong> Run in Supabase SQL editor: <code className="bg-slate-800 px-1 rounded">NOTIFY pgrst, &apos;reload schema&apos;;</code>
                  </p>
                </div>
              )}
            </div>
          )}
          
          {/* Show additional errors list */}
          {result.errors && result.errors.length > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-slate-400">All Errors ({result.errors.length})</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(result.errors?.join('\n') || '');
                  }}
                  className="text-xs text-slate-400 hover:text-slate-100 px-2 py-1 bg-slate-700 rounded"
                >
                  Copy All
                </button>
              </div>
              <div className="text-xs text-red-400 max-h-24 overflow-y-auto space-y-1 font-mono bg-red-950/30 p-2 rounded">
                {result.errors.slice(0, 5).map((err, i) => (
                  <div key={i} className="truncate">{err}</div>
                ))}
                {result.errors.length > 5 && (
                  <div className="text-slate-500">...and {result.errors.length - 5} more</div>
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
      <div className="bg-slate-800/50 rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Settlement Queue</h2>
            <p className="text-sm text-slate-400">Games waiting for settlement</p>
          </div>
          <Button
            onClick={fetchSettlementQueue}
            disabled={loading !== null}
            variant="outline"
            className="text-slate-100 border-slate-700 hover:bg-slate-700"
          >
            {loading === "queue" ? "Loading..." : "Refresh"}
          </Button>
        </div>

        {stats && (
          <div className="grid grid-cols-5 gap-4 text-center">
            <div className="bg-yellow-900/30 border border-yellow-800/50 rounded p-2">
              <div className="text-2xl font-bold text-yellow-400">{stats.queued}</div>
              <div className="text-xs text-slate-400">Queued</div>
            </div>
            <div className="bg-blue-900/30 border border-blue-800/50 rounded p-2">
              <div className="text-2xl font-bold text-blue-400">{stats.processing}</div>
              <div className="text-xs text-slate-400">Processing</div>
            </div>
            <div className="bg-green-900/30 border border-green-800/50 rounded p-2">
              <div className="text-2xl font-bold text-green-400">{stats.done}</div>
              <div className="text-xs text-slate-400">Done</div>
            </div>
            <div className="bg-red-900/30 border border-red-800/50 rounded p-2">
              <div className="text-2xl font-bold text-red-400">{stats.failed}</div>
              <div className="text-xs text-slate-400">Failed</div>
            </div>
            <div className="bg-slate-700/50 border border-slate-600/50 rounded p-2">
              <div className="text-2xl font-bold text-slate-300">{stats.skipped}</div>
              <div className="text-xs text-slate-400">Skipped</div>
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
            <h3 className="text-sm font-semibold text-slate-300">Recent Queue Items</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {queueItems.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between bg-slate-700/50 border border-slate-600/50 rounded p-2 text-sm"
                >
                  <div>
                    <span className="text-slate-100">{item.league.toUpperCase()}</span>
                    <span className="text-slate-400 ml-2">
                      {item.game?.home_team} vs {item.game?.away_team}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs text-white ${
                      item.status === 'QUEUED' ? 'bg-yellow-600' :
                      item.status === 'PROCESSING' ? 'bg-blue-600' :
                      item.status === 'DONE' ? 'bg-green-600' :
                      item.status === 'FAILED' ? 'bg-red-600' :
                      'bg-slate-600'
                    }`}>
                      {item.status}
                    </span>
                    <span className="text-slate-400 text-xs">
                      {item.outcome || '-'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Treasury Section */}
      <div className="bg-slate-800/50 rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Treasury (3% Fee)</h2>
            <p className="text-sm text-slate-400">Platform fees from losing side of settlements</p>
          </div>
          <Button
            onClick={fetchTreasuryLedger}
            disabled={loading !== null}
            variant="outline"
            className="text-slate-100 border-slate-700 hover:bg-slate-700"
          >
            {loading === "treasury-ledger" ? "Loading..." : "View Ledger"}
          </Button>
        </div>

        {treasury && (
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="bg-green-900/30 border border-green-800/50 rounded p-3">
              <div className="text-2xl font-bold text-green-400">
                ${treasury.currentBalance.toFixed(2)}
              </div>
              <div className="text-xs text-slate-400">Current Balance</div>
            </div>
            <div className="bg-blue-900/30 border border-blue-800/50 rounded p-3">
              <div className="text-2xl font-bold text-blue-400">
                ${treasury.totalFeesCollected.toFixed(2)}
              </div>
              <div className="text-xs text-slate-400">Total Collected</div>
            </div>
            <div className="bg-yellow-900/30 border border-yellow-800/50 rounded p-3">
              <div className="text-2xl font-bold text-yellow-400">
                ${treasury.totalWithdrawn.toFixed(2)}
              </div>
              <div className="text-xs text-slate-400">Total Withdrawn</div>
            </div>
            <div className="bg-slate-700/50 border border-slate-600/50 rounded p-3">
              <div className="text-2xl font-bold text-slate-300">
                {treasury.totalEntries}
              </div>
              <div className="text-xs text-slate-400">Entries</div>
            </div>
          </div>
        )}

        {/* Settlement Preview */}
        <div className="border-t border-slate-700 pt-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Settlement Preview</h3>
          <p className="text-xs text-slate-400 mb-2">
            Preview payout distribution before settling a game (3% fee from losing side)
          </p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={previewGameId}
              onChange={(e) => setPreviewGameId(e.target.value)}
              placeholder="Game ID"
              className="w-32 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-100 text-sm focus:border-slate-500 focus:outline-none"
            />
            <Button
              onClick={fetchSettlementPreview}
              disabled={loading !== null || !previewGameId}
              variant="outline"
              className="text-slate-100 border-slate-700 hover:bg-slate-700"
            >
              {loading === "preview" ? "Loading..." : "Preview"}
            </Button>
          </div>
          
          {settlementPreview && (
            <div className="mt-4 bg-slate-700/50 border border-slate-600/50 rounded p-3 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-300">Game {settlementPreview.gameId}</span>
                <span className={`px-2 py-0.5 rounded text-xs text-white ${
                  settlementPreview.outcome === 'HOME' ? 'bg-blue-600' :
                  settlementPreview.outcome === 'AWAY' ? 'bg-red-600' :
                  'bg-slate-600'
                }`}>
                  {settlementPreview.outcome}
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="bg-slate-800/50 rounded p-2">
                  <div className="text-lg font-bold text-slate-100">
                    ${settlementPreview.totals.grossPool.toFixed(2)}
                  </div>
                  <div className="text-xs text-slate-400">Gross Pool</div>
                </div>
                <div className="bg-green-900/30 rounded p-2">
                  <div className="text-lg font-bold text-green-400">
                    ${settlementPreview.totals.winningPool.toFixed(2)}
                  </div>
                  <div className="text-xs text-slate-400">Winners ({settlementPreview.totals.winnersCount})</div>
                </div>
                <div className="bg-red-900/30 rounded p-2">
                  <div className="text-lg font-bold text-red-400">
                    ${settlementPreview.totals.losingPool.toFixed(2)}
                  </div>
                  <div className="text-xs text-slate-400">Losers ({settlementPreview.totals.losersCount})</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-center text-sm">
                <div className="bg-yellow-900/30 rounded p-2">
                  <div className="text-lg font-bold text-yellow-400">
                    ${settlementPreview.totals.platformFee.toFixed(2)}
                  </div>
                  <div className="text-xs text-slate-400">Treasury Fee (3%)</div>
                </div>
                <div className="bg-blue-900/30 rounded p-2">
                  <div className="text-lg font-bold text-blue-400">
                    ${settlementPreview.totals.netDistributed.toFixed(2)}
                  </div>
                  <div className="text-xs text-slate-400">Net to Winners</div>
                </div>
              </div>

              {settlementPreview.markets.length > 0 && (
                <div className="text-xs text-slate-400">
                  {settlementPreview.markets.length} market(s) will be settled
                </div>
              )}
            </div>
          )}
        </div>

        {/* Treasury Ledger */}
        {treasuryLedger.length > 0 && (
          <div className="border-t border-slate-700 pt-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">Recent Treasury Entries</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {treasuryLedger.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between bg-slate-700/50 border border-slate-600/50 rounded p-2 text-sm"
                >
                  <div className="flex-1">
                    <span className="text-slate-100">
                      {entry.game?.home_team || '?'} vs {entry.game?.away_team || '?'}
                    </span>
                    <span className="text-slate-400 ml-2 text-xs">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">
                      Pool: ${Number(entry.losing_pool || 0).toFixed(0)}
                    </span>
                    <span className="text-green-400 font-medium">
                      +${Number(entry.amount).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Backfill Section */}
      <div className="bg-slate-800/50 rounded-lg p-4 space-y-4">
        <h2 className="text-lg font-semibold text-slate-100">Backfill Tool</h2>
        <p className="text-sm text-slate-400">
          Backfill games from the last N days. Useful for populating historical data.
        </p>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-400">Days to backfill:</label>
            <input
              type="number"
              value={backfillDays}
              onChange={(e) => setBackfillDays(parseInt(e.target.value) || 30)}
              className="w-20 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-100 text-sm focus:border-slate-500 focus:outline-none"
              min={1}
              max={90}
            />
          </div>

          <Button
            onClick={startBackfill}
            disabled={loading !== null || backfill?.status === 'running' || backfillCooldown > 0}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          >
            {backfillCooldown > 0 ? `Wait ${backfillCooldown}s` : "Start Backfill"}
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
            className="text-slate-100 border-slate-700 hover:bg-slate-700"
          >
            Refresh Status
          </Button>
        </div>

        {/* Helper text */}
        <p className="text-xs text-slate-500 italic">
          Backfill runs in batches and may temporarily lock. This is normal.
        </p>

        {/* Backfill lock warning (409 response) - warning style, not error */}
        {backfillLockWarning && (
          <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-3 flex items-start gap-2">
            <span className="text-amber-400 text-lg">⚠</span>
            <div className="flex-1">
              <p className="text-sm text-amber-300 font-medium">{backfillLockWarning}</p>
              {backfillCooldown > 0 && (
                <p className="text-xs text-amber-400/70 mt-1">Button will re-enable in {backfillCooldown}s</p>
              )}
              <div className="mt-2">
                {!showClearLockConfirm ? (
                  <button
                    onClick={() => setShowClearLockConfirm(true)}
                    className="text-xs text-amber-400 hover:text-amber-300 underline"
                  >
                    Force Clear Backfill Lock
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-amber-400">Clear stuck lock? (safe in dev/testing)</span>
                    <Button
                      onClick={forceClearBackfillLock}
                      disabled={clearingLock}
                      size="sm"
                      className="bg-amber-600 hover:bg-amber-700 text-white text-xs px-2 py-1 h-auto"
                    >
                      {clearingLock ? "Clearing..." : "Confirm"}
                    </Button>
                    <button
                      onClick={() => setShowClearLockConfirm(false)}
                      className="text-xs text-slate-400 hover:text-slate-300"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Lock cleared success message */}
        {lockCleared && (
          <div className="bg-green-900/30 border border-green-700 rounded-lg p-3 flex items-center gap-2">
            <span className="text-green-400">✓</span>
            <p className="text-sm text-green-300">Backfill lock cleared. You can try again now.</p>
          </div>
        )}

        {backfill && backfill.status !== 'idle' && (
          <div className={`rounded-lg p-3 border ${
            backfill.status === 'running' ? 'bg-blue-900/30 border-blue-700' :
            backfill.status === 'completed' ? 'bg-green-900/30 border-green-700' :
            backfill.status === 'failed' ? 'bg-red-900/30 border-red-700' :
            'bg-slate-700/30 border-slate-600'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-100">
                Backfill {backfill.status.toUpperCase()}
              </span>
              {backfill.status === 'running' && (
                <span className="text-sm text-slate-400">
                  Day {backfill.currentDay}/{backfill.totalDays} ({backfill.currentLeague})
                </span>
              )}
            </div>

            {backfill.status === 'running' && (
              <div className="w-full bg-slate-700 rounded-full h-2 mb-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${((backfill.currentDay || 0) / (backfill.totalDays || 1)) * 100}%` }}
                />
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-slate-400">Processed:</span>
                <span className="text-slate-100 ml-2">{backfill.gamesProcessed}</span>
              </div>
              <div>
                <span className="text-slate-400">Upserted:</span>
                <span className="text-slate-100 ml-2">{backfill.gamesUpserted}</span>
              </div>
              <div>
                <span className="text-slate-400">Finalized:</span>
                <span className="text-slate-100 ml-2">{backfill.gamesFinalized}</span>
              </div>
            </div>

            {backfill.errors.length > 0 && (
              <div className="mt-2 text-xs text-red-400 max-h-20 overflow-y-auto bg-red-950/30 rounded p-2">
                {backfill.errors.slice(-5).map((err, i) => (
                  <div key={i}>{err}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Finalize Debug Section */}
      <div className="bg-slate-800/50 rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Finalize Debug</h2>
            <p className="text-sm text-slate-400">View finalize candidates and diagnose why Finalized=0</p>
          </div>
          <Button
            onClick={fetchFinalizeDebug}
            disabled={loading !== null}
            variant="outline"
            className="text-slate-100 border-slate-700 hover:bg-slate-700"
          >
            {loading === "finalize-debug" ? "Loading..." : "Show Finalize Candidates"}
          </Button>
        </div>

        {finalizeDebug && (
          <div className="space-y-4">
            {/* Stats Summary */}
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="bg-slate-700/50 border border-slate-600/50 rounded p-2">
                <div className="text-xl font-bold text-slate-100">{finalizeDebug.stats.total_candidates}</div>
                <div className="text-xs text-slate-400">Candidates</div>
              </div>
              <div className="bg-green-900/30 border border-green-800/50 rounded p-2">
                <div className="text-xl font-bold text-green-400">{finalizeDebug.stats.final_flipped}</div>
                <div className="text-xs text-slate-400">Final (Provider)</div>
              </div>
              <div className="bg-yellow-900/30 border border-yellow-800/50 rounded p-2">
                <div className="text-xl font-bold text-yellow-400">{finalizeDebug.stats.still_live}</div>
                <div className="text-xs text-slate-400">Still Live</div>
              </div>
              <div className="bg-blue-900/30 border border-blue-800/50 rounded p-2">
                <div className="text-xl font-bold text-blue-400">{finalizeDebug.stats.still_scheduled}</div>
                <div className="text-xs text-slate-400">Still Scheduled</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-red-900/30 border border-red-800/50 rounded p-2">
                <div className="text-xl font-bold text-red-400">{finalizeDebug.stats.provider_not_found}</div>
                <div className="text-xs text-slate-400">Not Found (Provider)</div>
              </div>
              <div className="bg-purple-900/30 border border-purple-800/50 rounded p-2">
                <div className="text-xl font-bold text-purple-400">{finalizeDebug.stats.final_with_markets}</div>
                <div className="text-xs text-slate-400">Final + Markets</div>
              </div>
              <div className="bg-orange-900/30 border border-orange-800/50 rounded p-2">
                <div className="text-xl font-bold text-orange-400">{finalizeDebug.stats.final_no_markets}</div>
                <div className="text-xs text-slate-400">Final No Markets</div>
              </div>
            </div>

            {/* Interpretation */}
            <div className="p-3 bg-slate-700/30 rounded border border-slate-600">
              <h4 className="text-sm font-semibold text-slate-100 mb-2">Interpretation</h4>
              <ul className="text-xs text-slate-400 space-y-1">
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
                    <tr className="text-left text-slate-400 border-b border-slate-700">
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
                      <tr key={i} className="border-b border-slate-800 text-slate-300">
                        <td className="p-2 uppercase">{c.league}</td>
                        <td className="p-2 font-mono text-xs">{c.external_game_id}</td>
                        <td className="p-2 truncate max-w-32">{c.home_team} vs {c.away_team}</td>
                        <td className="p-2">{c.starts_at ? new Date(c.starts_at).toLocaleString() : '-'}</td>
                        <td className="p-2">
                          <span className={`px-1 rounded text-xs text-white ${
                            c.status_norm === 'FINAL' ? 'bg-green-600' :
                            c.status_norm === 'LIVE' ? 'bg-blue-600' :
                            'bg-slate-600'
                          }`}>
                            {c.status_norm || c.status_raw || '-'}
                          </span>
                        </td>
                        <td className="p-2">
                          <span className={`px-1 rounded text-xs text-white ${
                            c.provider_status_norm === 'FINAL' ? 'bg-green-600' :
                            c.provider_status_norm === 'LIVE' ? 'bg-blue-600' :
                            c.provider_status_norm ? 'bg-slate-600' : 'bg-red-900'
                          }`}>
                            {c.provider_status_norm || 'NOT FOUND'}
                          </span>
                        </td>
                        <td className="p-2">
                          <span className={c.markets_count && c.markets_count > 0 ? 'text-green-400' : 'text-slate-500'}>
                            {c.markets_count || 0}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {finalizeDebug.candidates.length > 20 && (
                  <p className="text-xs text-slate-500 mt-2">...and {finalizeDebug.candidates.length - 20} more</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Documentation */}
      <div className="bg-slate-800/30 rounded-lg p-4 text-sm text-slate-400 space-y-2 border border-slate-700/50">
        <h3 className="font-semibold text-slate-100">State Machine</h3>
        <p>SCHEDULED → LIVE → FINAL → SETTLED → ARCHIVED</p>
        <p>Terminal states: CANCELED, POSTPONED (full refund, markets voided)</p>
        
        <h3 className="font-semibold text-slate-100 mt-3">DB Protections (Hardened)</h3>
        <ul className="list-disc list-inside">
          <li>FINAL status cannot regress to LIVE/SCHEDULED</li>
          <li>Settled games are immutable (scores, winner cannot change)</li>
          <li>Settlement receipts prevent double-pay</li>
          <li>Job locks prevent concurrent cron execution</li>
        </ul>
        
        <h3 className="font-semibold text-slate-100 mt-3">Scheduled Jobs (Netlify)</h3>
        <ul className="list-disc list-inside">
          <li>sync-games-daily.ts: Every 15 min (discover + sync)</li>
          <li>sync-games-live.ts: Every 2 min (sync live games)</li>
          <li>lifecycle-finalize.ts: Every 10 min (finalize + settle)</li>
        </ul>
      </div>
    </div>
  );
}
