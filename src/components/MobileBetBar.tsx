"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";
import { ChevronUp, Zap } from "lucide-react";

type Team = {
  abbr: string;
  name: string;
  odds: number;
  color: string;
};

type MobileBetBarProps = {
  team1: Team;
  team2: Team;
  onBet?: (team: "team1" | "team2", amount: number) => void;
};

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

  return (
    <>
      {/* Fixed Bottom Bar - Mobile Only */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[color:var(--surface)] border-t border-[color:var(--border-soft)] shadow-2xl safe-area-bottom">
        <div className="p-3">
          {/* Quick Bet Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={() => handleTeamSelect("team1")}
              className="flex-1 h-12 text-white font-bold text-base shadow-lg"
              style={{ 
                backgroundColor: team1.color,
              }}
            >
              {team1.abbr} {team1.odds}¢
            </Button>
            <Button
              onClick={() => handleTeamSelect("team2")}
              className="flex-1 h-12 text-white font-bold text-base shadow-lg"
              style={{ 
                backgroundColor: team2.color,
              }}
            >
              {team2.abbr} {team2.odds}¢
            </Button>
          </div>
          
          {/* Swipe indicator */}
          <div className="flex justify-center mt-2">
            <div className="flex items-center gap-1 text-xs text-[color:var(--text-muted)]">
              <ChevronUp className="h-3 w-3" />
              <span>Tap to bet</span>
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
              <div className="flex gap-2">
                <Button
                  onClick={() => setSelectedTeam("team1")}
                  className={`flex-1 h-14 font-bold text-lg transition-all ${
                    selectedTeam === "team1" 
                      ? "ring-2 ring-offset-2 ring-offset-[color:var(--surface)]" 
                      : "opacity-60"
                  }`}
                  style={{ 
                    backgroundColor: team1.color,
                    ringColor: team1.color,
                  }}
                >
                  {team1.abbr} {team1.odds}¢
                </Button>
                <Button
                  onClick={() => setSelectedTeam("team2")}
                  className={`flex-1 h-14 font-bold text-lg transition-all ${
                    selectedTeam === "team2" 
                      ? "ring-2 ring-offset-2 ring-offset-[color:var(--surface)]" 
                      : "opacity-60"
                  }`}
                  style={{ 
                    backgroundColor: team2.color,
                    ringColor: team2.color,
                  }}
                >
                  {team2.abbr} {team2.odds}¢
                </Button>
              </div>

              {/* Amount Display */}
              <div className="bg-[color:var(--surface-2)] rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[color:var(--text-muted)]">Bet Amount</span>
                  <span className="text-sm text-[color:var(--text-subtle)]">Balance: $0.00</span>
                </div>
                <div className="text-4xl font-bold text-center text-[color:var(--text-strong)] py-2">
                  ${amount}
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

              {/* Potential Win */}
              <div className="flex items-center justify-between px-2 py-3 bg-green-500/10 rounded-xl">
                <span className="text-sm text-[color:var(--text-muted)]">Potential Win</span>
                <span className="text-lg font-bold text-green-500">
                  ${amount > 0 ? Math.round(amount * (100 / selectedTeamData.odds)) : 0}
                </span>
              </div>

              {/* Place Bet Button */}
              <Button
                onClick={() => {
                  if (onBet && selectedTeam) {
                    onBet(selectedTeam, amount);
                  }
                  setIsOpen(false);
                  setAmount(0);
                }}
                disabled={amount === 0}
                className="w-full h-14 text-lg font-bold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white disabled:opacity-50"
              >
                {amount === 0 ? "Enter Amount" : `Bet $${amount} on ${selectedTeamData.abbr}`}
              </Button>

              <p className="text-xs text-center text-[color:var(--text-subtle)]">
                By betting, you agree to the Terms of Use
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
