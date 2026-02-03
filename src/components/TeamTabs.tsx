"use client";

import { useState, useEffect } from "react";
import { MessageSquare, TrendingUp, Calendar, Clock, Heart, Send, Loader2 } from "lucide-react";
import Link from "next/link";

interface TeamTabsProps {
  teamName: string;
  teamId: number;
  league: string;
  primaryColor: string;
}

interface Post {
  id: string;
  content: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  has_liked: boolean;
  user: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface Game {
  id: number;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  startTime: string;
  status: string;
  isHome: boolean;
}

type TabId = "feed" | "games" | "picks";

/**
 * Team Tabs Component
 * 
 * Tab navigation for team community content.
 */
export function TeamTabs({ teamName, teamId, league, primaryColor }: TeamTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("feed");
  const [games, setGames] = useState<Game[]>([]);
  const [gamesLoading, setGamesLoading] = useState(false);
  
  // Unique team identifier for posts
  const teamKey = `${league.toLowerCase()}:${teamName.toLowerCase().replace(/\s+/g, "-")}`;

  // Fetch upcoming games when games tab is active
  useEffect(() => {
    if (activeTab === "games" && games.length === 0) {
      fetchTeamGames();
    }
  }, [activeTab]);

  const fetchTeamGames = async () => {
    setGamesLoading(true);
    try {
      const res = await fetch(`/api/teams/${league.toLowerCase()}/${teamId}/games`);
      if (res.ok) {
        const data = await res.json();
        setGames(data.games || []);
      }
    } catch (error) {
      console.error("Failed to fetch team games:", error);
    } finally {
      setGamesLoading(false);
    }
  };

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "feed", label: "Feed", icon: <MessageSquare className="h-4 w-4" /> },
    { id: "games", label: "Games", icon: <Calendar className="h-4 w-4" /> },
    { id: "picks", label: "Picks", icon: <TrendingUp className="h-4 w-4" /> },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4">
      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-[color:var(--border-soft)]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition relative ${
              activeTab === tab.id
                ? "text-[color:var(--text-strong)]"
                : "text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)]"
            }`}
          >
            {tab.icon}
            {tab.label}
            {/* Active indicator */}
            {activeTab === tab.id && (
              <div 
                className="absolute bottom-0 left-0 right-0 h-0.5"
                style={{ backgroundColor: primaryColor }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="py-8">
        {activeTab === "feed" && (
          <FeedTab 
            teamName={teamName} 
            teamKey={teamKey} 
            league={league} 
            primaryColor={primaryColor}
          />
        )}
        {activeTab === "games" && (
          <GamesTab 
            games={games} 
            loading={gamesLoading} 
            teamName={teamName}
            primaryColor={primaryColor}
          />
        )}
        {activeTab === "picks" && (
          <EmptyState
            icon={<TrendingUp className="h-12 w-12" />}
            title="No picks yet"
            description={`No predictions have been made for ${teamName} games`}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Feed Tab
 */
function FeedTab({ 
  teamName, 
  teamKey, 
  league,
  primaryColor 
}: { 
  teamName: string; 
  teamKey: string; 
  league: string;
  primaryColor: string;
}) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [postContent, setPostContent] = useState("");
  const [posting, setPosting] = useState(false);

  // Fetch posts for this team
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await fetch(`/api/posts?team_id=${encodeURIComponent(teamKey)}`);
        if (res.ok) {
          const data = await res.json();
          setPosts(data.posts || []);
        }
      } catch (error) {
        console.error("Failed to fetch posts:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, [teamKey]);

  const handlePost = async () => {
    if (!postContent.trim() || posting) return;
    
    setPosting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: postContent,
          team_id: teamKey,
          league: league,
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setPosts([data.post, ...posts]);
        setPostContent("");
      } else {
        const data = await res.json();
        if (data.error === "AUTH_REQUIRED") {
          alert("Please sign in to post");
        } else {
          console.error("Post error:", data.error);
          alert("Failed to create post. Please try again.");
        }
      }
    } catch (error) {
      console.error("Failed to create post:", error);
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId: string, hasLiked: boolean) => {
    try {
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: hasLiked ? "DELETE" : "POST",
      });
      
      if (res.ok) {
        const data = await res.json();
        setPosts(posts.map(p => 
          p.id === postId 
            ? { ...p, likes_count: data.likes_count, has_liked: !hasLiked }
            : p
        ));
      }
    } catch (error) {
      console.error("Like error:", error);
    }
  };

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
    <div className="space-y-4">
      {/* Create Post Box */}
      <div className="bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-[color:var(--surface-2)] flex items-center justify-center flex-shrink-0">
            <MessageSquare className="h-5 w-5 text-[color:var(--text-muted)]" />
          </div>
          <div className="flex-1">
            <textarea
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder={`Start a discussion about ${teamName}...`}
              className="w-full bg-[color:var(--surface-2)] border-none rounded-lg px-4 py-2 text-sm placeholder:text-[color:var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] resize-none min-h-[60px]"
              rows={2}
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={handlePost}
                disabled={!postContent.trim() || posting}
                className="px-4 py-1.5 text-sm font-medium rounded-full text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                style={{ backgroundColor: primaryColor }}
              >
                {posting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Post
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Posts List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse bg-[color:var(--surface)] rounded-lg h-24" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="h-12 w-12" />}
          title="No posts yet"
          description={`Be the first to post in the ${teamName} community`}
        />
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <div key={post.id} className="bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-lg p-4">
              {/* Post Header */}
              <div className="flex items-center gap-3 mb-3">
                <Link href={`/u/${post.user.username}`}>
                  {post.user.avatar_url ? (
                    <img 
                      src={post.user.avatar_url} 
                      alt={post.user.display_name || post.user.username}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <span className="text-white font-bold text-sm">
                        {(post.user.display_name || post.user.username || "U").charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </Link>
                <div>
                  <Link href={`/u/${post.user.username}`} className="font-medium hover:underline">
                    {post.user.display_name || post.user.username}
                  </Link>
                  <div className="text-xs text-[color:var(--text-muted)]">
                    @{post.user.username} • {formatTimeAgo(post.created_at)}
                  </div>
                </div>
              </div>
              
              {/* Post Content */}
              <p className="text-[color:var(--text-strong)] whitespace-pre-wrap mb-3">
                {post.content}
              </p>
              
              {/* Post Actions */}
              <div className="flex items-center gap-4 text-sm text-[color:var(--text-muted)]">
                <button 
                  onClick={() => handleLike(post.id, post.has_liked)}
                  className={`flex items-center gap-1 transition ${
                    post.has_liked ? "text-red-500" : "hover:text-red-500"
                  }`}
                >
                  <Heart className={`h-4 w-4 ${post.has_liked ? "fill-current" : ""}`} />
                  {post.likes_count}
                </button>
                <button className="flex items-center gap-1 hover:text-[color:var(--accent)] transition">
                  <MessageSquare className="h-4 w-4" />
                  {post.comments_count}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Games Tab
 */
function GamesTab({ 
  games, 
  loading, 
  teamName,
  primaryColor 
}: { 
  games: Game[]; 
  loading: boolean; 
  teamName: string;
  primaryColor: string;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse bg-[color:var(--surface)] rounded-lg h-20" />
        ))}
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <EmptyState
        icon={<Calendar className="h-12 w-12" />}
        title="No upcoming games"
        description={`${teamName} games will appear here once synced from the Admin panel`}
      />
    );
  }

  return (
    <div className="space-y-3">
      {games.map((game) => (
        <GameCard key={game.id} game={game} teamName={teamName} primaryColor={primaryColor} />
      ))}
    </div>
  );
}

/**
 * Game Card
 */
function GameCard({ 
  game, 
  teamName,
  primaryColor 
}: { 
  game: Game; 
  teamName: string;
  primaryColor: string;
}) {
  const gameDate = new Date(game.startTime);
  const isLive = game.status?.toLowerCase().includes("live") || 
                  game.status?.toLowerCase().includes("in progress");
  const isFinished = game.status?.toLowerCase().includes("finished") || 
                      game.status?.toLowerCase().includes("final");

  return (
    <div className="bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-lg p-4 hover:border-[color:var(--border-strong)] transition">
      <div className="flex items-center justify-between">
        {/* Teams */}
        <div className="flex-1">
          <div className={`flex items-center gap-2 ${game.isHome ? "" : "text-[color:var(--text-muted)]"}`}>
            <span className="font-medium">{game.awayTeam}</span>
            {game.awayScore !== null && (
              <span className="font-bold">{game.awayScore}</span>
            )}
            {!game.isHome && (
              <span 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: primaryColor }}
              />
            )}
          </div>
          <div className={`flex items-center gap-2 mt-1 ${game.isHome ? "" : "text-[color:var(--text-muted)]"}`}>
            <span className="font-medium">{game.homeTeam}</span>
            {game.homeScore !== null && (
              <span className="font-bold">{game.homeScore}</span>
            )}
            {game.isHome && (
              <span 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: primaryColor }}
              />
            )}
          </div>
        </div>

        {/* Game Status / Time */}
        <div className="text-right">
          {isLive ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              LIVE
            </span>
          ) : isFinished ? (
            <span className="text-[color:var(--text-muted)] text-sm">Final</span>
          ) : (
            <div className="text-sm text-[color:var(--text-muted)]">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {gameDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <Clock className="h-3 w-3" />
                {gameDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Empty State Component
 */
function EmptyState({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-[color:var(--text-subtle)] mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-[color:var(--text-strong)] mb-2">
        {title}
      </h3>
      <p className="text-sm text-[color:var(--text-muted)] max-w-sm">
        {description}
      </p>
    </div>
  );
}
