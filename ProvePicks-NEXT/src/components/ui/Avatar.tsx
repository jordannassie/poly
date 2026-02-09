"use client";

import { useState } from "react";

/**
 * Avatar Component with graceful image error handling
 * 
 * Falls back to gradient circle with initials when image fails to load.
 */

interface AvatarProps {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  xs: "h-6 w-6 text-xs",
  sm: "h-8 w-8 text-sm",
  md: "h-10 w-10 text-base",
  lg: "h-12 w-12 text-lg",
  xl: "h-32 w-32 text-4xl",
};

function getInitials(name?: string): string {
  if (!name) return "U";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function Avatar({ 
  src, 
  alt = "Avatar", 
  name,
  size = "md", 
  className = "" 
}: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const sizeClass = sizeClasses[size];
  const initials = getInitials(name || alt);
  
  // Show fallback if no src, or if image failed to load
  const showFallback = !src || imageError;
  
  if (showFallback) {
    return (
      <div 
        className={`${sizeClass} rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center ${className}`}
      >
        <span className="font-bold text-white">{initials}</span>
      </div>
    );
  }
  
  return (
    <div className={`${sizeClass} rounded-full overflow-hidden ${className}`}>
      {/* Hidden fallback that shows while loading */}
      {!imageLoaded && (
        <div 
          className={`${sizeClass} rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center`}
        >
          <span className="font-bold text-white">{initials}</span>
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={`${sizeClass} object-cover ${imageLoaded ? '' : 'hidden'}`}
        onError={() => setImageError(true)}
        onLoad={() => setImageLoaded(true)}
        loading="lazy"
      />
    </div>
  );
}

export default Avatar;
