"use client";

import { useState } from "react";

/**
 * ProvePicks Logo Component
 * 
 * Displays the ProvePicks logo with a gradient icon fallback.
 * Uses pure CSS/SVG approach for reliability - no external image dependencies.
 */

interface ProvePicksLogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  glow?: boolean;
}

const sizeMap = {
  xs: { container: "h-6 w-6", text: "text-xs", icon: 12 },
  sm: { container: "h-8 w-8", text: "text-sm", icon: 16 },
  md: { container: "h-10 w-10", text: "text-base", icon: 20 },
  lg: { container: "h-12 w-12", text: "text-lg", icon: 24 },
  xl: { container: "h-16 w-16", text: "text-xl", icon: 32 },
};

export function ProvePicksLogo({ 
  size = "md", 
  className = "",
  glow = false 
}: ProvePicksLogoProps) {
  const sizes = sizeMap[size];
  
  return (
    <div 
      className={`${sizes.container} rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center overflow-hidden ${glow ? "shadow-lg shadow-orange-500/30" : ""} ${className}`}
    >
      {/* Lightning bolt icon - inline SVG for reliability */}
      <svg 
        width={sizes.icon} 
        height={sizes.icon} 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="text-white"
      >
        <path 
          d="M13 2L4.09344 12.6879C3.74463 13.1064 3.57023 13.3157 3.56756 13.4925C3.56524 13.6461 3.63372 13.7923 3.75324 13.8889C3.89073 14 4.16316 14 4.70802 14H12L11 22L19.9065 11.3121C20.2553 10.8936 20.4297 10.6843 20.4324 10.5075C20.4347 10.3539 20.3663 10.2077 20.2467 10.1111C20.1092 10 19.8368 10 19.292 10H12L13 2Z" 
          fill="currentColor"
        />
      </svg>
    </div>
  );
}

/**
 * Inline Logo for use in text contexts
 */
export function ProvePicksLogoInline({ className = "" }: { className?: string }) {
  return (
    <svg 
      width={20} 
      height={20} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`text-orange-500 ${className}`}
    >
      <path 
        d="M13 2L4.09344 12.6879C3.74463 13.1064 3.57023 13.3157 3.56756 13.4925C3.56524 13.6461 3.63372 13.7923 3.75324 13.8889C3.89073 14 4.16316 14 4.70802 14H12L11 22L19.9065 11.3121C20.2553 10.8936 20.4297 10.6843 20.4324 10.5075C20.4347 10.3539 20.3663 10.2077 20.2467 10.1111C20.1092 10 19.8368 10 19.292 10H12L13 2Z" 
        fill="currentColor"
      />
    </svg>
  );
}

// Legacy export for compatibility
export const LOGO_URL = "";
