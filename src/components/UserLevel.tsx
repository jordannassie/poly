"use client";

import { Card, CardContent } from "./ui/card";
import { Zap, TrendingUp, Target } from "lucide-react";

type UserLevelProps = {
  name?: string;
};

export function UserLevel({ name = "Demo Trader" }: UserLevelProps) {
  const level = 7;
  const xp = 2840;
  const xpToNext = 3500;
  const progress = (xp / xpToNext) * 100;

  return (
    <Card className="bg-gradient-to-br from-[color:var(--surface)] to-[color:var(--surface-2)] border-[color:var(--border-soft)] overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5" />
      <CardContent className="p-4 relative">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
              {level}
            </div>
            <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
              <Zap className="h-3 w-3 text-black" />
            </div>
          </div>
          <div className="flex-1">
            <div className="font-bold text-lg">{name}</div>
            <div className="text-xs text-[color:var(--text-subtle)]">
              Level {level} Trader
            </div>
            <div className="mt-2 h-2 rounded-full bg-[color:var(--surface-3)] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-1 text-xs text-[color:var(--text-subtle)]">
              {xp.toLocaleString()} / {xpToNext.toLocaleString()} XP
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="text-center p-2 rounded-lg bg-[color:var(--surface-2)]">
            <TrendingUp className="h-4 w-4 mx-auto text-green-500" />
            <div className="text-sm font-bold mt-1">68%</div>
            <div className="text-xs text-[color:var(--text-subtle)]">Win Rate</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-[color:var(--surface-2)]">
            <Target className="h-4 w-4 mx-auto text-blue-500" />
            <div className="text-sm font-bold mt-1">42</div>
            <div className="text-xs text-[color:var(--text-subtle)]">Bets</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-[color:var(--surface-2)]">
            <Zap className="h-4 w-4 mx-auto text-orange-500" />
            <div className="text-sm font-bold mt-1">3</div>
            <div className="text-xs text-[color:var(--text-subtle)]">Streak</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
