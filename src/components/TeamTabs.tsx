"use client";

import { useState, useEffect } from "react";
import { MessageSquare, TrendingUp, Calendar, Clock, ChevronUp, ChevronDown, Loader2, Plus, Flame, Sparkles, Trash2, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { CreatePostModal } from "./CreatePostModal";
import { ConfirmModal } from "./ConfirmModal";

interface TeamTabsProps {
  teamName: string;
  teamId: number;
  league: string;
  primaryColor: string;
}

interface Post {
  id: string;
  title: string | null;
  content: string | null;
  post_type: string;
  flair: string | null;
  upvotes: number;
  downvotes: number;
  score: number;
  comments_count: number;
  created_at: string;
  user_vote: number; // -1, 0, or 1
  is_owner: boolean;
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
 * Feed Tab - Reddit-style posts with voting
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
  const [sortBy, setSortBy] = useState<"top" | "new">("top");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch posts for this team
  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/posts?team_id=${encodeURIComponent(teamKey)}&sort=${sortBy}`);
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
  }, [teamKey, sortBy]);

  const handleVote = async (postId: string, voteType: number, currentVote: number) => {
    // If clicking same vote, remove it (set to 0)
    const newVote = currentVote === voteType ? 0 : voteType;
    
    try {
      const res = await fetch(`/api/posts/${postId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vote_type: newVote }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setPosts(posts.map(p => 
          p.id === postId 
            ? { ...p, score: data.score, upvotes: data.upvotes, downvotes: data.downvotes, user_vote: data.user_vote }
            : p
        ));
      } else {
        const data = await res.json();
        if (data.error === "AUTH_REQUIRED") {
          alert("Please sign in to vote");
        }
      }
    } catch (error) {
      console.error("Vote error:", error);
    }
  };

  const handlePostCreated = (newPost: Post) => {
    setPosts([newPost, ...posts]);
  };

  const handleDeleteConfirm = async () => {
    if (!deletePostId) return;
    
    setDeleting(true);
    try {
      const res = await fetch(`/api/posts/${deletePostId}`, {
        method: "DELETE",
      });
      
      if (res.ok) {
        setPosts(posts.filter(p => p.id !== deletePostId));
        setDeletePostId(null);
      } else {
        const data = await res.json();
        // Show error in modal or handle gracefully
        console.error("Delete error:", data.error);
      }
    } catch (error) {
      console.error("Delete error:", error);
    } finally {
      setDeleting(false);
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

  const flairColors: Record<string, string> = {
    discussion: "bg-blue-500",
    question: "bg-purple-500",
    news: "bg-green-500",
    analysis: "bg-orange-500",
    highlight: "bg-red-500",
    prediction: "bg-yellow-500",
  };

  return (
    <div className="space-y-4">
      {/* Create Post Button */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="w-full bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-lg p-4 flex items-center gap-3 hover:border-[color:var(--accent)] transition text-left"
      >
        <div className="w-10 h-10 rounded-full bg-[color:var(--surface-2)] flex items-center justify-center flex-shrink-0">
          <Plus className="h-5 w-5 text-[color:var(--text-muted)]" />
        </div>
        <span className="text-[color:var(--text-muted)]">Create a post...</span>
      </button>

      {/* Sort Tabs */}
      <div className="flex items-center gap-2 bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-lg p-2">
        <button
          onClick={() => setSortBy("top")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition ${
            sortBy === "top" 
              ? "bg-[color:var(--surface-2)] text-[color:var(--text-strong)]" 
              : "text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)]"
          }`}
        >
          <Flame className="h-4 w-4" />
          Hot
        </button>
        <button
          onClick={() => setSortBy("new")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition ${
            sortBy === "new" 
              ? "bg-[color:var(--surface-2)] text-[color:var(--text-strong)]" 
              : "text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)]"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          New
        </button>
      </div>

      {/* Posts List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse bg-[color:var(--surface)] rounded-lg h-32" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="h-12 w-12" />}
          title="No discussions yet"
          description={`Be the first to start a discussion in the ${teamName} community`}
        />
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <div key={post.id} className="bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-lg overflow-hidden flex">
              {/* Vote Column */}
              <div className="flex flex-col items-center gap-1 p-3 bg-[color:var(--surface-2)]">
                <button
                  onClick={() => handleVote(post.id, 1, post.user_vote)}
                  className={`p-1 rounded transition ${
                    post.user_vote === 1 
                      ? "text-orange-500" 
                      : "text-[color:var(--text-muted)] hover:text-orange-500"
                  }`}
                >
                  <ChevronUp className="h-5 w-5" />
                </button>
                <span className={`text-sm font-bold ${
                  post.user_vote === 1 ? "text-orange-500" : 
                  post.user_vote === -1 ? "text-blue-500" : 
                  "text-[color:var(--text-strong)]"
                }`}>
                  {post.score}
                </span>
                <button
                  onClick={() => handleVote(post.id, -1, post.user_vote)}
                  className={`p-1 rounded transition ${
                    post.user_vote === -1 
                      ? "text-blue-500" 
                      : "text-[color:var(--text-muted)] hover:text-blue-500"
                  }`}
                >
                  <ChevronDown className="h-5 w-5" />
                </button>
              </div>

              {/* Post Content */}
              <div className="flex-1 p-4">
                {/* Post Meta */}
                <div className="flex items-center gap-2 text-xs text-[color:var(--text-muted)] mb-2">
                  <Link href={`/u/${post.user.username}`} className="flex items-center gap-1 hover:underline">
                    {post.user.avatar_url ? (
                      <img src={post.user.avatar_url} alt="" className="w-5 h-5 rounded-full" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
                    )}
                    <span className="font-medium text-[color:var(--text-strong)]">
                      {post.user.display_name || post.user.username}
                    </span>
                  </Link>
                  <span>•</span>
                  <span>{formatTimeAgo(post.created_at)}</span>
                  {post.flair && (
                    <>
                      <span>•</span>
                      <span className={`px-2 py-0.5 rounded-full text-white text-xs ${flairColors[post.flair] || "bg-gray-500"}`}>
                        {post.flair.charAt(0).toUpperCase() + post.flair.slice(1)}
                      </span>
                    </>
                  )}
                </div>

                {/* Title */}
                {post.title && (
                  <h3 className="text-lg font-semibold text-[color:var(--text-strong)] mb-2 hover:text-[color:var(--accent)] cursor-pointer">
                    {post.title}
                  </h3>
                )}

                {/* Content Preview */}
                {post.content && (
                  <p className="text-[color:var(--text-muted)] text-sm line-clamp-3 mb-3">
                    {post.content}
                  </p>
                )}

                {/* Post Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-[color:var(--text-muted)]">
                    <button className="flex items-center gap-1 hover:text-[color:var(--text-strong)] transition">
                      <MessageSquare className="h-4 w-4" />
                      {post.comments_count} Comments
                    </button>
                  </div>
                  
                  {/* Delete Button (Owner Only) */}
                  {post.is_owner && (
                    <button
                      onClick={() => setDeletePostId(post.id)}
                      className="flex items-center gap-1 text-sm text-[color:var(--text-muted)] hover:text-red-500 transition"
                      title="Delete post"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onPostCreated={handlePostCreated}
        teamId={teamKey}
        teamName={teamName}
        league={league}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletePostId}
        onClose={() => setDeletePostId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Post"
        message="Are you sure you want to delete this post? This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        loading={deleting}
      />
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
