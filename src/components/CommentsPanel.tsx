"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Heart, MessageCircle, MoreHorizontal, Reply, Send } from "lucide-react";

type Comment = {
  id: string;
  user: string;
  avatar: string;
  tag: "Yes" | "No";
  message: string;
  time: string;
  likes: number;
  replies: Reply[];
  isLiked?: boolean;
};

type Reply = {
  id: string;
  user: string;
  avatar: string;
  message: string;
  time: string;
  likes: number;
};

const demoComments: Comment[] = [
  {
    id: "c1",
    user: "tour.snow",
    avatar: "T",
    tag: "Yes",
    message: "Momentum is strong here. Watching the spread before adding more. Chiefs defense looking unstoppable lately.",
    time: "7m",
    likes: 24,
    replies: [
      {
        id: "r1",
        user: "BetKing99",
        avatar: "B",
        message: "Agreed! The line movement says it all.",
        time: "5m",
        likes: 8,
      },
      {
        id: "r2",
        user: "SharpShooter",
        avatar: "S",
        message: "Be careful, public is heavy on Chiefs. Could be a trap.",
        time: "3m",
        likes: 12,
      },
    ],
  },
  {
    id: "c2",
    user: "DonHRBob",
    avatar: "D",
    tag: "No",
    message: "Feels overpriced at these levels. Waiting for a pullback. Eagles have covered in 8 of last 10 big games.",
    time: "21m",
    likes: 45,
    replies: [
      {
        id: "r3",
        user: "NFLGuru",
        avatar: "N",
        message: "That's a solid stat. Eagles +3.5 looking tasty.",
        time: "18m",
        likes: 15,
      },
    ],
  },
  {
    id: "c3",
    user: "market_maker",
    avatar: "M",
    tag: "Yes",
    message: "Short-term liquidity looks good. Risk/reward is solid at current prices. Taking a position here.",
    time: "42m",
    likes: 67,
    replies: [],
  },
  {
    id: "c4",
    user: "PredictKing",
    avatar: "P",
    tag: "Yes",
    message: "Historical data supports this pick. Chiefs are 7-2 ATS as favorites this season.",
    time: "1h",
    likes: 31,
    replies: [
      {
        id: "r4",
        user: "StatsNerd",
        avatar: "S",
        message: "Where did you get that stat? I'm seeing 6-3.",
        time: "55m",
        likes: 4,
      },
      {
        id: "r5",
        user: "PredictKing",
        avatar: "P",
        message: "@StatsNerd Including playoffs, home games only.",
        time: "50m",
        likes: 9,
      },
    ],
  },
];

type CommentsPanelProps = {
  title?: string;
};

export function CommentsPanel({ title = "Discussion" }: CommentsPanelProps) {
  const [comments, setComments] = useState<Comment[]>(demoComments);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set(["c1"]));

  const toggleLike = (commentId: string) => {
    setComments(prev => prev.map(c => 
      c.id === commentId 
        ? { ...c, isLiked: !c.isLiked, likes: c.isLiked ? c.likes - 1 : c.likes + 1 }
        : c
    ));
  };

  const toggleReplies = (commentId: string) => {
    setExpandedReplies(prev => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
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
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
            DT
          </div>
          <div className="flex-1 flex gap-2">
            <Input
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="bg-[color:var(--surface-2)] border-[color:var(--border-soft)] text-[color:var(--text-strong)] placeholder:text-[color:var(--text-subtle)]"
            />
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white px-4"
              disabled={!newComment.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Comments List */}
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="space-y-3">
              {/* Main Comment */}
              <div className="flex gap-3">
                <Link href={`/u/${comment.user.toLowerCase()}`}>
                  <div 
                    className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                    style={{ 
                      background: comment.tag === "Yes" 
                        ? "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)" 
                        : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                    }}
                  >
                    {comment.avatar}
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Link 
                      href={`/u/${comment.user.toLowerCase()}`}
                      className="font-semibold text-sm hover:text-blue-500 transition"
                    >
                      {comment.user}
                    </Link>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      comment.tag === "Yes" 
                        ? "bg-green-500/20 text-green-500" 
                        : "bg-red-500/20 text-red-500"
                    }`}>
                      {comment.tag}
                    </span>
                    <span className="text-xs text-[color:var(--text-subtle)]">{comment.time}</span>
                    <button className="ml-auto text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)]">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-sm text-[color:var(--text-strong)] mb-2">{comment.message}</p>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-4 text-xs">
                    <button 
                      onClick={() => toggleLike(comment.id)}
                      className={`flex items-center gap-1 transition ${
                        comment.isLiked ? "text-red-500" : "text-[color:var(--text-muted)] hover:text-red-500"
                      }`}
                    >
                      <Heart className={`h-4 w-4 ${comment.isLiked ? "fill-current" : ""}`} />
                      {comment.likes}
                    </button>
                    <button 
                      onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                      className="flex items-center gap-1 text-[color:var(--text-muted)] hover:text-blue-500 transition"
                    >
                      <Reply className="h-4 w-4" />
                      Reply
                    </button>
                    {comment.replies.length > 0 && (
                      <button 
                        onClick={() => toggleReplies(comment.id)}
                        className="flex items-center gap-1 text-blue-500 hover:text-blue-400 transition"
                      >
                        <MessageCircle className="h-4 w-4" />
                        {expandedReplies.has(comment.id) ? "Hide" : "View"} {comment.replies.length} {comment.replies.length === 1 ? "reply" : "replies"}
                      </button>
                    )}
                  </div>

                  {/* Reply Input */}
                  {replyingTo === comment.id && (
                    <div className="flex gap-2 mt-3">
                      <Input
                        placeholder={`Reply to @${comment.user}...`}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="bg-[color:var(--surface-2)] border-[color:var(--border-soft)] text-sm"
                        autoFocus
                      />
                      <Button 
                        size="sm" 
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        disabled={!replyText.trim()}
                      >
                        Reply
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="border-[color:var(--border-soft)]"
                        onClick={() => {
                          setReplyingTo(null);
                          setReplyText("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Replies */}
              {expandedReplies.has(comment.id) && comment.replies.length > 0 && (
                <div className="ml-12 space-y-3 pl-4 border-l-2 border-[color:var(--border-soft)]">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="flex gap-3">
                      <Link href={`/u/${reply.user.toLowerCase()}`}>
                        <div className="h-8 w-8 rounded-full bg-[color:var(--surface-3)] flex items-center justify-center text-[color:var(--text-muted)] font-bold text-xs shrink-0">
                          {reply.avatar}
                        </div>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Link 
                            href={`/u/${reply.user.toLowerCase()}`}
                            className="font-semibold text-sm hover:text-blue-500 transition"
                          >
                            {reply.user}
                          </Link>
                          <span className="text-xs text-[color:var(--text-subtle)]">{reply.time}</span>
                        </div>
                        <p className="text-sm text-[color:var(--text-strong)]">{reply.message}</p>
                        <div className="flex items-center gap-4 mt-1 text-xs">
                          <button className="flex items-center gap-1 text-[color:var(--text-muted)] hover:text-red-500 transition">
                            <Heart className="h-3 w-3" />
                            {reply.likes}
                          </button>
                          <button className="flex items-center gap-1 text-[color:var(--text-muted)] hover:text-blue-500 transition">
                            <Reply className="h-3 w-3" />
                            Reply
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Load More */}
        <Button variant="outline" className="w-full border-[color:var(--border-soft)]">
          Load More Comments
        </Button>
      </CardContent>
    </Card>
  );
}
