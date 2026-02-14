"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Heart, MessageSquare, MoreHorizontal, Send, Loader2, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { LightningLoader } from "@/components/ui/LightningLoader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Post {
  id: string;
  content: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  has_liked: boolean;
  is_owner?: boolean;
  user_id?: string;
  user: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface Reply {
  id: string;
  content: string;
  likes_count: number;
  created_at: string;
  has_liked: boolean;
  user: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface MarketCommentsProps {
  marketSlug: string;
  league: string;
}

export function MarketComments({ marketSlug, league }: MarketCommentsProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [postContent, setPostContent] = useState("");
  const [posting, setPosting] = useState(false);
  
  // Reply state
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [replying, setReplying] = useState(false);
  const [replies, setReplies] = useState<Record<string, Reply[]>>({});
  const [loadingReplies, setLoadingReplies] = useState<Record<string, boolean>>({});
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  
  // Menu state for post options
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Use market slug as team_id for posts
  const teamId = `market:${marketSlug}`;
  
  // Fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/me");
        if (res.ok) {
          const data = await res.json();
          setCurrentUserId(data.user?.id || null);
        }
      } catch {
        // Not logged in
      }
    };
    fetchUser();
  }, []);
  
  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpenFor(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch posts for this market
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await fetch(`/api/posts?team_id=${encodeURIComponent(teamId)}`);
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
  }, [teamId]);

  const handlePost = async () => {
    if (!postContent.trim() || posting) return;
    
    setPosting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: postContent,
          team_id: teamId,
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
          alert("Please sign in to comment");
        } else {
          alert("Failed to post. Please try again.");
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
      } else {
        const data = await res.json();
        if (data.error === "AUTH_REQUIRED") {
          alert("Please sign in to like posts");
        }
      }
    } catch (error) {
      console.error("Like error:", error);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;
    
    setDeleting(postId);
    setMenuOpenFor(null);
    
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "DELETE",
      });
      
      if (res.ok) {
        // Remove from local state
        setPosts(posts.filter(p => p.id !== postId));
      } else {
        const data = await res.json();
        if (data.error === "AUTH_REQUIRED") {
          alert("Please sign in to delete comments");
        } else if (data.error) {
          alert(data.error);
        } else {
          alert("Failed to delete. Please try again.");
        }
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete. Please try again.");
    } finally {
      setDeleting(null);
    }
  };

  const handleReply = async (postId: string) => {
    if (!replyContent.trim() || replying) return;
    
    setReplying(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: replyContent,
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        // Add new reply to the list
        setReplies(prev => ({
          ...prev,
          [postId]: [data.comment, ...(prev[postId] || [])],
        }));
        // Update post's comment count
        setPosts(posts.map(p => 
          p.id === postId 
            ? { ...p, comments_count: p.comments_count + 1 }
            : p
        ));
        setReplyContent("");
        setReplyingTo(null);
        // Make sure replies are expanded
        setExpandedReplies(prev => new Set(prev).add(postId));
      } else {
        const data = await res.json();
        if (data.error === "AUTH_REQUIRED") {
          alert("Please sign in to reply");
        } else {
          alert("Failed to reply. Please try again.");
        }
      }
    } catch (error) {
      console.error("Reply error:", error);
    } finally {
      setReplying(false);
    }
  };

  const loadReplies = async (postId: string) => {
    if (loadingReplies[postId]) return;
    
    setLoadingReplies(prev => ({ ...prev, [postId]: true }));
    try {
      const res = await fetch(`/api/posts/${postId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setReplies(prev => ({
          ...prev,
          [postId]: data.comments || [],
        }));
      }
    } catch (error) {
      console.error("Failed to load replies:", error);
    } finally {
      setLoadingReplies(prev => ({ ...prev, [postId]: false }));
    }
  };

  const toggleReplies = (postId: string) => {
    const newExpanded = new Set(expandedReplies);
    if (newExpanded.has(postId)) {
      newExpanded.delete(postId);
    } else {
      newExpanded.add(postId);
      // Load replies if not already loaded
      if (!replies[postId]) {
        loadReplies(postId);
      }
    }
    setExpandedReplies(newExpanded);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  return (
    <div className="mt-6 md:mt-8 bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl p-3 md:p-4">
      {/* Post Input */}
      <div className="flex items-center gap-3 mb-4">
        <Input
          placeholder="Add a comment..."
          value={postContent}
          onChange={(e) => setPostContent(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handlePost()}
          className="flex-1 bg-[color:var(--surface-2)] border-[color:var(--border-soft)]"
        />
        <Button 
          onClick={handlePost}
          disabled={!postContent.trim() || posting}
          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium"
        >
          {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post"}
        </Button>
      </div>

      {/* Posts List */}
      {loading ? (
        <LightningLoader size="md" text="Loading..." />
      ) : posts.length === 0 ? (
        <div className="text-center py-8 text-[color:var(--text-muted)]">
          No comments yet. Be the first to share your thoughts!
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id}>
              <div className="flex gap-3">
                <Link href={`/u/${post.user.username}`}>
                  {post.user.avatar_url ? (
                    <img 
                      src={post.user.avatar_url} 
                      alt={post.user.display_name || post.user.username}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                      {(post.user.display_name || post.user.username || "U").charAt(0).toUpperCase()}
                    </div>
                  )}
                </Link>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Link href={`/u/${post.user.username}`} className="font-semibold hover:underline">
                      {post.user.display_name || post.user.username}
                    </Link>
                    <span className="text-xs text-[color:var(--text-subtle)]">
                      {formatTimeAgo(post.created_at)}
                    </span>
                    {/* Post menu - show delete for owner */}
                    {(post.is_owner || post.user_id === currentUserId) && (
                      <div className="relative ml-auto" ref={menuOpenFor === post.id ? menuRef : undefined}>
                        <button 
                          onClick={() => setMenuOpenFor(menuOpenFor === post.id ? null : post.id)}
                          className="p-1 rounded hover:bg-[color:var(--surface-2)] transition"
                          disabled={deleting === post.id}
                        >
                          {deleting === post.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-[color:var(--text-muted)]" />
                          ) : (
                            <MoreHorizontal className="h-4 w-4 text-[color:var(--text-muted)]" />
                          )}
                        </button>
                        {menuOpenFor === post.id && (
                          <div className="absolute right-0 top-8 z-50 w-36 bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-lg shadow-lg overflow-hidden">
                            <button
                              onClick={() => handleDelete(post.id)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 transition"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-[color:var(--text-muted)] whitespace-pre-wrap">{post.content}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-[color:var(--text-muted)]">
                    <button 
                      onClick={() => handleLike(post.id, post.has_liked)}
                      className={`flex items-center gap-1 transition ${
                        post.has_liked ? "text-red-500" : "hover:text-red-500"
                      }`}
                    >
                      <Heart className={`h-4 w-4 ${post.has_liked ? "fill-current" : ""}`} />
                      {post.likes_count}
                    </button>
                    <button 
                      onClick={() => setReplyingTo(replyingTo === post.id ? null : post.id)}
                      className="hover:text-[color:var(--text-strong)]"
                    >
                      Reply
                    </button>
                    {post.comments_count > 0 && (
                      <button 
                        onClick={() => toggleReplies(post.id)}
                        className="flex items-center gap-1 hover:text-[color:var(--text-strong)]"
                      >
                        {expandedReplies.has(post.id) ? (
                          <>
                            <ChevronUp className="h-4 w-4" />
                            Hide replies
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4" />
                            {post.comments_count} {post.comments_count === 1 ? "reply" : "replies"}
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Reply Input */}
                  {replyingTo === post.id && (
                    <div className="flex items-center gap-2 mt-3">
                      <Input
                        placeholder="Write a reply..."
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleReply(post.id)}
                        className="flex-1 bg-[color:var(--surface-2)] border-[color:var(--border-soft)] h-9 text-sm"
                        autoFocus
                      />
                      <Button 
                        onClick={() => handleReply(post.id)}
                        disabled={!replyContent.trim() || replying}
                        size="sm"
                        className="bg-[color:var(--accent)] hover:bg-[color:var(--accent-strong)] text-white"
                      >
                        {replying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </div>
                  )}

                  {/* Replies */}
                  {expandedReplies.has(post.id) && (
                    <div className="mt-3 space-y-3 pl-4 border-l-2 border-[color:var(--border-soft)]">
                      {loadingReplies[post.id] ? (
                        <LightningLoader size="sm" text="Loading replies..." />
                      ) : (
                        replies[post.id]?.map((reply) => (
                          <div key={reply.id} className="flex gap-2">
                            <Link href={`/u/${reply.user.username}`}>
                              {reply.user.avatar_url ? (
                                <img 
                                  src={reply.user.avatar_url} 
                                  alt={reply.user.display_name || reply.user.username}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold">
                                  {(reply.user.display_name || reply.user.username || "U").charAt(0).toUpperCase()}
                                </div>
                              )}
                            </Link>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Link href={`/u/${reply.user.username}`} className="font-medium text-sm hover:underline">
                                  {reply.user.display_name || reply.user.username}
                                </Link>
                                <span className="text-xs text-[color:var(--text-subtle)]">
                                  {formatTimeAgo(reply.created_at)}
                                </span>
                              </div>
                              <p className="text-sm text-[color:var(--text-muted)]">{reply.content}</p>
                              <button className="flex items-center gap-1 mt-1 text-xs text-[color:var(--text-muted)] hover:text-red-500">
                                <Heart className={`h-3 w-3 ${reply.has_liked ? "fill-current text-red-500" : ""}`} />
                                {reply.likes_count}
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
