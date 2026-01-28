import Link from "next/link";
import { Market } from "@/lib/mockData";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";

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

  return (
    <Link href={`/market/${market.slug}`} className="block h-full">
      <Card className="h-full bg-[color:var(--surface)] border-[color:var(--border-soft)] hover:border-[color:var(--border-strong)] transition">
        <CardContent className="p-4 flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-[color:var(--surface-3)] flex items-center justify-center text-xs font-semibold text-[color:var(--text-muted)]">
              {initials}
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-[color:var(--text-strong)]">
                {market.title}
              </div>
              <div className="text-xs text-[color:var(--text-subtle)]">
                {market.volume}
              </div>
            </div>
            <div className="text-2xl font-semibold text-[color:var(--text-strong)]">
              {leadOutcome.prob}%
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button className="flex-1 bg-[color:var(--yes)] hover:bg-[color:var(--yes-strong)] text-white h-8 text-xs">
              Buy Yes {leadOutcome.yesPrice}¢
            </Button>
            <Button
              variant="secondary"
              className="flex-1 bg-[color:var(--surface-2)] hover:bg-[color:var(--surface-3)] text-[color:var(--text-strong)] h-8 text-xs"
            >
              Buy No {leadOutcome.noPrice}¢
            </Button>
          </div>
          <div className="h-8 rounded-md bg-[color:var(--surface-2)] border border-[color:var(--border-soft)] flex items-center justify-between px-2">
            <span className="text-xs text-[color:var(--text-subtle)]">
              {market.endDate}
            </span>
            <div className="flex h-4 items-end gap-1">
              {market.sparkline?.map((point, index) => (
                <div
                  key={`${market.slug}-${index}`}
                  className="w-1 rounded-sm bg-[color:var(--accent)]/60"
                  style={{ height: `${Math.max(6, point / 2)}px` }}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
