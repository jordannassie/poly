"use client";

import { useEffect, useState } from "react";
import { TopNav } from "@/components/TopNav";
import { CategoryTabs } from "@/components/CategoryTabs";
import { MainFooter } from "@/components/MainFooter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/Avatar";
import { getDemoUser } from "@/lib/demoAuth";
import { 
  TrendingUp, 
  Share2,
  Camera,
  MessageCircle,
  Heart,
  MoreHorizontal,
  AlertCircle
} from "lucide-react";
import { LightningLoader } from "@/components/ui/LightningLoader";
import Link from "next/link";

type Props = {
  params: { username: string };
};

// Profile data from API
interface ProfileData {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  website: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  created_at: string;
}

// Team data with colors and abbreviations
const teams: Record<string, { name: string; abbr: string; color: string; textColor: string }> = {
  chiefs: { name: "Kansas City Chiefs", abbr: "KC", color: "#E31837", textColor: "white" },
  eagles: { name: "Philadelphia Eagles", abbr: "PHI", color: "#004C54", textColor: "white" },
  lakers: { name: "Los Angeles Lakers", abbr: "LAL", color: "#552583", textColor: "#FDB927" },
  celtics: { name: "Boston Celtics", abbr: "BOS", color: "#007A33", textColor: "white" },
  warriors: { name: "Golden State Warriors", abbr: "GSW", color: "#1D428A", textColor: "#FFC72C" },
  nuggets: { name: "Denver Nuggets", abbr: "DEN", color: "#0E2240", textColor: "#FEC524" },
  bills: { name: "Buffalo Bills", abbr: "BUF", color: "#00338D", textColor: "#C60C30" },
  ravens: { name: "Baltimore Ravens", abbr: "BAL", color: "#241773", textColor: "#9E7C0C" },
  heat: { name: "Miami Heat", abbr: "MIA", color: "#98002E", textColor: "#F9A01B" },
  bucks: { name: "Milwaukee Bucks", abbr: "MIL", color: "#00471B", textColor: "#EEE1C6" },
};

// Demo user profile data
const demoProfile = {
  username: "demo",
  displayName: "Demo Trader",
  bio: "Sports betting enthusiast and prediction market trader. Focused on NFL and NBA markets. Always looking for value plays and sharp lines.",
  website: "provepicks.com",
  avatarUrl: null,
  bannerUrl: null,
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
      market: "Super Bowl LVIII",
      team1: "chiefs",
      team2: "eagles",
      pick: "Chiefs ML",
      pickTeam: "chiefs",
      odds: 65,
      amount: "$5,000",
      result: "won",
      profit: "+$3,250",
      date: "2 hours ago",
      league: "NFL",
    },
    {
      id: 2,
      market: "NBA Regular Season",
      team1: "lakers",
      team2: "celtics",
      pick: "Celtics -5.5",
      pickTeam: "celtics",
      odds: 52,
      amount: "$2,500",
      result: "won",
      profit: "+$1,300",
      date: "5 hours ago",
      league: "NBA",
    },
    {
      id: 3,
      market: "AFC Championship",
      team1: "bills",
      team2: "ravens",
      pick: "Bills +3.5",
      pickTeam: "bills",
      odds: 48,
      amount: "$4,000",
      result: "pending",
      profit: null,
      date: "1 day ago",
      league: "NFL",
    },
    {
      id: 4,
      market: "NBA Regular Season",
      team1: "warriors",
      team2: "nuggets",
      pick: "Warriors +6.5",
      pickTeam: "warriors",
      odds: 47,
      amount: "$3,000",
      result: "lost",
      profit: "-$3,000",
      date: "2 days ago",
      league: "NBA",
    },
    {
      id: 5,
      market: "NBA Regular Season",
      team1: "heat",
      team2: "bucks",
      pick: "Heat ML",
      pickTeam: "heat",
      odds: 42,
      amount: "$2,000",
      result: "won",
      profit: "+$2,760",
      date: "3 days ago",
      league: "NBA",
    },
  ],
  achievements: [
    { id: 1, name: "First Win", icon: "🎯", unlocked: true },
    { id: 2, name: "10 Win Streak", icon: "🔥", unlocked: true },
    { id: 3, name: "Big Spender", icon: "💰", unlocked: true },
    { id: 4, name: "Top 10", icon: "🏆", unlocked: false },
    { id: 5, name: "NFL Expert", icon: "🏈", unlocked: true },
    { id: 6, name: "NBA Sharp", icon: "🏀", unlocked: true },
  ],
};

// Team logo component
function TeamLogo({ teamKey, size = "md" }: { teamKey: string; size?: "sm" | "md" | "lg" }) {
  const team = teams[teamKey];
  if (!team) return null;
  
  const sizeClasses = {
    sm: "h-6 w-6 text-[10px]",
    md: "h-8 w-8 text-xs",
    lg: "h-10 w-10 text-sm",
  };
  
  return (
    <div 
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold`}
      style={{ backgroundColor: team.color, color: team.textColor }}
    >
      {team.abbr}
    </div>
  );
}

// Following team data
interface FollowedTeam {
  team_id: string;
  league: string;
  team_name: string;
  logo: string | null;
  slug: string;
}

// Post from API
interface UserPost {
  id: string;
  content: string;
  team_id: string | null;
  league: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
}

export default function PublicProfilePage({ params }: Props) {
  const { username } = params;
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [activeTab, setActiveTab] = useState<"picks" | "activity">("picks");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  
  // Follow state
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);
  
  // Followed teams
  const [followedTeams, setFollowedTeams] = useState<FollowedTeam[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  
  // User posts (activity)
  const [userPosts, setUserPosts] = useState<UserPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  
  // P/L chart range
  const [range, setRange] = useState<"1D" | "1W" | "1M" | "ALL">("ALL");

  useEffect(() => {
    // Check if this is the current user's profile
    const checkOwnership = async () => {
      // First check demo user
      const demoUser = getDemoUser();
      if (demoUser) {
        const demoHandle = demoUser.handle.replace("@", "").toLowerCase();
        if (username.toLowerCase() === demoHandle || username.toLowerCase() === "demo") {
          setIsOwnProfile(true);
          return;
        }
      }
      
      // Then check real logged-in user via /api/me
      try {
        const meRes = await fetch("/api/me");
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.user?.username && meData.user.username.toLowerCase() === username.toLowerCase()) {
            setIsOwnProfile(true);
            return;
          }
        }
      } catch {
        // Not logged in or error
      }
      
      setIsOwnProfile(false);
    };
    
    checkOwnership();
    
    // Fetch real profile data
    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/profile/${encodeURIComponent(username)}`);
        if (res.ok) {
          const data = await res.json();
          setProfileData(data.profile);
        } else if (res.status === 404) {
          // Only set not found if not the demo user
          if (username.toLowerCase() !== "demo") {
            setNotFound(true);
          }
        }
      } catch {
        // Use demo fallback
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [username]);

  // Fetch follow status
  useEffect(() => {
    if (!profileData?.id) return;
    
    const fetchFollowStatus = async () => {
      try {
        const res = await fetch(`/api/follow?user_id=${profileData.id}`);
        if (res.ok) {
          const data = await res.json();
          setFollowersCount(data.followers_count || 0);
          setFollowingCount(data.following_count || 0);
          setIsFollowing(data.is_following || false);
        }
      } catch {
        // Ignore errors
      }
    };
    fetchFollowStatus();
    
    // Fetch followed teams
    const fetchFollowedTeams = async () => {
      setTeamsLoading(true);
      try {
        const res = await fetch(`/api/teams/following?user_id=${profileData.id}`);
        if (res.ok) {
          const data = await res.json();
          setFollowedTeams(data.teams || []);
        }
      } catch {
        // Ignore errors
      } finally {
        setTeamsLoading(false);
      }
    };
    fetchFollowedTeams();
    
    // Fetch user posts
    const fetchUserPosts = async () => {
      setPostsLoading(true);
      try {
        const res = await fetch(`/api/posts?user_id=${profileData.id}`);
        if (res.ok) {
          const data = await res.json();
          setUserPosts(data.posts || []);
        }
      } catch {
        // Ignore errors
      } finally {
        setPostsLoading(false);
      }
    };
    fetchUserPosts();
  }, [profileData?.id]);

  // Handle follow/unfollow
  const handleFollow = async () => {
    if (!profileData?.id || followLoading) return;
    
    setFollowLoading(true);
    try {
      if (isFollowing) {
        // Unfollow
        const res = await fetch("/api/follow", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: profileData.id }),
        });
        if (res.ok) {
          setIsFollowing(false);
          setFollowersCount(prev => Math.max(0, prev - 1));
        }
      } else {
        // Follow
        const res = await fetch("/api/follow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: profileData.id }),
        });
        if (res.ok) {
          setIsFollowing(true);
          setFollowersCount(prev => prev + 1);
        } else {
          const data = await res.json();
          if (data.error === "AUTH_REQUIRED") {
            alert("Please sign in to follow users");
          }
        }
      }
    } catch (error) {
      console.error("Follow error:", error);
    } finally {
      setFollowLoading(false);
    }
  };

  // Build profile object - merge real data with demo stats
  const profile = {
    ...demoProfile,
    username: profileData?.username || demoProfile.username,
    displayName: profileData?.display_name || demoProfile.displayName,
    bio: profileData?.bio || demoProfile.bio,
    website: profileData?.website || demoProfile.website,
    avatarUrl: profileData?.avatar_url || demoProfile.avatarUrl,
    bannerUrl: profileData?.banner_url || demoProfile.bannerUrl,
    joinedDate: profileData?.created_at 
      ? new Date(profileData.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : demoProfile.joinedDate,
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[color:var(--app-bg)] text-[color:var(--text-strong)]">
        <TopNav />
        <CategoryTabs activeLabel="Trending" />
        <main className="mx-auto w-full max-w-4xl px-4 py-6">
          <LightningLoader size="md" text="Loading..." />
        </main>
        <MainFooter />
      </div>
    );
  }

  // Show not found state
  if (notFound) {
    return (
      <div className="min-h-screen bg-[color:var(--app-bg)] text-[color:var(--text-strong)]">
        <TopNav />
        <CategoryTabs activeLabel="Trending" />
        <main className="mx-auto w-full max-w-4xl px-4 py-6">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-full bg-[color:var(--surface-2)] p-6 mb-6">
              <AlertCircle className="h-12 w-12 text-[color:var(--text-muted)]" />
            </div>
            <h1 className="text-2xl font-bold mb-2">User not found</h1>
            <p className="text-[color:var(--text-muted)] mb-6">
              The user @{username} doesn&apos;t exist.
            </p>
            <Link href="/">
              <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                Go Home
              </Button>
            </Link>
          </div>
        </main>
        <MainFooter />
      </div>
    );
  }

  // Profit/Loss chart config (static demo data)
  const rangeConfig: Record<"1D" | "1W" | "1M" | "ALL", { label: string; value: string; bars: number[]; winRate: number }> = {
    "1D": {
      label: "Past Day",
      value: "+$3,420",
      bars: [15, 22, 18, 30, 28, 35, 26, 24, 32, 38, 36, 40, 34, 44, 42, 46, 48, 52, 55, 58],
      winRate: 62.1,
    },
    "1W": {
      label: "Past Week",
      value: "+$18,750",
      bars: [20, 24, 28, 26, 34, 36, 38, 32, 30, 42, 45, 48, 44, 50, 52, 56, 60, 62, 65, 70],
      winRate: 63.4,
    },
    "1M": {
      label: "Past Month",
      value: "+$58,320",
      bars: [22, 25, 28, 30, 35, 38, 42, 40, 45, 50, 48, 52, 56, 60, 64, 62, 66, 70, 72, 74],
      winRate: 64.1,
    },
    ALL: {
      label: "All Time",
      value: profile.stats.profitLoss,
      bars: [25, 28, 30, 34, 38, 40, 42, 44, 46, 48, 50, 54, 56, 58, 60, 62, 64, 68, 66, 74],
      winRate: profile.stats.winRate,
    },
  };

  const currentRange = rangeConfig[range];

  return (
    <div className="min-h-screen bg-[color:var(--app-bg)] text-[color:var(--text-strong)]">
      <TopNav />
      <CategoryTabs activeLabel="Trending" />
      <main className="mx-auto w-full max-w-4xl px-4 py-6">
        {/* Polymarket-style Header: Two columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Left: Profile Info */}
          <Card className="bg-[color:var(--surface)] border-[color:var(--border-soft)]">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="relative group flex-shrink-0">
                  <Avatar 
                    src={profile.avatarUrl}
                    name={profile.displayName || profile.username || undefined}
                    size="xl"
                  />
                  {isOwnProfile && (
                    <button className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                      <Camera className="h-5 w-5 text-white" />
                    </button>
                  )}
                </div>

                {/* Name + Meta */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl font-bold truncate">{profile.displayName || `@${profile.username}`}</h1>
                    {/* Action icons */}
                    <div className="flex items-center gap-1 ml-auto">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-[color:var(--text-muted)]">
                        <Share2 className="h-4 w-4" />
                      </Button>
                      {isOwnProfile ? (
                        <Button asChild size="sm" variant="outline" className="h-8 text-xs border-[color:var(--border-soft)]">
                          <Link href="/settings">Edit Profile</Link>
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          className={`h-8 px-4 text-xs font-semibold ${isFollowing 
                            ? "bg-[color:var(--surface-2)] text-[color:var(--text-strong)] border border-[color:var(--border-soft)] hover:border-red-500/50 hover:text-red-500" 
                            : "bg-orange-500 hover:bg-orange-600 text-white"
                          }`}
                          onClick={handleFollow}
                          disabled={followLoading}
                        >
                          {followLoading ? "..." : isFollowing ? "Following" : "Follow"}
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-[color:var(--text-muted)]">
                    Joined {profile.joinedDate}
                  </p>
                  {profile.bio && (
                    <p className="text-sm text-[color:var(--text-strong)] mt-2 line-clamp-2">{profile.bio}</p>
                  )}

                  {/* Followers / Following */}
                  <div className="flex items-center gap-4 mt-3">
                    <span className="text-sm">
                      <span className="font-bold text-[color:var(--text-strong)]">{followersCount}</span>
                      <span className="text-[color:var(--text-muted)] ml-1">Followers</span>
                    </span>
                    <span className="text-sm">
                      <span className="font-bold text-[color:var(--text-strong)]">{followingCount}</span>
                      <span className="text-[color:var(--text-muted)] ml-1">Following</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-6 mt-4 pt-4 border-t border-[color:var(--border-soft)]">
                <div>
                  <div className="text-lg font-bold">{profile.stats.totalVolume}</div>
                  <div className="text-xs text-[color:var(--text-muted)]">Volume</div>
                </div>
                <div>
                  <div className="text-lg font-bold">{profile.stats.bestWin}</div>
                  <div className="text-xs text-[color:var(--text-muted)]">Biggest Win</div>
                </div>
                <div>
                  <div className="text-lg font-bold">{profile.stats.totalPicks}</div>
                  <div className="text-xs text-[color:var(--text-muted)]">Predictions</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right: P/L Card */}
          <Card className="bg-[color:var(--surface)] border-[color:var(--border-soft)]">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-[color:var(--text-muted)]">Profit/Loss</span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  {["1D", "1W", "1M", "ALL"].map((period) => (
                    <button
                      key={period}
                      onClick={() => setRange(period as any)}
                      className={`px-2 py-1 rounded ${
                        period === "ALL"
                          ? "bg-orange-500/20 text-orange-400"
                          : "text-[color:var(--text-muted)] hover:bg-white/5"
                      }`}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>
              <div className={`text-3xl font-bold mt-2 ${
                currentRange.value.startsWith("+") ? "text-green-500" : "text-red-500"
              }`}>
                {currentRange.value}
              </div>
              <div className="text-xs text-[color:var(--text-muted)] mt-1">{currentRange.label}</div>

              {/* Mini chart with animated bars */}
              <div className="mt-4 h-24 flex items-end gap-0.5">
                {currentRange.bars.map((h, i) => (
                  <div
                    key={`${range}-${i}`}
                    className="flex-1 rounded-t bg-green-500/60 transition-[height] duration-400 ease-out"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>

              {/* Win rate bar */}
              <div className="mt-4 flex items-center gap-3">
                <span className="text-sm text-[color:var(--text-muted)]">Win Rate</span>
                <div className="flex-1 bg-[color:var(--surface-2)] rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${currentRange.winRate}%` }}
                  />
                </div>
                <span className="text-sm font-bold">{currentRange.winRate}%</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs: Positions + Activity */}
        <div className="flex gap-1 mb-4 border-b border-[color:var(--border-soft)]">
          <button
            onClick={() => setActiveTab("picks")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition -mb-px ${
              activeTab === "picks"
                ? "border-orange-500 text-[color:var(--text-strong)]"
                : "border-transparent text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)]"
            }`}
          >
            Positions
          </button>
          <button
            onClick={() => setActiveTab("activity")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition -mb-px ${
              activeTab === "activity"
                ? "border-orange-500 text-[color:var(--text-strong)]"
                : "border-transparent text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)]"
            }`}
          >
            Activity
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "picks" && (
          <div>
            {/* Positions table */}
            <div className="rounded-xl border border-[color:var(--border-soft)] overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-12 gap-2 px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-[color:var(--text-muted)] bg-[color:var(--surface)] border-b border-[color:var(--border-soft)]">
                <div className="col-span-5">Market</div>
                <div className="col-span-2 text-right">Avg</div>
                <div className="col-span-2 text-right">Current</div>
                <div className="col-span-3 text-right">Value</div>
              </div>

              {/* Table rows */}
              {profile.recentPicks.map((pick) => (
                <div
                  key={pick.id}
                  className="grid grid-cols-12 gap-2 px-4 py-3 items-center border-b border-[color:var(--border-soft)] last:border-b-0 hover:bg-white/[0.02] transition"
                >
                  {/* Market info */}
                  <div className="col-span-5 flex items-center gap-3 min-w-0">
                    <TeamLogo teamKey={pick.pickTeam} size="md" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{pick.market}</div>
                      <div className="text-xs text-[color:var(--text-muted)]">
                        {pick.pick} &bull; {pick.amount}
                      </div>
                    </div>
                  </div>

                  {/* Avg price */}
                  <div className="col-span-2 text-right text-sm">{pick.odds}¢</div>

                  {/* Current price */}
                  <div className="col-span-2 text-right text-sm">
                    {pick.result === "won" ? "100¢" : pick.result === "lost" ? "0¢" : `${pick.odds}¢`}
                  </div>

                  {/* Value + P/L */}
                  <div className="col-span-3 text-right">
                    <div className="text-sm font-medium">
                      {pick.result === "won" ? pick.profit : pick.result === "lost" ? "$0.00" : pick.amount}
                    </div>
                    {pick.profit && (
                      <div className={`text-xs font-medium ${
                        pick.profit.startsWith("+") ? "text-green-500" : "text-red-500"
                      }`}>
                        {pick.profit}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "activity" && (
          <div className="space-y-3">
            {postsLoading ? (
              <LightningLoader size="md" text="Loading..." />
            ) : userPosts.length > 0 ? (
              <>
                {userPosts.map((post) => {
                  const formatTimeAgo = (dateString: string) => {
                    const date = new Date(dateString);
                    const now = new Date();
                    const diffMs = now.getTime() - date.getTime();
                    const diffMins = Math.floor(diffMs / 60000);
                    const diffHours = Math.floor(diffMs / 3600000);
                    const diffDays = Math.floor(diffMs / 86400000);
                    if (diffMins < 1) return "just now";
                    if (diffMins < 60) return `${diffMins}m ago`;
                    if (diffHours < 24) return `${diffHours}h ago`;
                    if (diffDays < 7) return `${diffDays}d ago`;
                    return date.toLocaleDateString();
                  };

                  return (
                    <Card key={post.id} className="bg-[color:var(--surface)] border-[color:var(--border-soft)]">
                      <CardContent className="p-4">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Avatar 
                              src={profile.avatarUrl}
                              name={profile.displayName || profile.username || undefined}
                              size="md"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{profile.displayName || profile.username}</span>
                                <span className="text-[color:var(--text-muted)]">posted</span>
                              </div>
                              <div className="text-xs text-[color:var(--text-muted)]">{formatTimeAgo(post.created_at)}</div>
                            </div>
                          </div>
                          <button className="text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)]">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </div>
                        
                        {/* Team Context */}
                        {post.league && (
                          <div className="flex items-center gap-2 mb-2 p-2 bg-[color:var(--surface-2)] rounded-lg">
                            <span className="text-sm font-medium">
                              {post.league.toUpperCase()} Community
                            </span>
                          </div>
                        )}
                        
                        {/* Content */}
                        <p className="text-[color:var(--text-strong)] mb-3 whitespace-pre-wrap">{post.content}</p>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-4 text-sm text-[color:var(--text-muted)]">
                          <span className="flex items-center gap-1">
                            <Heart className="h-4 w-4" />
                            {post.likes_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="h-4 w-4" />
                            {post.comments_count}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </>
            ) : (
              /* Empty state when no posts */
              <Card className="bg-[color:var(--surface)] border-[color:var(--border-soft)]">
                <CardContent className="p-8 text-center">
                  <div className="text-4xl mb-4">💬</div>
                  <h3 className="text-lg font-semibold mb-2">No activity yet</h3>
                  <p className="text-[color:var(--text-muted)] text-sm mb-4">
                    {isOwnProfile 
                      ? "Your posts and comments will appear here!"
                      : `${profile.displayName || profile.username} hasn't posted anything yet.`
                    }
                  </p>
                  {isOwnProfile && (
                    <Link href="/sports?league=nfl">
                      <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                        Browse Teams & Markets
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Teams, stats, achievements tabs removed - Polymarket-style keeps it clean */}
      </main>
      <MainFooter />
    </div>
  );
}
