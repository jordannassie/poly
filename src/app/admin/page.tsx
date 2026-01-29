"use client";

import { Card, CardContent } from "@/components/ui/card";
import { 
  Users, 
  Wallet, 
  TrendingUp, 
  CreditCard, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity
} from "lucide-react";
import Link from "next/link";

// Demo data - will be replaced with real data when Supabase is connected
const stats = {
  totalUsers: 1247,
  totalWallets: 892,
  marketsOpen: 24,
  marketsLive: 8,
  marketsFinal: 156,
  payoutsQueued: 12,
  payoutsFailed: 2,
  lastCacheWarm: "2 hours ago",
};

const recentActivity = [
  { type: "ADMIN_LOGIN", message: "Admin logged in", time: "2 min ago", severity: "info" },
  { type: "CACHE_WARM", message: "SportsDataIO cache warmed successfully", time: "2 hours ago", severity: "info" },
  { type: "MARKET_SETTLED", message: "Chiefs vs Eagles settled - HOME win", time: "5 hours ago", severity: "info" },
  { type: "PAYOUT_FAILED", message: "Payout to 8xK3...9fD2 failed - insufficient funds", time: "1 day ago", severity: "error" },
];

export default function AdminDashboard() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-gray-400">Overview of ProvePicks platform metrics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/admin/users">
          <Card className="bg-[#161b22] border-[#30363d] hover:border-blue-500/50 transition cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Users</p>
                  <p className="text-3xl font-bold text-white">{stats.totalUsers.toLocaleString()}</p>
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
                  <p className="text-3xl font-bold text-white">{stats.totalWallets.toLocaleString()}</p>
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
                    <span className="text-3xl font-bold text-white">{stats.marketsOpen + stats.marketsLive}</span>
                    <span className="text-xs text-green-400">({stats.marketsLive} live)</span>
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
                    <span className="text-3xl font-bold text-white">{stats.payoutsQueued}</span>
                    {stats.payoutsFailed > 0 && (
                      <span className="text-xs text-red-400">({stats.payoutsFailed} failed)</span>
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
                <span className="font-semibold text-white">{stats.marketsOpen}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#0d1117] rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
                  <span className="text-gray-300">Live</span>
                </div>
                <span className="font-semibold text-white">{stats.marketsLive}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#0d1117] rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-gray-500" />
                  <span className="text-gray-300">Final</span>
                </div>
                <span className="font-semibold text-white">{stats.marketsFinal}</span>
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
              {recentActivity.map((activity, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-[#0d1117] rounded-lg">
                  {activity.severity === "error" ? (
                    <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-300 truncate">{activity.message}</p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
              ))}
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
                <p className="text-sm text-gray-400">Last SportsDataIO cache warm: {stats.lastCacheWarm}</p>
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

      {/* Service Key Warning */}
      <Card className="bg-yellow-500/10 border-yellow-500/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <div>
              <p className="text-yellow-400 font-medium">Admin service key not configured</p>
              <p className="text-yellow-400/70 text-sm">
                Add SUPABASE_SERVICE_ROLE_KEY to Netlify env vars for full admin database access. 
                Currently showing demo data.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
