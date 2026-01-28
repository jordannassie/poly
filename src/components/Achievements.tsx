"use client";

import { achievements } from "@/lib/mockData";
import { Card, CardContent } from "./ui/card";
import { Award, Target, Flame, Coins, Sunrise, Gem, Trophy } from "lucide-react";

const iconMap: Record<string, React.ReactNode> = {
  target: <Target className="h-6 w-6" />,
  flame: <Flame className="h-6 w-6" />,
  coins: <Coins className="h-6 w-6" />,
  sunrise: <Sunrise className="h-6 w-6" />,
  gem: <Gem className="h-6 w-6" />,
  trophy: <Trophy className="h-6 w-6" />,
};

export function Achievements() {
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <Card className="bg-[color:var(--surface)] border-[color:var(--border-soft)] overflow-hidden">
      <div className="bg-[color:var(--surface-2)] p-4 border-b border-[color:var(--border-soft)]">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-orange-500" />
          <span className="text-lg font-bold">Achievements</span>
          <span className="ml-auto text-xs bg-orange-500/20 text-orange-500 px-2 py-1 rounded-full">
            {unlockedCount}/{achievements.length}
          </span>
        </div>
      </div>
      <CardContent className="p-4">
        <div className="grid grid-cols-3 gap-3">
          {achievements.map((achievement) => (
            <div
              key={achievement.id}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition ${
                achievement.unlocked
                  ? "bg-[color:var(--surface-2)] border-orange-500/30"
                  : "bg-[color:var(--surface-2)] border-[color:var(--border-soft)] opacity-50"
              }`}
            >
              <div className={achievement.unlocked ? "text-orange-500" : "text-[color:var(--text-muted)]"}>
                {iconMap[achievement.icon] || <Award className="h-6 w-6" />}
              </div>
              <span className="text-xs text-center font-medium">
                {achievement.label}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
