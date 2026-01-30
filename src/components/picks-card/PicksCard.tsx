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
  userAvatarUrl?: string | null;
  statLine?: string;
  // Receipt card fields (optional)
  amount?: number;
  potentialPayout?: number;
}

export type CardVariant = "pick" | "receipt";

interface PicksCardProps {
  data: PicksCardData;
  compact?: boolean;
  variant?: CardVariant;
}

/**
 * PicksCard component - renders a shareable pre-pick card
 * Supports full and compact modes, and pick vs receipt variants
 */
export const PicksCard = forwardRef<HTMLDivElement, PicksCardProps>(
  function PicksCard({ data, compact = false, variant = "pick" }, ref) {
    const { 
      league = "", 
      eventTitle = "", 
      teamA, 
      teamB, 
      selectedTeam = "teamA", 
      locksIn = "TBD", 
      userHandle = "Guest", 
      userAvatarUrl,
      statLine,
      amount,
      potentialPayout
    } = data || {};

    // Defensive defaults
    const safeTeamA = teamA || { name: "Team A", abbr: "A", logoUrl: null, odds: 50, color: "#333" };
    const safeTeamB = teamB || { name: "Team B", abbr: "B", logoUrl: null, odds: 50, color: "#333" };

    // Format user handle for display
    const displayHandle = userHandle === "Guest" ? "Guest" : (userHandle.startsWith("@") ? userHandle : `@${userHandle}`);

    // Determine if we should show receipt info
    const showReceipt = variant === "receipt" && amount && amount > 0;

    // Compact mode for inline preview
    if (compact) {
      return (
        <div
          ref={ref}
          className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl overflow-hidden"
        >
          {/* Compact Header */}
          <div className="px-3 py-2 bg-gradient-to-r from-[#161b22] to-[#21262d] border-b border-[#30363d]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded">
                {league.toUpperCase()}
              </span>
              <span className="text-[10px] text-gray-500">
                {showReceipt ? "My Receipt" : "My Pick"}
              </span>
            </div>
          </div>

          {/* Compact Teams */}
          <div className="px-3 py-3">
            <div className="flex items-center justify-between">
              {/* Team A */}
              <div className={`flex flex-col items-center flex-1 p-2 rounded-lg transition ${
                selectedTeam === "teamA" 
                  ? "bg-gradient-to-b from-orange-500/20 to-transparent border border-orange-500/50" 
                  : "opacity-60"
              }`}>
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-1 overflow-hidden"
                  style={{ backgroundColor: safeTeamA.color }}
                >
                  {safeTeamA.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={safeTeamA.logoUrl}
                      alt={safeTeamA.name}
                      className="w-7 h-7 object-contain"
                    />
                  ) : (
                    <span className="text-white font-bold text-xs">{safeTeamA.abbr}</span>
                  )}
                </div>
                <span className="text-[10px] font-semibold text-white">{safeTeamA.abbr}</span>
                <span className="text-sm font-bold text-white">{safeTeamA.odds}%</span>
              </div>

              {/* VS */}
              <div className="px-2">
                <span className="text-gray-500 font-bold text-xs">VS</span>
              </div>

              {/* Team B */}
              <div className={`flex flex-col items-center flex-1 p-2 rounded-lg transition ${
                selectedTeam === "teamB" 
                  ? "bg-gradient-to-b from-orange-500/20 to-transparent border border-orange-500/50" 
                  : "opacity-60"
              }`}>
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-1 overflow-hidden"
                  style={{ backgroundColor: safeTeamB.color }}
                >
                  {safeTeamB.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={safeTeamB.logoUrl}
                      alt={safeTeamB.name}
                      className="w-7 h-7 object-contain"
                    />
                  ) : (
                    <span className="text-white font-bold text-xs">{safeTeamB.abbr}</span>
                  )}
                </div>
                <span className="text-[10px] font-semibold text-white">{safeTeamB.abbr}</span>
                <span className="text-sm font-bold text-white">{safeTeamB.odds}%</span>
              </div>
            </div>
          </div>

          {/* Compact Footer */}
          <div className="px-3 py-2 bg-[#161b22] border-t border-[#30363d]">
            <div className="flex items-center justify-between text-[10px]">
              <div className="flex items-center gap-1.5">
                {userAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={userAvatarUrl}
                    alt=""
                    className="w-4 h-4 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                    <span className="text-white text-[8px] font-bold">
                      {userHandle.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="text-gray-400">{displayHandle}</span>
              </div>
              <span className="text-gray-500">Locks: {locksIn}</span>
            </div>
          </div>
        </div>
      );
    }

    // Full card mode
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
              <span className="text-xs text-gray-400">
                {showReceipt ? "My Receipt" : "My Pick"}
              </span>
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
                style={{ backgroundColor: safeTeamA.color }}
              >
                {safeTeamA.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={safeTeamA.logoUrl}
                    alt={safeTeamA.name}
                    className="w-12 h-12 object-contain"
                  />
                ) : (
                  <span className="text-white font-bold text-lg">{safeTeamA.abbr}</span>
                )}
              </div>
              <span className="text-sm font-semibold text-white">{safeTeamA.name}</span>
              <span className="text-2xl font-bold text-white mt-1">{safeTeamA.odds}%</span>
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
                style={{ backgroundColor: safeTeamB.color }}
              >
                {safeTeamB.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={safeTeamB.logoUrl}
                    alt={safeTeamB.name}
                    className="w-12 h-12 object-contain"
                  />
                ) : (
                  <span className="text-white font-bold text-lg">{safeTeamB.abbr}</span>
                )}
              </div>
              <span className="text-sm font-semibold text-white">{safeTeamB.name}</span>
              <span className="text-2xl font-bold text-white mt-1">{safeTeamB.odds}%</span>
              {selectedTeam === "teamB" && (
                <span className="text-xs text-orange-400 mt-1 font-medium">SELECTED</span>
              )}
            </div>
          </div>
        </div>

        {/* Receipt Section (only for receipt variant with amount) */}
        {showReceipt && (
          <div className="px-5 py-4 border-t border-[#30363d] bg-[#0d1117]">
            <div className="flex justify-between items-center">
              <div className="text-center flex-1">
                <div className="text-xs text-gray-500 mb-1">Amount</div>
                <div className="text-xl font-bold text-white">${amount?.toLocaleString()}</div>
              </div>
              <div className="w-px h-10 bg-[#30363d]" />
              <div className="text-center flex-1">
                <div className="text-xs text-gray-500 mb-1">Potential Payout</div>
                <div className="text-xl font-bold text-green-500">${potentialPayout?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-4 bg-[#161b22] border-t border-[#30363d]">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              {userAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={userAvatarUrl}
                  alt=""
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">
                    {userHandle.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <span className="text-gray-300">{displayHandle}</span>
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
