"use client";

import { useEffect, useState } from "react";
import { TopNav } from "@/components/TopNav";
import { CategoryTabs } from "@/components/CategoryTabs";
import { MainFooter } from "@/components/MainFooter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getDemoUser } from "@/lib/demoAuth";
import { 
  User, 
  Globe, 
  Trophy, 
  Target, 
  TrendingUp, 
  BarChart3, 
  Calendar,
  Flame,
  Award,
  Star,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Share2,
  MoreHorizontal
} from "lucide-react";
import Link from "next/link";

type Props = {
  params: { username: string };
};

// Demo user profile data
const demoProfile = {
  username: "demo",
  displayName: "Demo Trader",
  bio: "Sports betting enthusiast and prediction market trader. Focused on NFL and NBA markets. Always looking for value plays and sharp lines.",
  website: "provepicks.com",
  avatarUrl: null,
  joinedDate: "January 2025",
  isVerified: true,
  stats: {
    totalPicks: 247,
    winRate: 64.8,
    totalVolume: "$892,340",
    profitLoss: "+$127,892",
    streak: 7,
    rank: 12,
    bestWin: "$45,230",
  },
  recentPicks: [
    {
      id: 1,
      market: "Chiefs vs Eagles - Super Bowl",
      pick: "Chiefs ML",
      odds: 65,
      amount: "$5,000",
      result: "won",
      profit: "+$3,250",
      date: "2 hours ago",
    },
    {
      id: 2,
      market: "Lakers vs Celtics",
      pick: "Celtics -5.5",
      odds: 52,
      amount: "$2,500",
      result: "won",
      profit: "+$1,300",
      date: "5 hours ago",
    },
    {
      id: 3,
      market: "Bitcoin above $100K Feb",
      pick: "Yes",
      odds: 78,
      amount: "$10,000",
      result: "pending",
      profit: null,
      date: "1 day ago",
    },
    {
      id: 4,
      market: "Warriors vs Nuggets",
      pick: "Warriors +6.5",
      odds: 47,
      amount: "$3,000",
      result: "lost",
      profit: "-$3,000",
      date: "2 days ago",
    },
    {
      id: 5,
      market: "Bruins vs Rangers",
      pick: "Under 5.5",
      odds: 52,
      amount: "$1,500",
      result: "won",
      profit: "+$780",
      date: "3 days ago",
    },
  ],
  achievements: [
    { id: 1, name: "First Win", icon: "🎯", unlocked: true },
    { id: 2, name: "10 Win Streak", icon: "🔥", unlocked: true },
    { id: 3, name: "Big Spender", icon: "💰", unlocked: true },
    { id: 4, name: "Top 10", icon: "🏆", unlocked: false },
    { id: 5, name: "Market Maker", icon: "📈", unlocked: true },
    { id: 6, name: "Sharp", icon: "🎲", unlocked: true },
  ],
};

export default function PublicProfilePage({ params }: Props) {
  const { username } = params;
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [activeTab, setActiveTab] = useState<"picks" | "stats" | "achievements">("picks");

  useEffect(() => {
    const demoUser = getDemoUser();
    if (demoUser) {
      const demoHandle = demoUser.handle.replace("@", "").toLowerCase();
      setIsOwnProfile(username.toLowerCase() === demoHandle || username.toLowerCase() === "demo");
    }
  }, [username]);

  // For demo purposes, show the demo profile for any username
  // In production, this would fetch from Supabase
  const profile = demoProfile;

  return (
    <div className="min-h-screen bg-[color:var(--app-bg)] text-[color:var(--text-strong)]">
      <TopNav />
      <CategoryTabs activeLabel="Trending" />
      <main className="mx-auto w-full max-w-4xl px-4 py-6">
        {/* Profile Header Card */}
        <Card className="bg-[color:var(--surface)] border-[color:var(--border-soft)] overflow-hidden mb-6">
          {/* Banner */}
          <div className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 h-32 relative">
            <div className="absolute inset-0 bg-black/20" />
            {/* Rank Badge */}
            <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-400" />
              <span className="text-white text-sm font-semibold">Rank #{profile.stats.rank}</span>
            </div>
          </div>
          
          <CardContent className="p-6 -mt-16 relative">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Avatar */}
              <div className="relative">
                <div className="h-32 w-32 rounded-full border-4 border-[color:var(--surface)] bg-gradient-to-br from-purple-500 via-pink-500 to-yellow-500 flex items-center justify-center shadow-xl">
                  <span className="text-4xl font-bold text-white">
                    {profile.displayName.split(" ").map(n => n[0]).join("")}
                  </span>
                </div>
                {/* Online indicator */}
                <div className="absolute bottom-2 right-2 h-5 w-5 rounded-full bg-green-500 border-4 border-[color:var(--surface)]" />
              </div>
              
              <div className="flex-1 sm:pt-16">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-2xl font-bold">{profile.displayName}</h1>
                      {profile.isVerified && (
                        <CheckCircle className="h-5 w-5 text-blue-500 fill-blue-500" />
                      )}
                    </div>
                    <p className="text-[color:var(--text-muted)]">@{username}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="border-[color:var(--border-soft)]">
                      <Share2 className="h-4 w-4" />
                    </Button>
                    {isOwnProfile ? (
                      <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                        <Link href="/settings">Edit Profile</Link>
                      </Button>
                    ) : (
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                        Follow
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bio */}
            <p className="mt-4 text-[color:var(--text-strong)] leading-relaxed">
              {profile.bio}
            </p>

            {/* Meta info */}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-[color:var(--text-muted)]">
              {profile.website && (
                <a
                  href={`https://${profile.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-500 hover:underline"
                >
                  <Globe className="h-4 w-4" />
                  {profile.website}
                </a>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Joined {profile.joinedDate}
              </div>
              <div className="flex items-center gap-1">
                <Flame className="h-4 w-4 text-orange-500" />
                {profile.stats.streak} win streak
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-[color:var(--surface)] border-[color:var(--border-soft)] hover:border-blue-500/50 transition">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Target className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{profile.stats.totalPicks}</div>
                  <div className="text-xs text-[color:var(--text-muted)]">Total Picks</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[color:var(--surface)] border-[color:var(--border-soft)] hover:border-yellow-500/50 transition">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{profile.stats.winRate}%</div>
                  <div className="text-xs text-[color:var(--text-muted)]">Win Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[color:var(--surface)] border-[color:var(--border-soft)] hover:border-purple-500/50 transition">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{profile.stats.totalVolume}</div>
                  <div className="text-xs text-[color:var(--text-muted)]">Volume</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[color:var(--surface)] border-[color:var(--border-soft)] hover:border-green-500/50 transition">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-500">{profile.stats.profitLoss}</div>
                  <div className="text-xs text-[color:var(--text-muted)]">Profit/Loss</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-[color:var(--border-soft)]">
          <button
            onClick={() => setActiveTab("picks")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition -mb-px ${
              activeTab === "picks"
                ? "border-blue-500 text-blue-500"
                : "border-transparent text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)]"
            }`}
          >
            Recent Picks
          </button>
          <button
            onClick={() => setActiveTab("stats")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition -mb-px ${
              activeTab === "stats"
                ? "border-blue-500 text-blue-500"
                : "border-transparent text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)]"
            }`}
          >
            Detailed Stats
          </button>
          <button
            onClick={() => setActiveTab("achievements")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition -mb-px ${
              activeTab === "achievements"
                ? "border-blue-500 text-blue-500"
                : "border-transparent text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)]"
            }`}
          >
            Achievements
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "picks" && (
          <div className="space-y-3">
            {profile.recentPicks.map((pick) => (
              <Card 
                key={pick.id} 
                className={`bg-[color:var(--surface)] border-[color:var(--border-soft)] overflow-hidden ${
                  pick.result === "won" ? "border-l-4 border-l-green-500" :
                  pick.result === "lost" ? "border-l-4 border-l-red-500" :
                  "border-l-4 border-l-yellow-500"
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{pick.market}</span>
                        {pick.result === "pending" && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-500/10 text-yellow-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Pending
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-[color:var(--text-muted)]">
                          Pick: <span className="text-[color:var(--text-strong)] font-medium">{pick.pick}</span>
                        </span>
                        <span className="text-[color:var(--text-muted)]">
                          @ {pick.odds}¢
                        </span>
                        <span className="text-[color:var(--text-muted)]">
                          {pick.amount}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      {pick.profit && (
                        <div className={`text-lg font-bold flex items-center gap-1 ${
                          pick.profit.startsWith("+") ? "text-green-500" : "text-red-500"
                        }`}>
                          {pick.profit.startsWith("+") ? (
                            <ArrowUpRight className="h-4 w-4" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4" />
                          )}
                          {pick.profit}
                        </div>
                      )}
                      <div className="text-xs text-[color:var(--text-muted)]">{pick.date}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            <Button variant="outline" className="w-full border-[color:var(--border-soft)]">
              Load More
            </Button>
          </div>
        )}

        {activeTab === "stats" && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-[color:var(--surface)] border-[color:var(--border-soft)]">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Performance</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[color:var(--text-muted)]">Win Rate</span>
                    <span className="font-semibold">{profile.stats.winRate}%</span>
                  </div>
                  <div className="w-full bg-[color:var(--surface-2)] rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${profile.stats.winRate}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[color:var(--text-muted)]">Current Streak</span>
                    <span className="font-semibold text-orange-500">{profile.stats.streak} wins</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[color:var(--text-muted)]">Best Single Win</span>
                    <span className="font-semibold text-green-500">{profile.stats.bestWin}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[color:var(--text-muted)]">Leaderboard Rank</span>
                    <span className="font-semibold">#{profile.stats.rank}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[color:var(--surface)] border-[color:var(--border-soft)]">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Favorite Markets</h3>
                <div className="space-y-3">
                  {[
                    { name: "NFL", percentage: 45, color: "bg-blue-500" },
                    { name: "NBA", percentage: 30, color: "bg-purple-500" },
                    { name: "Crypto", percentage: 15, color: "bg-orange-500" },
                    { name: "Other", percentage: 10, color: "bg-gray-500" },
                  ].map((market) => (
                    <div key={market.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-[color:var(--text-muted)]">{market.name}</span>
                        <span className="font-medium">{market.percentage}%</span>
                      </div>
                      <div className="w-full bg-[color:var(--surface-2)] rounded-full h-2">
                        <div 
                          className={`${market.color} h-2 rounded-full`}
                          style={{ width: `${market.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[color:var(--surface)] border-[color:var(--border-soft)] md:col-span-2">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Monthly Performance</h3>
                <div className="grid grid-cols-6 gap-2">
                  {["Aug", "Sep", "Oct", "Nov", "Dec", "Jan"].map((month, i) => {
                    const profits = [12500, -3200, 28400, 45600, 18900, 32800];
                    const profit = profits[i];
                    const isPositive = profit > 0;
                    const height = Math.abs(profit) / 500;
                    return (
                      <div key={month} className="text-center">
                        <div className="h-24 flex items-end justify-center mb-2">
                          <div 
                            className={`w-full max-w-8 rounded-t ${isPositive ? 'bg-green-500' : 'bg-red-500'}`}
                            style={{ height: `${Math.min(height, 100)}%` }}
                          />
                        </div>
                        <div className="text-xs text-[color:var(--text-muted)]">{month}</div>
                        <div className={`text-xs font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                          {isPositive ? '+' : ''}{(profit / 1000).toFixed(1)}k
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "achievements" && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {profile.achievements.map((achievement) => (
              <Card 
                key={achievement.id} 
                className={`bg-[color:var(--surface)] border-[color:var(--border-soft)] ${
                  !achievement.unlocked ? 'opacity-50' : ''
                }`}
              >
                <CardContent className="p-6 text-center">
                  <div className="text-4xl mb-2">{achievement.icon}</div>
                  <div className="font-semibold">{achievement.name}</div>
                  <div className="text-xs text-[color:var(--text-muted)] mt-1">
                    {achievement.unlocked ? (
                      <span className="text-green-500 flex items-center justify-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Unlocked
                      </span>
                    ) : (
                      "Locked"
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <MainFooter />
    </div>
  );
}
