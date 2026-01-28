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
    <div className="flex items-center justify-between gap-4 rounded-xl bg-[#111a27] border border-white/5 p-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-[#1e2a3d] flex items-center justify-center text-xs font-semibold text-white/70">
          {initials}
        </div>
        <div>
          <div className="text-sm font-semibold text-white">{outcome.name}</div>
          <div className="text-xs text-white/50">{outcome.volume}</div>
        </div>
      </div>
      <div className="text-2xl font-semibold text-white">
        {outcome.prob}%
      </div>
      <div className="flex items-center gap-2">
        <Button className="bg-[#1b8f4b] hover:bg-[#21a357] text-white h-9 text-xs">
          Buy Yes {outcome.yesPrice}¢
        </Button>
        <Button
          variant="secondary"
          className="bg-white/10 hover:bg-white/20 text-white h-9 text-xs"
        >
          Buy No {outcome.noPrice}¢
        </Button>
      </div>
    </div>
  );
}
