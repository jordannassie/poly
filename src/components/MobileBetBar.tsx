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
          {/* Quick Bet Buttons - Green for Yes, Red for No */}
          <div className="flex gap-2">
            <Button
              onClick={() => handleTeamSelect("team1")}
              className="flex-1 h-12 text-white font-bold text-base shadow-lg bg-green-600 hover:bg-green-700"
            >
              Yes {team1.odds}¢
            </Button>
            <Button
              onClick={() => handleTeamSelect("team2")}
              className="flex-1 h-12 text-white font-bold text-base shadow-lg bg-red-600 hover:bg-red-700"
            >
              No {team2.odds}¢
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
              {/* Yes/No Selection */}
              <div className="flex gap-2">
                <Button
                  onClick={() => setSelectedTeam("team1")}
                  className={`flex-1 h-14 font-bold text-lg transition-all text-white ${
                    selectedTeam === "team1" 
                      ? "bg-green-600 ring-2 ring-green-400 ring-offset-2 ring-offset-[color:var(--surface)]" 
                      : "bg-green-600/60"
                  }`}
                >
                  Yes {team1.odds}¢
                </Button>
                <Button
                  onClick={() => setSelectedTeam("team2")}
                  className={`flex-1 h-14 font-bold text-lg transition-all text-white ${
                    selectedTeam === "team2" 
                      ? "bg-red-600 ring-2 ring-red-400 ring-offset-2 ring-offset-[color:var(--surface)]" 
                      : "bg-red-600/60"
                  }`}
                >
                  No {team2.odds}¢
                </Button>
              </div>

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
                className={`w-full h-14 text-lg font-bold text-white disabled:opacity-50 ${
                  selectedTeam === "team1" 
                    ? "bg-green-600 hover:bg-green-700" 
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {amount === 0 ? "Enter Amount" : `Bet $${amount} ${selectedTeam === "team1" ? "Yes" : "No"}`}
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
