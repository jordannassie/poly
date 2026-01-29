"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Heart, MessageCircle, MoreHorizontal, Send, Loader2 } from "lucide-react";

type Comment = {
  id: string;
  content: string;
  position: "yes" | "no" | null;
  likes_count: number;
  created_at: string;
  parent_id: string | null;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type CommentsPanelProps = {
  title?: string;
  marketSlug?: string;
};

// Demo comments for fallback when no market slug
const demoComments: Comment[] = [
  {
    id: "demo1",
    content: "Momentum is strong here. Watching the spread before adding more.",
    position: "yes",
    likes_count: 24,
    created_at: new Date(Date.now() - 7 * 60000).toISOString(),
    parent_id: null,
    user_id: "demo",
    username: "tour.snow",
    display_name: "Tour Snow",
    avatar_url: null,
  },
  {
    id: "demo2",
    content: "Feels overpriced at these levels. Waiting for a pullback.",
    position: "no",
    likes_count: 45,
    created_at: new Date(Date.now() - 21 * 60000).toISOString(),
    parent_id: null,
    user_id: "demo",
    username: "DonHRBob",
    display_name: "Don HR Bob",
    avatar_url: null,
  },
  {
    id: "demo3",
    content: "Short-term liquidity looks good. Risk/reward is solid.",
    position: "yes",
    likes_count: 31,
    created_at: new Date(Date.now() - 42 * 60000).toISOString(),
    parent_id: null,
    user_id: "demo",
    username: "market_maker",
    display_name: "Market Maker",
    avatar_url: null,
  },
];

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}

function getInitials(displayName: string | null, username: string | null): string {
  const name = displayName || username || "U";
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

export function CommentsPanel({ title = "Discussion", marketSlug }: CommentsPanelProps) {
  const [comments, setComments] = useState<Comment[]>(demoComments);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null>(null);

  // Fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/me");
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setCurrentUser(data.user);
          }
        }
      } catch {
        // Not logged in
      }
    };
    fetchUser();
  }, []);

  // Fetch real comments if market slug provided
  useEffect(() => {
    if (!marketSlug) return;
    
    const fetchComments = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/comments?market_slug=${encodeURIComponent(marketSlug)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.comments && data.comments.length > 0) {
            setComments(data.comments);
          }
          // Keep demo comments if no real comments yet
        }
      } catch {
        // Keep demo comments
      } finally {
        setLoading(false);
      }
    };
    fetchComments();
  }, [marketSlug]);

  const handlePost = async () => {
    if (!newComment.trim() || !marketSlug) return;
    
    setPosting(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          market_slug: marketSlug,
          content: newComment.trim(),
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.comment) {
          setComments(prev => [data.comment, ...prev]);
          setNewComment("");
        }
      } else {
        const data = await res.json();
        if (data.error === "AUTH_REQUIRED") {
          alert("Please sign in to comment");
        }
      }
    } catch (error) {
      console.error("Post error:", error);
    } finally {
      setPosting(false);
    }
  };

  return (
    <Card className="bg-[color:var(--surface)] border-[color:var(--border-soft)]">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">{title}</div>
          <span className="text-sm text-[color:var(--text-muted)]">{comments.length} comments</span>
        </div>
        
        {/* New Comment Input */}
        <div className="flex gap-3">
          {currentUser?.avatar_url ? (
            <img 
              src={currentUser.avatar_url} 
              alt="You" 
              className="h-10 w-10 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {currentUser ? getInitials(currentUser.display_name, currentUser.username) : "?"}
            </div>
          )}
          <div className="flex-1 flex gap-2">
            <Input
              placeholder={marketSlug ? "Add a comment..." : "Sign in to comment"}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handlePost()}
              disabled={!marketSlug || posting}
              className="bg-[color:var(--surface-2)] border-[color:var(--border-soft)] text-[color:var(--text-strong)] placeholder:text-[color:var(--text-subtle)]"
            />
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white px-4"
              disabled={!newComment.trim() || !marketSlug || posting}
              onClick={handlePost}
            >
              {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-[color:var(--text-muted)]" />
          </div>
        )}

        {/* Comments List */}
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <Link href={`/u/${comment.username || "user"}`}>
                {comment.avatar_url ? (
                  <img 
                    src={comment.avatar_url} 
                    alt={comment.display_name || comment.username || "User"} 
                    className="h-10 w-10 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div 
                    className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                    style={{ 
                      background: comment.position === "yes" 
                        ? "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)" 
                        : comment.position === "no"
                        ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                        : "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
                    }}
                  >
                    {getInitials(comment.display_name, comment.username)}
                  </div>
                )}
              </Link>
              <div className="flex-1 min-w-0">
                {/* Header */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Link 
                    href={`/u/${comment.username || "user"}`}
                    className="font-semibold text-sm hover:underline"
                  >
                    {comment.display_name || comment.username || "Anonymous"}
                  </Link>
                  {comment.position && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      comment.position === "yes" 
                        ? "bg-green-500/20 text-green-500" 
                        : "bg-red-500/20 text-red-500"
                    }`}>
                      {comment.position === "yes" ? "Yes" : "No"}
                    </span>
                  )}
                  <span className="text-xs text-[color:var(--text-muted)]">
                    {getTimeAgo(comment.created_at)}
                  </span>
                  <button className="ml-auto text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)]">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
                
                {/* Content */}
                <p className="text-sm text-[color:var(--text-strong)] mt-1">
                  {comment.content}
                </p>
                
                {/* Actions */}
                <div className="flex items-center gap-4 mt-2">
                  <button className="flex items-center gap-1 text-[color:var(--text-muted)] hover:text-red-500 transition text-sm">
                    <Heart className="h-4 w-4" />
                    {comment.likes_count > 0 && comment.likes_count}
                  </button>
                  <button className="flex items-center gap-1 text-[color:var(--text-muted)] hover:text-blue-500 transition text-sm">
                    <MessageCircle className="h-4 w-4" />
                    Reply
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
