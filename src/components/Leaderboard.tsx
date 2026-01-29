"use client";

import Link from "next/link";
import { leaderboard } from "@/lib/mockData";
import { Card, CardContent } from "./ui/card";
import { Trophy } from "lucide-react";

export function Leaderboard() {
  return (
    <Card className="bg-[color:var(--surface)] border-[color:var(--border-soft)] overflow-hidden">
      <div className="bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-red-500/20 p-4 border-b border-[color:var(--border-soft)]">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <span className="text-lg font-bold">Top Traders</span>
          <Link
            href="/leaderboard"
            className="ml-auto text-xs bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded-full hover:bg-yellow-500/30 transition"
          >
            View All
          </Link>
        </div>
      </div>
      <CardContent className="p-0">
        {leaderboard.slice(0, 5).map((trader, index) => (
          <Link
            key={trader.rank}
            href={`/u/${trader.name.toLowerCase()}`}
            className={`flex items-center gap-4 p-4 border-b border-[color:var(--border-soft)] last:border-b-0 hover:bg-[color:var(--surface-2)] transition cursor-pointer ${
              index === 0 ? "bg-gradient-to-r from-yellow-500/5 to-transparent" : ""
            }`}
          >
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${
                trader.rank === 1
                  ? "bg-gradient-to-br from-yellow-400 to-yellow-600 text-black"
                  : trader.rank === 2
                  ? "bg-gradient-to-br from-gray-300 to-gray-500 text-black"
                  : trader.rank === 3
                  ? "bg-gradient-to-br from-orange-400 to-orange-600 text-black"
                  : "bg-[color:var(--surface-3)] text-[color:var(--text-muted)]"
              }`}
            >
              {trader.rank}
            </div>
            <div className="flex-1">
              <div className="font-semibold text-sm hover:text-blue-500 transition">
                {trader.name}
              </div>
              <div className="text-xs text-[color:var(--text-subtle)]">
                {trader.volume}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-green-500">
                {trader.profit}
              </div>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
