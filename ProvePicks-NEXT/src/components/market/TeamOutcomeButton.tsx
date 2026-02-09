"use client";

import { Button } from "@/components/ui/button";

export interface TeamOutcomeProps {
  team: {
    name: string;
    abbr: string;
    logoUrl?: string | null;
    color?: string;
  };
  priceCents: number;
  selected?: boolean;
  onClick?: () => void;
  variant?: "primary" | "secondary";
  compact?: boolean;
  className?: string;
}

/**
 * TeamOutcomeButton - A team-based outcome button with logo, name, and price
 * Replaces Yes/No buttons with team-specific styling
 */
/**
 * Darken a hex color by a percentage (0-100)
 */
function darkenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, (num >> 16) - amt);
  const G = Math.max(0, ((num >> 8) & 0x00ff) - amt);
  const B = Math.max(0, (num & 0x0000ff) - amt);
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

/**
 * Lighten a hex color by a percentage (0-100)
 */
function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
  const B = Math.min(255, (num & 0x0000ff) + amt);
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

export function TeamOutcomeButton({
  team,
  priceCents,
  selected = false,
  onClick,
  variant = "primary",
  compact = false,
  className = "",
}: TeamOutcomeProps) {
  const teamColor = team.color || "#6366f1"; // Default to indigo if no color
  
  // Parse the color - ensure it starts with #
  const baseColor = teamColor.startsWith("#") ? teamColor : `#${teamColor}`;
  
  // Create vibrant gradient - less darkening on dark end, brighten the light end
  const darkColor = darkenColor(baseColor, 20); // Only 20% darker (was 40%)
  const brightColor = lightenColor(baseColor, 15); // 15% brighter
  const gradientStyle = selected
    ? `linear-gradient(135deg, ${darkColor} 0%, ${brightColor} 100%)`
    : `linear-gradient(135deg, ${darkColor} 0%, ${brightColor} 100%)`; // Full opacity for vibrancy
  
  return (
    <Button
      onClick={onClick}
      className={`
        relative flex items-center gap-1.5 md:gap-2 w-full min-w-0 h-12 md:h-14 px-2 md:px-3
        text-white font-semibold transition-all duration-200 overflow-hidden
        ${selected 
          ? "ring-2 ring-offset-2 ring-offset-[color:var(--surface)]" 
          : "hover:brightness-110"
        }
        ${className}
      `}
      style={{
        backgroundImage: gradientStyle,
        borderColor: baseColor,
        '--tw-ring-color': baseColor,
      } as React.CSSProperties}
    >
      {/* Team Logo or Abbreviation */}
      <div 
        className="w-7 h-7 md:w-8 md:h-8 rounded-md flex items-center justify-center flex-shrink-0 overflow-hidden bg-white/20"
      >
        {team.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={team.logoUrl}
            alt={team.name}
            className="w-5 h-5 md:w-6 md:h-6 object-contain"
            loading="lazy"
            onError={(e) => {
              // Fallback to abbr on error
              e.currentTarget.style.display = "none";
              const parent = e.currentTarget.parentElement;
              if (parent) {
                parent.innerHTML = `<span class="text-xs font-bold text-white">${team.abbr}</span>`;
              }
            }}
          />
        ) : (
          <span className="text-xs font-bold text-white">{team.abbr}</span>
        )}
      </div>

      {/* Team Name/Abbr */}
      <span className={`flex-1 min-w-0 text-left truncate text-sm`}>
        {team.abbr}
      </span>

      {/* Price */}
      <span className="font-bold text-base flex-shrink-0">
        {priceCents}¢
      </span>
    </Button>
  );
}

/**
 * TeamOutcomeButtonPair - Renders two team buttons side by side
 */
export interface TeamOutcomeButtonPairProps {
  teamA: TeamOutcomeProps["team"];
  teamB: TeamOutcomeProps["team"];
  priceA: number;
  priceB: number;
  selectedTeam: "teamA" | "teamB" | null;
  onSelectTeam: (team: "teamA" | "teamB") => void;
  compact?: boolean;
}

export function TeamOutcomeButtonPair({
  teamA,
  teamB,
  priceA,
  priceB,
  selectedTeam,
  onSelectTeam,
  compact = false,
}: TeamOutcomeButtonPairProps) {
  return (
    <div className="flex gap-2 w-full overflow-hidden">
      <TeamOutcomeButton
        team={teamA}
        priceCents={priceA}
        selected={selectedTeam === "teamA"}
        onClick={() => onSelectTeam("teamA")}
        compact={compact}
        className="flex-1 min-w-0"
      />
      <TeamOutcomeButton
        team={teamB}
        priceCents={priceB}
        selected={selectedTeam === "teamB"}
        onClick={() => onSelectTeam("teamB")}
        compact={compact}
        className="flex-1 min-w-0"
      />
    </div>
  );
}
