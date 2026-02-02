"use client";

import { useState } from "react";

interface TeamBannerProps {
  teamName: string;
  league: string;
  logoUrl: string;
  primaryColor: string;
}

/**
 * Team Banner Component
 * 
 * Reddit-style banner with team color background and overlapping logo.
 */
export function TeamBanner({ teamName, league, logoUrl, primaryColor }: TeamBannerProps) {
  const [imgError, setImgError] = useState(false);

  // Generate initials for fallback
  const initials = teamName
    .split(" ")
    .map(w => w.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative">
      {/* Banner Background */}
      <div 
        className="h-32 md:h-40 w-full"
        style={{ 
          background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`,
        }}
      />

      {/* Content Container */}
      <div className="max-w-4xl mx-auto px-4">
        {/* Logo - overlaps banner */}
        <div className="relative -mt-12 md:-mt-16 mb-4">
          <div 
            className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-[color:var(--surface)] overflow-hidden flex items-center justify-center shadow-lg"
            style={{ backgroundColor: primaryColor }}
          >
            {logoUrl && !imgError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={teamName}
                className="w-20 h-20 md:w-28 md:h-28 object-contain"
                onError={() => setImgError(true)}
              />
            ) : (
              <span 
                className="text-white font-bold text-2xl md:text-3xl"
                style={{ textShadow: "0 2px 4px rgba(0,0,0,0.3)" }}
              >
                {initials}
              </span>
            )}
          </div>
        </div>

        {/* Team Info */}
        <div className="pb-4">
          <h1 className="text-2xl md:text-3xl font-bold text-[color:var(--text-strong)]">
            {teamName}
          </h1>
          <p className="text-sm text-[color:var(--text-muted)] mt-1">
            r/{teamName.toLowerCase().replace(/\s+/g, "")} • {league.toUpperCase()}
          </p>
        </div>
      </div>
    </div>
  );
}
