"use client";

import { useState } from "react";
import { getLogoUrl, getTeamInitials } from "@/lib/images/getLogoUrl";

interface TeamLogoProps {
  /** Logo URL or storage path from database */
  logo: string | null | undefined;
  /** Team name for initials fallback */
  name: string;
  /** Team abbreviation (optional, used for initials if provided) */
  abbreviation?: string;
  /** Size in pixels (default: 40) */
  size?: number;
  /** CSS classes for the container */
  className?: string;
  /** Background color for fallback (optional) */
  bgColor?: string;
}

/**
 * TeamLogo - Displays a team logo with robust error handling
 * 
 * Features:
 * - Converts storage paths to full Supabase URLs
 * - Shows initials fallback on error or missing logo
 * - Smooth fade-in on load
 * - No broken image icons ever
 */
export function TeamLogo({
  logo,
  name,
  abbreviation,
  size = 40,
  className = "",
  bgColor,
}: TeamLogoProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Get the proper URL
  const logoUrl = getLogoUrl(logo);

  // Get initials for fallback
  const initials = abbreviation || getTeamInitials(name);

  // Show initials if no URL or error occurred
  const showFallback = !logoUrl || hasError;

  return (
    <div
      className={`relative flex items-center justify-center rounded-lg overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: showFallback 
          ? (bgColor || "var(--surface-2)") 
          : "transparent",
      }}
    >
      {/* Fallback initials */}
      {showFallback && (
        <span
          className="font-bold text-white"
          style={{
            fontSize: Math.max(size * 0.3, 10),
            background: bgColor ? undefined : "linear-gradient(135deg, #3b82f6, #8b5cf6)",
            WebkitBackgroundClip: bgColor ? undefined : "text",
            WebkitTextFillColor: bgColor ? undefined : "transparent",
            backgroundClip: bgColor ? undefined : "text",
          }}
        >
          {initials}
        </span>
      )}

      {/* Actual image - using native img to bypass Next.js Image optimization */}
      {logoUrl && !hasError && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={name}
          width={size}
          height={size}
          data-img-src={logoUrl}
          data-original-logo={logo || "null"}
          className={`object-contain absolute inset-0 w-full h-full transition-opacity duration-200 ${
            isLoaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
        />
      )}
    </div>
  );
}

/**
 * TeamLogoLink - TeamLogo wrapped in a link
 */
interface TeamLogoLinkProps extends TeamLogoProps {
  href: string;
}

export function TeamLogoLink({ href, ...props }: TeamLogoLinkProps) {
  return (
    <a
      href={href}
      className="hover:ring-2 hover:ring-[color:var(--accent)] transition rounded-lg"
    >
      <TeamLogo {...props} />
    </a>
  );
}
