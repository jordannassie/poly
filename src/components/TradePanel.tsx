"use client";

import { useMemo, useState } from "react";
import { Market } from "@/lib/mockData";
import { Button } from "./ui/button";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { addDemoBet } from "@/lib/demoAuth";
import { ChevronDown } from "lucide-react";

type TradePanelProps = {
  market: Market;
};

export function TradePanel({ market }: TradePanelProps) {
  const [side, setSide] = useState("buy");
  const [selectedOutcomeId, setSelectedOutcomeId] = useState(
    market.outcomes[0]?.id ?? "",
  );
  const [position, setPosition] = useState<"yes" | "no">("yes");
  const [amount, setAmount] = useState(0);
  const [tradeOpen, setTradeOpen] = useState(false);

  const selectedOutcome = useMemo(
    () => market.outcomes.find((outcome) => outcome.id === selectedOutcomeId),
    [market.outcomes, selectedOutcomeId],
  );

  const initials = selectedOutcome?.name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="rounded-2xl border border-white/10 bg-[#111a27] p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-[#1e2a3d] flex items-center justify-center text-xs font-semibold text-white/70">
          {initials}
        </div>
        <div>
          <div className="text-sm font-semibold text-white">
            {selectedOutcome?.name ?? "Select outcome"}
          </div>
          <div className="text-xs text-white/40">{market.title}</div>
        </div>
      </div>

      <Tabs value={side} onValueChange={setSide}>
        <TabsList className="grid grid-cols-2 bg-[#0b1320]">
          <TabsTrigger value="buy">Buy</TabsTrigger>
          <TabsTrigger value="sell">Sell</TabsTrigger>
        </TabsList>
      </Tabs>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            className="w-full justify-between bg-white/10 text-white"
          >
            Market
            <ChevronDown className="h-4 w-4 text-white/60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-[#0b1320] border-white/10 text-white">
          {market.outcomes.map((outcome) => (
            <DropdownMenuItem
              key={outcome.id}
              className="cursor-pointer focus:bg-white/10"
              onSelect={() => setSelectedOutcomeId(outcome.id)}
            >
              {outcome.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="grid grid-cols-2 gap-2">
        <Button
          className={`h-12 ${
            position === "yes"
              ? "bg-[#1b8f4b] hover:bg-[#21a357]"
              : "bg-white/10 hover:bg-white/20"
          } text-white`}
          onClick={() => setPosition("yes")}
        >
          YES {selectedOutcome?.yesPrice ?? "--"}¢
        </Button>
        <Button
          className={`h-12 ${
            position === "no"
              ? "bg-[#2d7ff9] hover:bg-[#3a8bff]"
              : "bg-white/10 hover:bg-white/20"
          } text-white`}
          onClick={() => setPosition("no")}
        >
          NO {selectedOutcome?.noPrice ?? "--"}¢
        </Button>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#0b1320] p-4 space-y-3">
        <div className="flex items-center justify-between text-sm text-white/60">
          <span>Amount</span>
          <span className="text-2xl text-white">
            ${amount.toLocaleString()}
          </span>
        </div>
        <Input
          type="number"
          min="0"
          value={amount === 0 ? "" : amount}
          onChange={(event) =>
            setAmount(Number(event.target.value || 0))
          }
          placeholder="Enter amount"
          className="bg-[#111a27] border-white/10 text-white placeholder:text-white/40"
        />
        <div className="grid grid-cols-4 gap-2 text-xs">
          {[1, 20, 100, 250].map((value, index) => (
            <button
              key={value}
              className="rounded-lg bg-white/10 py-2 text-white/70 hover:text-white hover:bg-white/20 transition"
              type="button"
              onClick={() =>
                setAmount(index === 3 ? 500 : amount + value)
              }
            >
              {index === 3 ? "Max" : `+$${value}`}
            </button>
          ))}
        </div>
      </div>

      <Button
        className="w-full bg-[#2d7ff9] hover:bg-[#3a8bff] text-white h-11"
        onClick={() => {
          if (!selectedOutcome) return;
          const price =
            position === "yes"
              ? selectedOutcome.yesPrice
              : selectedOutcome.noPrice;
          addDemoBet({
            id: `${market.slug}-${Date.now()}`,
            marketTitle: market.title,
            outcomeName: selectedOutcome.name,
            side: side === "sell" ? "sell" : "buy",
            position,
            price,
            amount: amount || 50,
            placedAt: new Date().toISOString(),
          });
          setTradeOpen(true);
        }}
      >
        Trade
      </Button>
      <div className="text-xs text-white/40 text-center">
        By trading, you agree to the Terms of Use.
      </div>

      <Dialog open={tradeOpen} onOpenChange={setTradeOpen}>
        <DialogContent className="bg-[#111a27] border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle>Trade placed</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-white/70">
            <div>
              {side === "sell" ? "Sell" : "Buy"} {position.toUpperCase()} on{" "}
              <span className="text-white">{selectedOutcome?.name}</span>
            </div>
            <div className="rounded-lg bg-[#0b1320] border border-white/10 p-3">
              <div className="flex justify-between">
                <span>Amount</span>
                <span className="text-white">
                  ${amount || 50}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Price</span>
                <span className="text-white">
                  {position === "yes"
                    ? selectedOutcome?.yesPrice
                    : selectedOutcome?.noPrice}
                  ¢
                </span>
              </div>
            </div>
            <Button
              asChild
              className="w-full bg-[#2d7ff9] hover:bg-[#3a8bff] text-white"
            >
              <Link href="/account">View account</Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
