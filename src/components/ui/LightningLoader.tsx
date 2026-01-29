"use client";

import { Zap } from "lucide-react";

interface LightningLoaderProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
}

/**
 * LightningLoader - A cool animated lightning icon loader
 * Used for loading states across the app
 */
export function LightningLoader({ 
  size = "md", 
  text,
  className = "" 
}: LightningLoaderProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-10 w-10",
    lg: "h-16 w-16",
  };

  const containerClasses = {
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
    <div className={`flex flex-col items-center justify-center ${containerClasses[size]} ${className}`}>
      <div className="relative">
        {/* Outer glow ring */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 opacity-20 blur-xl animate-pulse" />
        
        {/* Lightning icon with animation */}
        <div className="relative animate-bounce">
          <Zap 
            className={`${sizeClasses[size]} text-yellow-400 fill-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]`}
            style={{
              filter: "drop-shadow(0 0 8px rgba(250,204,21,0.6))",
            }}
          />
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
