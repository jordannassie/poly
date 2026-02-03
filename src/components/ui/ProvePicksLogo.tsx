"use client";

/**
 * ProvePicks Logo Component
 * 
 * Displays the ProvePicks logo image from Supabase storage.
 * Used throughout the app for branding.
 */

const LOGO_URL = "https://qiodxdkcvewvappuzuud.supabase.co/storage/v1/object/public/SPORTS/logos/Logo.jpg";

interface ProvePicksLogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  glow?: boolean;
}

const sizeMap = {
  xs: { container: "h-6 w-6", img: "h-5 w-5" },
  sm: { container: "h-8 w-8", img: "h-6 w-6" },
  md: { container: "h-10 w-10", img: "h-8 w-8" },
  lg: { container: "h-12 w-12", img: "h-10 w-10" },
  xl: { container: "h-16 w-16", img: "h-14 w-14" },
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={LOGO_URL}
        alt="ProvePicks"
        className={`${sizes.img} object-contain`}
        loading="eager"
      />
    </div>
  );
}

/**
 * Inline Logo for use in text contexts
 */
export function ProvePicksLogoInline({ className = "" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={LOGO_URL}
      alt="ProvePicks"
      className={`h-5 w-5 object-contain ${className}`}
      loading="eager"
    />
  );
}

export { LOGO_URL };
