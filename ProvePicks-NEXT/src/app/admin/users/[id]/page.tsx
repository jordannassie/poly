"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Wallet, TrendingUp, CreditCard, Calendar, Globe, CheckCircle } from "lucide-react";
import Link from "next/link";

// Demo user detail data
const demoUser = {
  id: "1",
  username: "demo",
  displayName: "Demo Trader",
  email: "demo@provepicks.com",
  bio: "Sports betting enthusiast and prediction market trader. Focused on NFL and NBA markets.",
  website: "provepicks.com",
  createdAt: "2025-01-15",
  isVerified: true,
  stats: {
    totalPicks: 247,
    winRate: 64.8,
    totalVolume: "$892,340",
    profitLoss: "+$127,892",
  },
  wallets: [
    { address: "8xK3nR...9fD2", chain: "solana", verified: true, primary: true, createdAt: "2025-01-15" },
  ],
  recentPayouts: [
    { id: "p1", amount: "$1,250", status: "sent", date: "2025-01-28" },
    { id: "p2", amount: "$3,500", status: "sent", date: "2025-01-25" },
    { id: "p3", amount: "$890", status: "queued", date: "2025-01-29" },
  ],
};

export default function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const user = demoUser; // In production, fetch by params.id

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/users">
          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Users
          </Button>
        </Link>
      </div>

      {/* User Profile Header */}
      <Card className="bg-[#161b22] border-[#30363d]">
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-white font-bold text-2xl">
                {user.displayName.charAt(0)}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white">{user.displayName}</h1>
                {user.isVerified && (
                  <CheckCircle className="h-5 w-5 text-blue-500 fill-blue-500" />
                )}
              </div>
              <p className="text-gray-400">@{user.username}</p>
              <p className="text-gray-300 mt-2">{user.bio}</p>
              <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
                <span className="flex items-center gap-1">
                  <Globe className="h-4 w-4" />
                  {user.website}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Joined {user.createdAt}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">User ID</p>
              <p className="font-mono text-sm text-gray-300">{params.id}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-[#161b22] border-[#30363d]">
          <CardContent className="p-4">
            <p className="text-gray-400 text-sm">Total Picks</p>
            <p className="text-2xl font-bold text-white">{user.stats.totalPicks}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#161b22] border-[#30363d]">
          <CardContent className="p-4">
            <p className="text-gray-400 text-sm">Win Rate</p>
            <p className="text-2xl font-bold text-green-400">{user.stats.winRate}%</p>
          </CardContent>
        </Card>
        <Card className="bg-[#161b22] border-[#30363d]">
          <CardContent className="p-4">
            <p className="text-gray-400 text-sm">Total Volume</p>
            <p className="text-2xl font-bold text-white">{user.stats.totalVolume}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#161b22] border-[#30363d]">
          <CardContent className="p-4">
            <p className="text-gray-400 text-sm">Profit/Loss</p>
            <p className="text-2xl font-bold text-green-400">{user.stats.profitLoss}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Wallets */}
        <Card className="bg-[#161b22] border-[#30363d]">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Connected Wallets
            </h2>
            <div className="space-y-3">
              {user.wallets.map((wallet, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-[#0d1117] rounded-lg">
                  <div>
                    <p className="font-mono text-white">{wallet.address}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-400 uppercase">{wallet.chain}</span>
                      {wallet.verified && (
                        <span className="text-xs text-green-400">Verified</span>
                      )}
                      {wallet.primary && (
                        <span className="text-xs text-blue-400">Primary</span>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-gray-400">{wallet.createdAt}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Payouts */}
        <Card className="bg-[#161b22] border-[#30363d]">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Recent Payouts
            </h2>
            <div className="space-y-3">
              {user.recentPayouts.map((payout) => (
                <div key={payout.id} className="flex items-center justify-between p-3 bg-[#0d1117] rounded-lg">
                  <div>
                    <p className="font-semibold text-white">{payout.amount}</p>
                    <p className="text-xs text-gray-400">{payout.date}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    payout.status === "sent" 
                      ? "bg-green-500/20 text-green-400" 
                      : "bg-yellow-500/20 text-yellow-400"
                  }`}>
                    {payout.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
