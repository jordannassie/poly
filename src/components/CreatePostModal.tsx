"use client";

import { useState } from "react";
import { X, Bold, Italic, Strikethrough, Link2, Image, List, ListOrdered, Quote, Code, Table, MoreHorizontal, Loader2 } from "lucide-react";
import { Button } from "./ui/button";

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: (post: any) => void;
  teamId: string;
  teamName: string;
  league: string;
}

type PostTab = "text" | "images" | "link" | "poll";

const tagOptions = [
  { id: "discussion", label: "Discussion", color: "bg-blue-500" },
  { id: "question", label: "Question", color: "bg-purple-500" },
  { id: "news", label: "News", color: "bg-green-500" },
  { id: "analysis", label: "Analysis", color: "bg-orange-500" },
  { id: "highlight", label: "Highlight", color: "bg-red-500" },
  { id: "prediction", label: "Prediction", color: "bg-yellow-500" },
];

export function CreatePostModal({ 
  isOpen, 
  onClose, 
  onPostCreated, 
  teamId, 
  teamName, 
  league 
}: CreatePostModalProps) {
  const [activeTab, setActiveTab] = useState<PostTab>("text");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePost = async () => {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setPosting(true);
    setError(null);

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim() || null,
          team_id: teamId,
          league,
          post_type: activeTab,
          flair: selectedTag,
          link_url: activeTab === "link" ? linkUrl : null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        onPostCreated(data.post);
        // Reset form
        setTitle("");
        setContent("");
        setLinkUrl("");
        setSelectedTag(null);
        onClose();
      } else {
        const data = await res.json();
        if (data.error === "AUTH_REQUIRED") {
          setError("Please sign in to create a post");
        } else {
          setError(data.error || "Failed to create post");
        }
      }
    } catch (err) {
      setError("Failed to create post. Please try again.");
    } finally {
      setPosting(false);
    }
  };

  const tabs: { id: PostTab; label: string }[] = [
    { id: "text", label: "Text" },
    { id: "images", label: "Images & Video" },
    { id: "link", label: "Link" },
    { id: "poll", label: "Poll" },
  ];

  const toolbarButtons = [
    { icon: Bold, label: "Bold" },
    { icon: Italic, label: "Italic" },
    { icon: Strikethrough, label: "Strikethrough" },
    { icon: Link2, label: "Link" },
    { icon: Image, label: "Image" },
    { icon: List, label: "Bullet List" },
    { icon: ListOrdered, label: "Numbered List" },
    { icon: Quote, label: "Quote" },
    { icon: Code, label: "Code" },
    { icon: Table, label: "Table" },
    { icon: MoreHorizontal, label: "More" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-3xl mx-4 bg-[color:var(--surface)] rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[color:var(--border-soft)]">
          <h2 className="text-xl font-bold">Create post</h2>
          <div className="flex items-center gap-4">
            <button className="text-sm text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)]">
              Drafts
            </button>
            <button onClick={onClose} className="text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)]">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex">
          {/* Main Content */}
          <div className="flex-1 p-6">
            {/* Community Selector */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-[color:var(--surface-2)] border border-[color:var(--border-soft)]">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                  {teamName.charAt(0)}
                </div>
                <span className="text-sm font-medium">r/{teamName.toLowerCase().replace(/\s+/g, "")}</span>
                <svg className="h-4 w-4 text-[color:var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Post Type Tabs */}
            <div className="flex border-b border-[color:var(--border-soft)] mb-4">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition -mb-px ${
                    activeTab === tab.id
                      ? "border-blue-500 text-[color:var(--text-strong)]"
                      : "border-transparent text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Title Input */}
            <div className="mb-4">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 300))}
                placeholder="Title*"
                className="w-full px-4 py-3 bg-transparent border border-[color:var(--border-soft)] rounded-lg text-[color:var(--text-strong)] placeholder:text-[color:var(--text-muted)] focus:outline-none focus:border-[color:var(--accent)]"
              />
              <div className="text-right text-xs text-[color:var(--text-muted)] mt-1">
                {title.length}/300
              </div>
            </div>

            {/* Tag Selector - Always Visible */}
            <div className="mb-4">
              <p className="text-xs text-[color:var(--text-muted)] mb-2">Select a tag (required)</p>
              <div className="flex flex-wrap gap-2">
                {tagOptions.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => setSelectedTag(selectedTag === tag.id ? null : tag.id)}
                    className={`px-3 py-1.5 text-sm rounded-full flex items-center gap-2 transition border ${
                      selectedTag === tag.id
                        ? `${tag.color} text-white border-transparent`
                        : "bg-[color:var(--surface-2)] text-[color:var(--text-muted)] border-[color:var(--border-soft)] hover:border-[color:var(--accent)]"
                    }`}
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Area based on tab */}
            {activeTab === "text" && (
              <div className="border border-[color:var(--border-soft)] rounded-lg overflow-hidden">
                {/* Toolbar */}
                <div className="flex items-center gap-1 px-2 py-2 border-b border-[color:var(--border-soft)] bg-[color:var(--surface-2)]">
                  {toolbarButtons.map((btn, idx) => (
                    <button
                      key={idx}
                      title={btn.label}
                      className="p-2 rounded hover:bg-[color:var(--surface)] text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)] transition"
                    >
                      <btn.icon className="h-4 w-4" />
                    </button>
                  ))}
                </div>
                {/* Text Area */}
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Body text (optional)"
                  className="w-full min-h-[200px] px-4 py-3 bg-transparent text-[color:var(--text-strong)] placeholder:text-[color:var(--text-muted)] focus:outline-none resize-none"
                />
              </div>
            )}

            {activeTab === "link" && (
              <div className="border border-[color:var(--border-soft)] rounded-lg overflow-hidden">
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="Paste URL here..."
                  className="w-full px-4 py-3 bg-transparent text-[color:var(--text-strong)] placeholder:text-[color:var(--text-muted)] focus:outline-none"
                />
              </div>
            )}

            {activeTab === "images" && (
              <div className="border-2 border-dashed border-[color:var(--border-soft)] rounded-lg p-8 text-center">
                <Image className="h-12 w-12 mx-auto text-[color:var(--text-muted)] mb-3" />
                <p className="text-[color:var(--text-muted)]">Drag and drop images or</p>
                <button className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm font-medium">
                  Upload
                </button>
              </div>
            )}

            {activeTab === "poll" && (
              <div className="border border-[color:var(--border-soft)] rounded-lg p-4">
                <p className="text-[color:var(--text-muted)] text-center">Poll creation coming soon!</p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={onClose}
                className="border-[color:var(--border-soft)]"
              >
                Save Draft
              </Button>
              <Button
                onClick={handlePost}
                disabled={!title.trim() || posting}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post"}
              </Button>
            </div>
          </div>

          {/* Right Sidebar - Rules */}
          <div className="w-64 p-4 border-l border-[color:var(--border-soft)] bg-[color:var(--surface-2)]">
            <h3 className="font-semibold text-sm mb-3 text-[color:var(--text-muted)]">
              R/{teamName.toUpperCase().replace(/\s+/g, "")} RULES
            </h3>
            <div className="space-y-3">
              {[
                "Stay Respectful – No Personal Attacks or Harassment",
                "No Spam or Self-Promotion",
                "Avoid Trolling and Inflammatory posts/behavior",
                "Avoid Low Quality/Low Effort Posts",
                "Stick to the Topic – Community Content Only",
              ].map((rule, idx) => (
                <div key={idx} className="flex gap-2">
                  <span className="text-[color:var(--text-muted)] text-sm font-medium">{idx + 1}</span>
                  <p className="text-sm text-[color:var(--text-muted)]">{rule}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
