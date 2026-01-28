import Link from "next/link";
import { Market } from "@/lib/mockData";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Flame, TrendingUp, Zap } from "lucide-react";
import { CountdownTimer } from "./CountdownTimer";

type MarketCardProps = {
  market: Market;
};

export function MarketCard({ market }: MarketCardProps) {
  const leadOutcome = market.outcomes[0];
  const initials = leadOutcome.name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isHot = leadOutcome.prob > 70;
  const isTrending = market.sparkline && market.sparkline[7] > market.sparkline[0];

  return (
    <Link href={`/market/${market.slug}`} className="block h-full group">
      <Card className="h-full bg-[color:var(--surface)] border-[color:var(--border-soft)] hover:border-[color:var(--border-strong)] transition-all hover:shadow-lg hover:shadow-[color:var(--accent)]/10 hover:-translate-y-1">
        <CardContent className="p-4 flex flex-col gap-4 relative">
          {isHot && (
            <div className="absolute -top-2 -right-2 flex items-center gap-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs px-2 py-1 rounded-full shadow-lg">
              <Flame className="h-3 w-3" />
              HOT
            </div>
          )}
          {isTrending && !isHot && (
            <div className="absolute -top-2 -right-2 flex items-center gap-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs px-2 py-1 rounded-full shadow-lg">
              <TrendingUp className="h-3 w-3" />
              UP
            </div>
          )}
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[color:var(--surface-3)] to-[color:var(--surface-2)] flex items-center justify-center text-xs font-semibold text-[color:var(--text-muted)] group-hover:scale-110 transition-transform">
              {initials}
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-[color:var(--text-strong)]">
                {market.title}
              </div>
              <div className="text-xs text-[color:var(--text-subtle)] flex items-center gap-1">
                {market.volume}
                <Zap className="h-3 w-3 text-yellow-500" />
              </div>
            </div>
            <div className="text-2xl font-bold bg-gradient-to-br from-[color:var(--text-strong)] to-[color:var(--text-muted)] bg-clip-text text-transparent">
              {leadOutcome.prob}%
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white h-9 text-xs font-semibold shadow-md shadow-green-500/20 transition-all hover:shadow-lg hover:shadow-green-500/30">
              Yes {leadOutcome.yesPrice}¢
            </Button>
            <Button className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white h-9 text-xs font-semibold shadow-md shadow-red-500/20 transition-all hover:shadow-lg hover:shadow-red-500/30">
              No {leadOutcome.noPrice}¢
            </Button>
          </div>
          <div className="h-10 rounded-lg bg-gradient-to-r from-[color:var(--surface-2)] to-[color:var(--surface-3)] border border-[color:var(--border-soft)] flex items-center justify-between px-3">
            <CountdownTimer endDate={market.endDate} variant="compact" />
            <div className="flex h-5 items-end gap-0.5">
              {market.sparkline?.map((point, index) => (
                <div
                  key={`${market.slug}-${index}`}
                  className="w-1.5 rounded-t-sm bg-gradient-to-t from-[color:var(--accent)] to-[color:var(--accent)]/40 transition-all group-hover:from-blue-500 group-hover:to-purple-500"
                  style={{ height: `${Math.max(8, point / 2)}px` }}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
