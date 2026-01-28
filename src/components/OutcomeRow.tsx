import { MarketOutcome } from "@/lib/mockData";
import { Button } from "./ui/button";

type OutcomeRowProps = {
  outcome: MarketOutcome;
};

export function OutcomeRow({ outcome }: OutcomeRowProps) {
  const initials = outcome.name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-[color:var(--surface)] border border-[color:var(--border-soft)] p-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-[color:var(--surface-3)] flex items-center justify-center text-xs font-semibold text-[color:var(--text-muted)]">
          {initials}
        </div>
        <div>
          <div className="text-sm font-semibold text-[color:var(--text-strong)]">
            {outcome.name}
          </div>
          <div className="text-xs text-[color:var(--text-subtle)]">
            {outcome.volume}
          </div>
        </div>
      </div>
      <div className="text-2xl font-semibold text-[color:var(--text-strong)]">
        {outcome.prob}%
      </div>
      <div className="flex items-center gap-2">
        <Button className="bg-green-600 hover:bg-green-700 text-white h-9 text-xs font-semibold">
          Buy Yes {outcome.yesPrice}¢
        </Button>
        <Button className="bg-red-600 hover:bg-red-700 text-white h-9 text-xs font-semibold">
          Buy No {outcome.noPrice}¢
        </Button>
      </div>
    </div>
  );
}
