"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, Share2, MoreHorizontal, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { getLogoUrl } from "@/lib/images/getLogoUrl";

interface TeamBannerProps {
  teamId: string;
  teamName: string;
  league: string;
  logoUrl: string;
  primaryColor: string;
}

/**
 * Team Banner Component
 * 
 * Reddit-style banner with team color background, overlapping logo,
 * and follow/notification buttons.
 */
export function TeamBanner({ teamId, teamName, league, logoUrl, primaryColor }: TeamBannerProps) {
  const [imgError, setImgError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [showShareToast, setShowShareToast] = useState(false);

  // Unique team identifier
  const teamKey = `${league.toLowerCase()}:${teamName.toLowerCase().replace(/\s+/g, "-")}`;

  // Resolve logo URL using helper
  const resolvedLogoUrl = getLogoUrl(logoUrl);
  const showFallback = !resolvedLogoUrl || imgError;

  // Generate initials for fallback
  const initials = teamName
    .split(" ")
    .map(w => w.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Fetch initial follow status
  useEffect(() => {
    const fetchFollowStatus = async () => {
      try {
        const res = await fetch(`/api/teams/follow?team_id=${encodeURIComponent(teamKey)}`);
        if (res.ok) {
          const data = await res.json();
          setIsFollowing(data.is_following || false);
          setFollowersCount(data.followers_count || 0);
        }
      } catch {
        // Ignore errors
      }
    };
    fetchFollowStatus();
  }, [teamKey]);

  const handleFollow = async () => {
    if (followLoading) return;
    
    setFollowLoading(true);
    try {
      if (isFollowing) {
        // Unfollow
        const res = await fetch("/api/teams/follow", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ team_id: teamKey }),
        });
        if (res.ok) {
          setIsFollowing(false);
          setFollowersCount(prev => Math.max(0, prev - 1));
        }
      } else {
        // Follow
        const res = await fetch("/api/teams/follow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            team_id: teamKey,
            league: league,
            team_name: teamName,
          }),
        });
        if (res.ok) {
          setIsFollowing(true);
          setFollowersCount(prev => prev + 1);
        } else {
          const data = await res.json();
          if (data.error === "AUTH_REQUIRED") {
            alert("Please sign in to follow teams");
          } else {
            console.error("Follow error:", data.error);
            alert("Failed to follow team. Please try again.");
          }
        }
      }
    } catch (error) {
      console.error("Follow error:", error);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${teamName} Community`,
          text: `Check out the ${teamName} community on ProvePicks`,
          url: window.location.href,
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(window.location.href);
        setShowShareToast(true);
        setTimeout(() => setShowShareToast(false), 2000);
      }
    } catch (error) {
      // User cancelled share
    }
  };

  return (
    <div className="relative">
      {/* Banner Background */}
      <div 
        className="h-28 md:h-36 w-full"
        style={{ 
          background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`,
        }}
      />

      {/* Content Container - below the banner */}
      <div className="max-w-4xl mx-auto px-4 pt-4 pb-4 bg-[color:var(--app-bg)]">
        <div className="flex items-start gap-4">
          {/* Logo - positioned at the top */}
          <div 
            className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-[color:var(--surface)] overflow-hidden flex items-center justify-center shadow-lg flex-shrink-0 -mt-12 md:-mt-14 bg-[color:var(--surface)] relative"
            style={{ backgroundColor: primaryColor }}
          >
            {/* Fallback initials - always rendered, hidden when image loads */}
            <span 
              className={`text-white font-bold text-xl md:text-2xl ${!showFallback && isLoaded ? 'opacity-0' : 'opacity-100'} transition-opacity`}
              style={{ textShadow: "0 2px 4px rgba(0,0,0,0.3)" }}
            >
              {initials}
            </span>
            
            {/* Image overlay - using native img to bypass Next.js Image optimization */}
            {resolvedLogoUrl && !imgError && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resolvedLogoUrl}
                alt={teamName}
                data-img-src={resolvedLogoUrl}
                data-original-logo={logoUrl || "null"}
                className={`w-16 h-16 md:w-20 md:h-20 object-contain absolute transition-opacity duration-200 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setIsLoaded(true)}
                onError={() => setImgError(true)}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
              />
            )}
          </div>

          {/* Team Info & Actions */}
          <div className="flex-1 pt-2 flex flex-col md:flex-row md:items-start md:justify-between gap-3">
            {/* Team Info */}
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-[color:var(--text-strong)]">
                {teamName}
              </h1>
              <p className="text-sm text-[color:var(--text-muted)] mt-0.5">
                r/{teamName.toLowerCase().replace(/\s+/g, "")} • {league.toUpperCase()}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Follow Button */}
              <Button
                onClick={handleFollow}
                variant={isFollowing ? "outline" : "default"}
                size="sm"
                disabled={followLoading}
                className={`gap-2 ${
                  isFollowing 
                    ? "border-[color:var(--border-strong)] text-[color:var(--text-strong)]" 
                    : "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                }`}
              >
                {followLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isFollowing ? (
                  <>
                    <BellOff className="h-4 w-4" />
                    Following
                  </>
                ) : (
                  <>
                    <Bell className="h-4 w-4" />
                    Follow
                  </>
                )}
              </Button>

              {/* Share Button */}
              <Button
                variant="outline"
                size="icon"
                onClick={handleShare}
                className="border-[color:var(--border-strong)] h-8 w-8"
                title="Share"
              >
                <Share2 className="h-4 w-4" />
              </Button>

              {/* More Options */}
              <Button
                variant="outline"
                size="icon"
                className="border-[color:var(--border-strong)] h-8 w-8"
                title="More options"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Share Toast */}
      {showShareToast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-[color:var(--surface)] border border-[color:var(--border-strong)] px-4 py-2 rounded-lg shadow-lg z-50">
          <span className="text-sm text-[color:var(--text-strong)]">Link copied to clipboard!</span>
        </div>
      )}
    </div>
  );
}
