"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";
import { ChevronDown, ChevronUp, Zap } from "lucide-react";
import { TeamOutcomeButton, TeamOutcomeButtonPair } from "./market/TeamOutcomeButton";

type Team = {
  abbr: string;
  name: string;
  odds: number;
  color: string;
  logoUrl?: string | null;
};

type MobileBetBarProps = {
  team1: Team;
  team2: Team;
  onBet?: (team: "team1" | "team2", amount: number) => void;
};

// Format number with commas and 2 decimal places
const formatCurrency = (value: number): string => {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Darken a hex color by a percentage (0-100)
function darkenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, (num >> 16) - amt);
  const G = Math.max(0, ((num >> 8) & 0x00ff) - amt);
  const B = Math.max(0, (num & 0x0000ff) - amt);
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

// Lighten a hex color by a percentage (0-100)
function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
  const B = Math.min(255, (num & 0x0000ff) + amt);
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

// Create vibrant gradient style for team color
function getTeamGradient(color: string): string {
  const baseColor = color.startsWith("#") ? color : `#${color}`;
  const darkColor = darkenColor(baseColor, 20); // Only 20% darker (was 40%)
  const brightColor = lightenColor(baseColor, 15); // 15% brighter
  return `linear-gradient(135deg, ${darkColor} 0%, ${brightColor} 100%)`;
}

export function MobileBetBar({ team1, team2, onBet }: MobileBetBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<"team1" | "team2" | null>(null);
  const [amount, setAmount] = useState(0);

  const handleTeamSelect = (team: "team1" | "team2") => {
    setSelectedTeam(team);
    setIsOpen(true);
  };

  const handleQuickAmount = (value: number) => {
    setAmount((prev) => prev + value);
  };

  const selectedTeamData = selectedTeam === "team1" ? team1 : selectedTeam === "team2" ? team2 : null;
  
  // Calculate payout (amount * 100 / odds)
  const calculatePayout = (): number => {
    if (!selectedTeamData || amount === 0) return 0;
    return amount * (100 / selectedTeamData.odds);
  };

  return (
    <>
      {/* Fixed Bottom Bar - Mobile Only */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[color:var(--surface)] border-t border-[color:var(--border-soft)] shadow-2xl safe-area-bottom">
        <div className="p-3">
          {/* Quick Bet Buttons - Team-based */}
          <div className="flex gap-2">
            <TeamOutcomeButton
              team={{ name: team1.name, abbr: team1.abbr, logoUrl: team1.logoUrl, color: team1.color }}
              priceCents={team1.odds}
              onClick={() => handleTeamSelect("team1")}
              compact
              className="flex-1 shadow-lg"
            />
            <TeamOutcomeButton
              team={{ name: team2.name, abbr: team2.abbr, logoUrl: team2.logoUrl, color: team2.color }}
              priceCents={team2.odds}
              onClick={() => handleTeamSelect("team2")}
              compact
              className="flex-1 shadow-lg"
            />
          </div>
          
          {/* Swipe indicator */}
          <div className="flex justify-center mt-2">
            <div className="flex items-center gap-1 text-xs text-[color:var(--text-muted)]">
              <ChevronUp className="h-3 w-3" />
              <span>Tap to pick</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bet Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center justify-center gap-2 text-[color:var(--text-strong)]">
              <Zap className="h-5 w-5 text-yellow-500" />
              Place Your Bet
            </SheetTitle>
          </SheetHeader>

          {selectedTeamData && (
            <div className="space-y-4">
              {/* Team Selection */}
              <TeamOutcomeButtonPair
                teamA={{ name: team1.name, abbr: team1.abbr, logoUrl: team1.logoUrl, color: team1.color }}
                teamB={{ name: team2.name, abbr: team2.abbr, logoUrl: team2.logoUrl, color: team2.color }}
                priceA={team1.odds}
                priceB={team2.odds}
                selectedTeam={selectedTeam === "team1" ? "teamA" : selectedTeam === "team2" ? "teamB" : null}
                onSelectTeam={(team) => setSelectedTeam(team === "teamA" ? "team1" : "team2")}
              />

              {/* Amount Input */}
              <div className="bg-[color:var(--surface-2)] rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[color:var(--text-muted)]">Bet Amount</span>
                  <span className="text-sm text-[color:var(--text-subtle)]">Balance: $0.00</span>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-3xl font-bold text-[color:var(--text-strong)]">$</span>
                  <input
                    type="number"
                    min="0"
                    value={amount === 0 ? "" : amount}
                    onChange={(e) => setAmount(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full text-4xl font-bold text-center text-[color:var(--text-strong)] py-3 bg-transparent border-none outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-4 gap-2">
                {[1, 5, 20, 100].map((value) => (
                  <Button
                    key={value}
                    variant="outline"
                    onClick={() => handleQuickAmount(value)}
                    className="h-12 text-base font-semibold border-[color:var(--border-soft)]"
                  >
                    +${value}
                  </Button>
                ))}
              </div>

              {/* Odds and Payout */}
              <div className="space-y-3 pt-2">
                {/* Implied Chance */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[color:var(--text-muted)]">Implied chance</span>
                  <span className="text-base font-semibold text-[color:var(--text-strong)]">
                    {selectedTeamData.odds}%
                  </span>
                </div>

                {/* Payout if Team wins */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-sm text-[color:var(--text-muted)]">
                    <span>Payout if {selectedTeamData.name} wins</span>
                    <ChevronDown className="h-3 w-3" />
                  </div>
                  <span className="text-2xl font-bold text-green-500">
                    ${formatCurrency(calculatePayout())}
                  </span>
                </div>
              </div>

              {/* Place Pick Button */}
              <Button
                onClick={() => {
                  if (onBet && selectedTeam) {
                    onBet(selectedTeam, amount);
                  }
                  setIsOpen(false);
                  setAmount(0);
                }}
                disabled={amount === 0}
                style={{
                  backgroundImage: getTeamGradient(selectedTeamData.color || (selectedTeam === "team1" ? "#16a34a" : "#dc2626")),
                }}
                className="w-full h-14 text-lg font-bold text-white disabled:opacity-50 hover:brightness-110"
              >
                {amount === 0 ? "Enter Amount" : `Pick ${selectedTeamData.name} • $${formatCurrency(amount)}`}
              </Button>

              <p className="text-xs text-center text-[color:var(--text-subtle)]">
                By picking, you agree to the Terms of Use
              </p>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Spacer for fixed bottom bar */}
      <div className="lg:hidden h-24" />
    </>
  );
}
