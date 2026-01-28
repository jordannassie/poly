"use client";

import { useState } from "react";

type Team = {
  abbr: string;
  name: string;
  record?: string;
  odds: number;
  color: string;
  logoUrl?: string | null;
};

type HeadToHeadChartProps = {
  team1: Team;
  team2: Team;
  gameTime: string;
  volume?: string;
  source?: string;
};

// Team Badge component with logo support
function TeamBadge({ 
  team, 
  size = "md" 
}: { 
  team: Team; 
  size?: "sm" | "md" | "lg";
}) {
  const [imgError, setImgError] = useState(false);
  
  const sizeClasses = {
    sm: "w-10 h-10 text-sm",
    md: "w-20 h-20 text-2xl",
    lg: "w-24 h-24 text-3xl",
  };
  
  const imgSizes = {
    sm: "w-7 h-7",
    md: "w-14 h-14",
    lg: "w-18 h-18",
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-xl flex items-center justify-center text-white font-bold overflow-hidden`}
      style={{ 
        backgroundColor: team.color,
        boxShadow: size !== "sm" ? `0 8px 24px ${team.color}40` : undefined
      }}
    >
      {team.logoUrl && !imgError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={team.logoUrl}
          alt={team.name}
          className={`${imgSizes[size]} object-contain`}
          onError={() => setImgError(true)}
          loading="lazy"
        />
      ) : (
        team.abbr
      )}
    </div>
  );
}

export function HeadToHeadChart({
  team1,
  team2,
  gameTime,
  volume = "$4.02m Vol.",
  source = "ProvePicks",
}: HeadToHeadChartProps) {
  const total = team1.odds + team2.odds;
  const team1Percent = Math.round((team1.odds / total) * 100);
  const team2Percent = 100 - team1Percent;

  return (
    <div className="bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl p-4 md:p-6">
      {/* Game Time Badge */}
      <div className="flex justify-center mb-4 md:mb-6">
        <span className="px-3 md:px-4 py-1 md:py-1.5 rounded-full bg-[color:var(--surface-2)] border border-[color:var(--border-soft)] text-xs md:text-sm font-medium text-[color:var(--text-muted)]">
          {gameTime}
        </span>
      </div>

      {/* Teams and Progress - Horizontal on desktop, vertical on mobile */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
        {/* Mobile: Exciting head-to-head matchup */}
        <div className="md:hidden">
          {/* Teams facing off */}
          <div className="flex items-center justify-center gap-3 mb-4">
            {/* Team 1 */}
            <div className="text-center flex-1">
              <div className="mx-auto mb-2">
                <TeamBadge team={team1} size="md" />
              </div>
              <div className="font-bold text-base text-[color:var(--text-strong)]">{team1.name}</div>
              <div className="text-2xl font-bold mt-1" style={{ color: team1.color }}>
                {team1Percent}%
              </div>
            </div>

            {/* VS Badge */}
            <div className="flex flex-col items-center -mx-2">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
                <span className="text-white font-black text-sm">VS</span>
              </div>
            </div>

            {/* Team 2 */}
            <div className="text-center flex-1">
              <div className="mx-auto mb-2">
                <TeamBadge team={team2} size="md" />
              </div>
              <div className="font-bold text-base text-[color:var(--text-strong)]">{team2.name}</div>
              <div className="text-2xl font-bold mt-1" style={{ color: team2.color }}>
                {team2Percent}%
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-3 rounded-full overflow-hidden bg-[color:var(--surface-3)] flex shadow-inner">
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${team1Percent}%`,
                backgroundColor: team1.color,
              }}
            />
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${team2Percent}%`,
                backgroundColor: team2.color,
              }}
            />
          </div>
          <div className="flex items-center justify-center gap-2 mt-3 text-xs text-[color:var(--text-subtle)]">
            <span className="font-medium">{volume}</span>
            <span>•</span>
            <span>{source}</span>
          </div>
        </div>

        {/* Desktop: Team 1 */}
        <div className="hidden md:block flex-1 text-center">
          <div className="mx-auto mb-3 flex justify-center">
            <TeamBadge team={team1} size="md" />
          </div>
          <div className="font-semibold text-[color:var(--text-strong)]">{team1.name}</div>
          {team1.record && (
            <div className="text-sm text-[color:var(--text-subtle)]">{team1.record}</div>
          )}
        </div>

        {/* Desktop: Progress Bar Section */}
        <div className="hidden md:block flex-1 max-w-xs">
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="text-2xl font-bold text-[color:var(--text-strong)]">
              {team1Percent}%
            </span>
            <div className="flex-1 h-3 rounded-full overflow-hidden bg-[color:var(--surface-3)] flex">
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${team1Percent}%`,
                  backgroundColor: team1.color,
                }}
              />
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${team2Percent}%`,
                  backgroundColor: team2.color,
                }}
              />
            </div>
            <span className="text-2xl font-bold text-[color:var(--text-strong)]">
              {team2Percent}%
            </span>
          </div>
          <div className="text-center text-sm text-[color:var(--text-subtle)]">{volume}</div>
          <div className="flex items-center justify-center gap-1 mt-1 text-xs text-[color:var(--text-subtle)]">
            <span>⌐</span>
            <span>{source}</span>
          </div>
        </div>

        {/* Desktop: Team 2 */}
        <div className="hidden md:block flex-1 text-center">
          <div className="mx-auto mb-3 flex justify-center">
            <TeamBadge team={team2} size="md" />
          </div>
          <div className="font-semibold text-[color:var(--text-strong)]">{team2.name}</div>
          {team2.record && (
            <div className="text-sm text-[color:var(--text-subtle)]">{team2.record}</div>
          )}
        </div>
      </div>
    </div>
  );
}

// Compact version for lists
export function HeadToHeadRow({
  team1,
  team2,
  gameTime,
  volume,
  onClickTeam1,
  onClickTeam2,
}: {
  team1: Team;
  team2: Team;
  gameTime: string;
  volume: string;
  onClickTeam1?: () => void;
  onClickTeam2?: () => void;
}) {
  return (
    <div className="bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl p-4 hover:border-[color:var(--border-strong)] transition">
      <div className="flex items-center gap-4">
        {/* Time & Volume */}
        <div className="w-24">
          <div className="text-sm font-medium text-[color:var(--text-strong)]">{gameTime}</div>
          <div className="text-xs text-[color:var(--text-subtle)]">{volume}</div>
        </div>

        {/* Team 1 */}
        <div className="flex items-center gap-2 flex-1">
          <TeamBadge team={team1} size="sm" />
          <div>
            <div className="font-medium text-sm">{team1.name}</div>
            {team1.record && (
              <div className="text-xs text-[color:var(--text-subtle)]">{team1.record}</div>
            )}
          </div>
        </div>

        {/* Moneyline Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onClickTeam1}
            className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium text-sm transition"
          >
            {team1.abbr} {team1.odds}¢
          </button>
          <button
            onClick={onClickTeam2}
            className="px-4 py-2 rounded-lg bg-[color:var(--surface-3)] hover:bg-[color:var(--surface-2)] text-[color:var(--text-strong)] font-medium text-sm transition border border-[color:var(--border-soft)]"
          >
            {team2.abbr} {team2.odds}¢
          </button>
        </div>

        {/* Spread */}
        <div className="flex gap-2">
          <div className="px-3 py-2 rounded-lg bg-[color:var(--surface-2)] text-sm">
            <span className="text-[color:var(--text-muted)]">{team1.abbr} -4.5</span>
            <span className="ml-2 font-medium text-[color:var(--text-strong)]">51¢</span>
          </div>
          <div className="px-3 py-2 rounded-lg bg-[color:var(--surface-2)] text-sm">
            <span className="text-[color:var(--text-muted)]">{team2.abbr} +4.5</span>
            <span className="ml-2 font-medium text-[color:var(--text-strong)]">50¢</span>
          </div>
        </div>

        {/* Total */}
        <div className="flex gap-2">
          <div className="px-3 py-2 rounded-lg bg-[color:var(--surface-2)] text-sm">
            <span className="text-[color:var(--text-muted)]">O 46.5</span>
            <span className="ml-2 font-medium text-[color:var(--text-strong)]">47¢</span>
          </div>
          <div className="px-3 py-2 rounded-lg bg-[color:var(--surface-2)] text-sm">
            <span className="text-[color:var(--text-muted)]">U 46.5</span>
            <span className="ml-2 font-medium text-[color:var(--text-strong)]">54¢</span>
          </div>
        </div>

        {/* Game View Link */}
        <button className="text-sm text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)] transition flex items-center gap-1">
          <span className="text-xs bg-[color:var(--surface-2)] px-2 py-1 rounded">68</span>
          Game View &gt;
        </button>
      </div>

      {/* Team 2 Row */}
      <div className="flex items-center gap-4 mt-3 pl-28">
        <div className="flex items-center gap-2 flex-1">
          <TeamBadge team={team2} size="sm" />
          <div>
            <div className="font-medium text-sm">{team2.name}</div>
            {team2.record && (
              <div className="text-xs text-[color:var(--text-subtle)]">{team2.record}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
