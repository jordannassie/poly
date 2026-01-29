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
  onClick: () => void;
  variant?: "primary" | "secondary";
  compact?: boolean;
  className?: string;
}

/**
 * TeamOutcomeButton - A team-based outcome button with logo, name, and price
 * Replaces Yes/No buttons with team-specific styling
 */
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
  
  return (
    <Button
      onClick={onClick}
      className={`
        relative flex items-center gap-2 md:gap-3 w-full h-12 md:h-14 px-3 md:px-4
        text-white font-semibold transition-all duration-200
        ${selected 
          ? "ring-2 ring-offset-2 ring-offset-[color:var(--surface)]" 
          : "hover:brightness-110"
        }
        ${className}
      `}
      style={{
        backgroundColor: selected ? baseColor : `${baseColor}cc`, // cc = 80% opacity
        borderColor: baseColor,
        '--tw-ring-color': baseColor,
      } as React.CSSProperties}
    >
      {/* Team Logo or Abbreviation */}
      <div 
        className="w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden bg-white/20"
      >
        {team.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={team.logoUrl}
            alt={team.name}
            className="w-6 h-6 md:w-7 md:h-7 object-contain"
            loading="lazy"
            onError={(e) => {
              // Fallback to abbr on error
              e.currentTarget.style.display = "none";
              const parent = e.currentTarget.parentElement;
              if (parent) {
                parent.innerHTML = `<span class="text-xs md:text-sm font-bold text-white">${team.abbr}</span>`;
              }
            }}
          />
        ) : (
          <span className="text-xs md:text-sm font-bold text-white">{team.abbr}</span>
        )}
      </div>

      {/* Team Name */}
      <span className={`flex-1 text-left truncate ${compact ? "text-sm" : "text-sm md:text-base"}`}>
        {compact ? team.abbr : team.name}
      </span>

      {/* Price */}
      <span className={`font-bold ${compact ? "text-base" : "text-base md:text-lg"}`}>
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
    <div className="flex gap-2 md:gap-3">
      <TeamOutcomeButton
        team={teamA}
        priceCents={priceA}
        selected={selectedTeam === "teamA"}
        onClick={() => onSelectTeam("teamA")}
        compact={compact}
        className="flex-1"
      />
      <TeamOutcomeButton
        team={teamB}
        priceCents={priceB}
        selected={selectedTeam === "teamB"}
        onClick={() => onSelectTeam("teamB")}
        compact={compact}
        className="flex-1"
      />
    </div>
  );
}
