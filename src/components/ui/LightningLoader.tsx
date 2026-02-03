"use client";

import { LOGO_URL } from "./ProvePicksLogo";

interface LightningLoaderProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
}

const sizeClasses = {
  sm: { container: "h-8 w-8", img: "h-6 w-6" },
  md: { container: "h-12 w-12", img: "h-10 w-10" },
  lg: { container: "h-20 w-20", img: "h-16 w-16" },
};

/**
 * LightningLoader - A cool animated logo loader
 * Used for loading states across the app
 */
export function LightningLoader({ 
  size = "md", 
  text,
  className = "" 
}: LightningLoaderProps) {
  const sizes = sizeClasses[size];

  const containerClassesGap = {
    sm: "gap-2",
    md: "gap-3",
    lg: "gap-4",
  };

  const textClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  return (
    <div className={`flex flex-col items-center justify-center ${containerClassesGap[size]} ${className}`}>
      <div className="relative">
        {/* Outer glow ring */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-orange-400 to-amber-500 opacity-30 blur-xl animate-pulse" />
        
        {/* Logo with animation */}
        <div className="relative animate-bounce">
          <div 
            className={`${sizes.container} rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center overflow-hidden shadow-lg shadow-orange-500/40`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={LOGO_URL}
              alt="ProvePicks"
              className={`${sizes.img} object-contain`}
              loading="eager"
            />
          </div>
        </div>
      </div>
      
      {text && (
        <span className={`text-[color:var(--text-muted)] ${textClasses[size]} animate-pulse`}>
          {text}
        </span>
      )}
    </div>
  );
}

/**
 * FullPageLoader - A centered lightning loader for full page loading states
 */
export function FullPageLoader({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-20">
      <LightningLoader size="lg" text={text} />
    </div>
  );
}

/**
 * InlineLoader - A small inline lightning loader
 */
export function InlineLoader({ text }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-8">
      <LightningLoader size="md" text={text} />
    </div>
  );
}
