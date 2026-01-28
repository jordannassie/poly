"use client";

import { achievements } from "@/lib/mockData";
import { Card, CardContent } from "./ui/card";
import { Award } from "lucide-react";

export function Achievements() {
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <Card className="bg-[color:var(--surface)] border-[color:var(--border-soft)] overflow-hidden">
      <div className="bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-purple-500/20 p-4 border-b border-[color:var(--border-soft)]">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-purple-500" />
          <span className="text-lg font-bold">Achievements</span>
          <span className="ml-auto text-xs bg-purple-500/20 text-purple-500 px-2 py-1 rounded-full">
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
                  ? "bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30"
                  : "bg-[color:var(--surface-2)] border-[color:var(--border-soft)] opacity-50"
              }`}
            >
              <span className="text-2xl">{achievement.icon}</span>
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
