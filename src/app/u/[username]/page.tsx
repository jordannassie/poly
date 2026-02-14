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
  Globe, 
  Trophy, 
  Target, 
  TrendingUp, 
  BarChart3, 
  Calendar,
  Flame,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Share2,
  Camera,
  ImageIcon,
  MessageCircle,
  Heart,
  MoreHorizontal,
  Loader2,
  AlertCircle
} from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<"picks" | "activity" | "stats" | "achievements" | "teams">("picks");
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
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-white/60" />
          </div>
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

  return (
    <div className="min-h-screen bg-[color:var(--app-bg)] text-[color:var(--text-strong)]">
      <TopNav />
      <CategoryTabs activeLabel="Trending" />
      <main className="mx-auto w-full max-w-4xl px-4 py-6">
        {/* Profile Header Card */}
        <Card className="bg-[color:var(--surface)] border-[color:var(--border-soft)] overflow-hidden mb-6">
          {/* Banner */}
          <div className="h-32 relative group overflow-hidden">
            {profile.bannerUrl ? (
              <img 
                src={profile.bannerUrl} 
                alt="Profile banner" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-neutral-700 via-neutral-600 to-neutral-500" />
            )}
            <div className="absolute inset-0 bg-black/20" />
            {/* Rank Badge */}
            <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-400" />
              <span className="text-white text-sm font-semibold">Rank #{profile.stats.rank}</span>
            </div>
            {/* Edit Banner Button */}
            {isOwnProfile && (
              <button className="absolute bottom-3 right-3 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-lg px-3 py-1.5 flex items-center gap-2 text-white text-sm opacity-0 group-hover:opacity-100 transition">
                <ImageIcon className="h-4 w-4" />
                Edit Banner
              </button>
            )}
          </div>
          
          <CardContent className="p-6 -mt-16 relative">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Avatar with Edit Button */}
              <div className="relative group">
                <Avatar 
                  src={profile.avatarUrl}
                  name={profile.displayName || profile.username || undefined}
                  size="xl"
                  className="border-4 border-[color:var(--surface)] shadow-xl"
                />
                {/* Online indicator */}
                <div className="absolute bottom-2 right-2 h-5 w-5 rounded-full bg-green-500 border-4 border-[color:var(--surface)]" />
                {/* Edit Photo Button */}
                {isOwnProfile && (
                  <button className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                    <Camera className="h-6 w-6 text-white" />
                  </button>
                )}
              </div>
              
              <div className="flex-1 sm:pt-16">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-2xl font-bold">{profile.displayName || `@${profile.username}`}</h1>
                    </div>
                    <p className="text-[color:var(--text-muted)]">@{username}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="border-[color:var(--border-soft)]">
                      <Share2 className="h-4 w-4" />
                    </Button>
                    {isOwnProfile ? (
                      <Button asChild size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
                        <Link href="/settings">Edit Profile</Link>
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        className={isFollowing 
                          ? "bg-[color:var(--surface-2)] hover:bg-red-500/20 text-[color:var(--text-strong)] hover:text-red-500 border border-[color:var(--border-soft)]" 
                          : "bg-orange-500 hover:bg-orange-600 text-white"
                        }
                        onClick={handleFollow}
                        disabled={followLoading}
                      >
                        {followLoading ? "..." : isFollowing ? "Following" : "Follow"}
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
                  className="flex items-center gap-1 text-white/60 hover:underline"
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
            
            {/* Follower Stats */}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[color:var(--border-soft)]">
              <div className="text-center">
                <div className="font-bold text-lg">{followersCount}</div>
                <div className="text-xs text-[color:var(--text-muted)]">Followers</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-lg">{followingCount}</div>
                <div className="text-xs text-[color:var(--text-muted)]">Following</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-[color:var(--surface)] border-[color:var(--border-soft)] hover:border-white/20 transition">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center">
                  <Target className="h-5 w-5 text-white/60" />
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
          
          <Card className="bg-[color:var(--surface)] border-[color:var(--border-soft)] hover:border-white/20 transition">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-white/60" />
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
        <div className="flex gap-2 mb-6 border-b border-[color:var(--border-soft)] overflow-x-auto">
          <button
            onClick={() => setActiveTab("picks")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition -mb-px whitespace-nowrap ${
              activeTab === "picks"
                ? "border-orange-500 text-orange-500"
                : "border-transparent text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)]"
            }`}
          >
            Recent Picks
          </button>
          <button
            onClick={() => setActiveTab("activity")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition -mb-px whitespace-nowrap ${
              activeTab === "activity"
                ? "border-orange-500 text-orange-500"
                : "border-transparent text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)]"
            }`}
          >
            Activity
            {userPosts.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-orange-500/20 text-orange-500 text-xs rounded-full">
                {userPosts.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("teams")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition -mb-px whitespace-nowrap ${
              activeTab === "teams"
                ? "border-orange-500 text-orange-500"
                : "border-transparent text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)]"
            }`}
          >
            Teams
            {followedTeams.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-orange-500/20 text-orange-500 text-xs rounded-full">
                {followedTeams.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("stats")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition -mb-px whitespace-nowrap ${
              activeTab === "stats"
                ? "border-orange-500 text-orange-500"
                : "border-transparent text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)]"
            }`}
          >
            Detailed Stats
          </button>
          <button
            onClick={() => setActiveTab("achievements")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition -mb-px whitespace-nowrap ${
              activeTab === "achievements"
                ? "border-orange-500 text-orange-500"
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
                      {/* League Badge */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                          pick.league === "NFL" ? "bg-white/10 text-white/70" : "bg-orange-500/20 text-orange-400"
                        }`}>
                          {pick.league}
                        </span>
                        <span className="text-sm text-[color:var(--text-muted)]">{pick.market}</span>
                        {pick.result === "pending" && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-500/10 text-yellow-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Pending
                          </span>
                        )}
                      </div>
                      
                      {/* Teams */}
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <TeamLogo teamKey={pick.team1} size="md" />
                          <span className="text-sm font-medium">{teams[pick.team1]?.abbr}</span>
                        </div>
                        <span className="text-[color:var(--text-muted)] text-sm">vs</span>
                        <div className="flex items-center gap-2">
                          <TeamLogo teamKey={pick.team2} size="md" />
                          <span className="text-sm font-medium">{teams[pick.team2]?.abbr}</span>
                        </div>
                      </div>
                      
                      {/* Pick Details */}
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-[color:var(--text-muted)]">Pick:</span>
                          <span 
                            className="font-semibold px-2 py-0.5 rounded"
                            style={{ 
                              backgroundColor: `${teams[pick.pickTeam]?.color}20`,
                              color: teams[pick.pickTeam]?.color 
                            }}
                          >
                            {pick.pick}
                          </span>
                        </div>
                        <span className="text-[color:var(--text-muted)]">@ {pick.odds}¢</span>
                        <span className="text-[color:var(--text-muted)]">{pick.amount}</span>
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

        {activeTab === "activity" && (
          <div className="space-y-3">
            {postsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-white/60" />
              </div>
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

        {activeTab === "teams" && (
          <div>
            {teamsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-white/60" />
              </div>
            ) : followedTeams.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {followedTeams.map((team) => (
                  <Link
                    key={team.team_id}
                    href={`/teams/${team.league}/${team.slug}`}
                    className="block"
                  >
                    <Card className="bg-[color:var(--surface)] border-[color:var(--border-soft)] hover:border-white/20 transition">
                      <CardContent className="p-4 flex flex-col items-center text-center">
                        {team.logo ? (
                          <img 
                            src={team.logo} 
                            alt={team.team_name}
                            className="w-16 h-16 object-contain mb-3"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-[color:var(--surface-2)] flex items-center justify-center mb-3">
                            <span className="text-2xl font-bold text-[color:var(--text-muted)]">
                              {team.team_name.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div className="font-medium text-sm">{team.team_name}</div>
                        <div className="text-xs text-[color:var(--text-muted)] uppercase mt-1">
                          {team.league}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <Card className="bg-[color:var(--surface)] border-[color:var(--border-soft)]">
                <CardContent className="p-8 text-center">
                  <div className="text-4xl mb-4">🏟️</div>
                  <h3 className="text-lg font-semibold mb-2">No teams followed yet</h3>
                  <p className="text-[color:var(--text-muted)] text-sm mb-4">
                    {isOwnProfile 
                      ? "Follow your favorite teams to see them here!"
                      : `${profile.displayName || profile.username} hasn't followed any teams yet.`
                    }
                  </p>
                  {isOwnProfile && (
                    <Link href="/sports?league=nfl">
                      <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                        Browse Teams
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            )}
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
                <h3 className="text-lg font-semibold mb-4">Favorite Leagues</h3>
                <div className="space-y-3">
                  {[
                    { name: "NFL", percentage: 55, color: "bg-neutral-500", icon: "🏈" },
                    { name: "NBA", percentage: 45, color: "bg-orange-500", icon: "🏀" },
                  ].map((league) => (
                    <div key={league.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-[color:var(--text-muted)] flex items-center gap-2">
                          <span>{league.icon}</span>
                          {league.name}
                        </span>
                        <span className="font-medium">{league.percentage}%</span>
                      </div>
                      <div className="w-full bg-[color:var(--surface-2)] rounded-full h-2">
                        <div 
                          className={`${league.color} h-2 rounded-full`}
                          style={{ width: `${league.percentage}%` }}
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
