"use client";

import { forwardRef } from "react";

export interface PicksCardData {
  league: string;
  eventTitle: string;
  teamA: {
    name: string;
    abbr: string;
    logoUrl: string | null;
    odds: number;
    color: string;
  };
  teamB: {
    name: string;
    abbr: string;
    logoUrl: string | null;
    odds: number;
    color: string;
  };
  selectedTeam: "teamA" | "teamB";
  locksIn: string;
  userHandle: string;
  statLine?: string;
}

interface PicksCardProps {
  data: PicksCardData;
}

/**
 * PicksCard component - renders a shareable pre-pick card
 * Uses a ref so it can be captured to an image
 */
export const PicksCard = forwardRef<HTMLDivElement, PicksCardProps>(
  function PicksCard({ data }, ref) {
    const { league, eventTitle, teamA, teamB, selectedTeam, locksIn, userHandle, statLine } = data;

    const selectedTeamData = selectedTeam === "teamA" ? teamA : teamB;

    return (
      <div
        ref={ref}
        className="w-[360px] bg-[#0d1117] border border-[#30363d] rounded-2xl overflow-hidden shadow-2xl"
        style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#161b22] to-[#21262d] border-b border-[#30363d]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-orange-500 bg-orange-500/10 px-2 py-1 rounded">
                {league.toUpperCase()}
              </span>
              <span className="text-xs text-gray-400">My Pick</span>
            </div>
            <span className="text-xs text-gray-500">provepicks.com</span>
          </div>
        </div>

        {/* Event Title */}
        <div className="px-5 py-3 border-b border-[#30363d]">
          <h2 className="text-lg font-bold text-white text-center">{eventTitle}</h2>
        </div>

        {/* Teams */}
        <div className="px-5 py-5">
          <div className="flex items-center justify-between">
            {/* Team A */}
            <div className={`flex flex-col items-center flex-1 p-3 rounded-xl transition ${
              selectedTeam === "teamA" 
                ? "bg-gradient-to-b from-orange-500/20 to-transparent border-2 border-orange-500/50" 
                : "opacity-60"
            }`}>
              <div 
                className="w-16 h-16 rounded-xl flex items-center justify-center mb-2 overflow-hidden"
                style={{ backgroundColor: teamA.color }}
              >
                {teamA.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={teamA.logoUrl}
                    alt={teamA.name}
                    className="w-12 h-12 object-contain"
                  />
                ) : (
                  <span className="text-white font-bold text-lg">{teamA.abbr}</span>
                )}
              </div>
              <span className="text-sm font-semibold text-white">{teamA.name}</span>
              <span className="text-2xl font-bold text-white mt-1">{teamA.odds}%</span>
              {selectedTeam === "teamA" && (
                <span className="text-xs text-orange-400 mt-1 font-medium">SELECTED</span>
              )}
            </div>

            {/* VS */}
            <div className="px-3">
              <span className="text-gray-500 font-bold text-lg">VS</span>
            </div>

            {/* Team B */}
            <div className={`flex flex-col items-center flex-1 p-3 rounded-xl transition ${
              selectedTeam === "teamB" 
                ? "bg-gradient-to-b from-orange-500/20 to-transparent border-2 border-orange-500/50" 
                : "opacity-60"
            }`}>
              <div 
                className="w-16 h-16 rounded-xl flex items-center justify-center mb-2 overflow-hidden"
                style={{ backgroundColor: teamB.color }}
              >
                {teamB.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={teamB.logoUrl}
                    alt={teamB.name}
                    className="w-12 h-12 object-contain"
                  />
                ) : (
                  <span className="text-white font-bold text-lg">{teamB.abbr}</span>
                )}
              </div>
              <span className="text-sm font-semibold text-white">{teamB.name}</span>
              <span className="text-2xl font-bold text-white mt-1">{teamB.odds}%</span>
              {selectedTeam === "teamB" && (
                <span className="text-xs text-orange-400 mt-1 font-medium">SELECTED</span>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-[#161b22] border-t border-[#30363d]">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                <span className="text-white text-xs font-bold">
                  {userHandle.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-gray-300">{userHandle}</span>
              {statLine && (
                <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
                  {statLine}
                </span>
              )}
            </div>
            <div className="text-gray-400 text-xs">
              Locks: {locksIn}
            </div>
          </div>
        </div>
      </div>
    );
  }
);
