"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Users, 
  Wallet, 
  TrendingUp, 
  CreditCard, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  Loader2
} from "lucide-react";
import Link from "next/link";

interface DashboardData {
  users: { total: number };
  wallets: { total: number };
  markets: { open: number; live: number; settled: number };
  payouts: { queued: number; failed: number };
  recentLogs: Array<{
    id: string;
    event_type: string;
    severity: string;
    payload: Record<string, unknown>;
    created_at: string;
  }>;
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serviceKeyMissing, setServiceKeyMissing] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch all data in parallel
        const [usersRes, walletsRes, marketsRes, payoutsRes, logsRes] = await Promise.all([
          fetch("/api/admin/users"),
          fetch("/api/admin/wallets"),
          fetch("/api/admin/markets"),
          fetch("/api/admin/payouts"),
          fetch("/api/admin/logs?limit=5"),
        ]);

        // Check for service key error
        if (usersRes.status === 500) {
          const usersData = await usersRes.json();
          if (usersData.error === "Admin service key not configured") {
            setServiceKeyMissing(true);
            setLoading(false);
            return;
          }
        }

        const [users, wallets, markets, payouts, logs] = await Promise.all([
          usersRes.json(),
          walletsRes.json(),
          marketsRes.json(),
          payoutsRes.json(),
          logsRes.json(),
        ]);

        setData({
          users: { total: users.users?.length || 0 },
          wallets: { total: wallets.wallets?.length || 0 },
          markets: markets.counts || { open: 0, live: 0, settled: 0 },
          payouts: payouts.counts || { queued: 0, failed: 0 },
          recentLogs: logs.logs || [],
        });
      } catch (err) {
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (serviceKeyMissing) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-gray-400">Overview of ProvePicks platform metrics</p>
        </div>
        <Card className="bg-yellow-500/10 border-yellow-500/30">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-6 w-6 text-yellow-500 mt-0.5" />
              <div>
                <h3 className="text-yellow-400 font-semibold text-lg">Admin Service Key Not Configured</h3>
                <p className="text-yellow-400/80 mt-1">
                  To enable real data in admin pages, add <code className="bg-yellow-500/20 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> to your Netlify environment variables.
                </p>
                <p className="text-yellow-400/60 text-sm mt-2">
                  Get this key from your Supabase project settings → API → service_role key (keep it secret!)
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
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-gray-400">Overview of ProvePicks platform metrics</p>
      </div>

      {error && (
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/admin/users">
          <Card className="bg-[#161b22] border-[#30363d] hover:border-blue-500/50 transition cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Users</p>
                  <p className="text-3xl font-bold text-white">{data?.users.total.toLocaleString() || 0}</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/wallets">
          <Card className="bg-[#161b22] border-[#30363d] hover:border-purple-500/50 transition cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Connected Wallets</p>
                  <p className="text-3xl font-bold text-white">{data?.wallets.total.toLocaleString() || 0}</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/markets">
          <Card className="bg-[#161b22] border-[#30363d] hover:border-green-500/50 transition cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Markets</p>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-bold text-white">
                      {(data?.markets.open || 0) + (data?.markets.live || 0)}
                    </span>
                    {(data?.markets.live || 0) > 0 && (
                      <span className="text-xs text-green-400">({data?.markets.live} live)</span>
                    )}
                  </div>
                </div>
                <div className="h-12 w-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/payouts">
          <Card className="bg-[#161b22] border-[#30363d] hover:border-yellow-500/50 transition cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Payouts Queued</p>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-bold text-white">{data?.payouts.queued || 0}</span>
                    {(data?.payouts.failed || 0) > 0 && (
                      <span className="text-xs text-red-400">({data?.payouts.failed} failed)</span>
                    )}
                  </div>
                </div>
                <div className="h-12 w-12 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Market Status */}
        <Card className="bg-[#161b22] border-[#30363d]">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Market Status
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-[#0d1117] rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-gray-300">Open</span>
                </div>
                <span className="font-semibold text-white">{data?.markets.open || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#0d1117] rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
                  <span className="text-gray-300">Live</span>
                </div>
                <span className="font-semibold text-white">{data?.markets.live || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#0d1117] rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-gray-500" />
                  <span className="text-gray-300">Settled</span>
                </div>
                <span className="font-semibold text-white">{data?.markets.settled || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-[#161b22] border-[#30363d]">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Activity
            </h2>
            <div className="space-y-3">
              {data?.recentLogs && data.recentLogs.length > 0 ? (
                data.recentLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 p-3 bg-[#0d1117] rounded-lg">
                    {log.severity === "error" ? (
                      <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-300 truncate">{log.event_type}</p>
                      <p className="text-xs text-gray-500">{formatTime(log.created_at)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No recent activity</p>
              )}
            </div>
            <Link 
              href="/admin/logs"
              className="block text-center text-sm text-blue-400 hover:text-blue-300 mt-4"
            >
              View All Logs →
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* System Status Banner */}
      <Card className="bg-[#161b22] border-[#30363d]">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <div>
                <p className="text-white font-medium">All Systems Operational</p>
                <p className="text-sm text-gray-400">Connected to Supabase</p>
              </div>
            </div>
            <Link 
              href="/admin/sports"
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              View SportsDataIO Status →
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
