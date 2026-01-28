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
      <Card className="h-full bg-[#111a27] border-white/5 hover:border-white/15 transition">
        <CardContent className="p-4 flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-[#1e2a3d] flex items-center justify-center text-xs font-semibold text-white/70">
              {initials}
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-white">
                {market.title}
              </div>
              <div className="text-xs text-white/50">{market.volume}</div>
            </div>
            <div className="text-2xl font-semibold text-white">
              {leadOutcome.prob}%
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button className="flex-1 bg-[#1b8f4b] hover:bg-[#21a357] text-white h-8 text-xs">
              Buy Yes {leadOutcome.yesPrice}¢
            </Button>
            <Button
              variant="secondary"
              className="flex-1 bg-white/10 hover:bg-white/20 text-white h-8 text-xs"
            >
              Buy No {leadOutcome.noPrice}¢
            </Button>
          </div>
          <div className="h-8 rounded-md bg-[#0b1320] border border-white/5 flex items-center justify-between px-2">
            <span className="text-xs text-white/40">{market.endDate}</span>
            <div className="flex h-4 items-end gap-1">
              {market.sparkline?.map((point, index) => (
                <div
                  key={`${market.slug}-${index}`}
                  className="w-1 rounded-sm bg-[#2d7ff9]/60"
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
