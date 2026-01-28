"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";

type HowItWorksModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSignIn?: () => void;
};

const steps = [
  {
    title: "1. Pick a Polymarket",
    description:
      "Buy Yes or No shares depending on your prediction. Odds move in real time.",
    tag: "Pick",
  },
  {
    title: "2. Place a Bet",
    description:
      "Fund with crypto, card, or bank transfer. No bet limits and no fees.",
    tag: "Bet",
  },
  {
    title: "3. Profit",
    description:
      "Sell your shares any time or redeem at $1 if your outcome wins.",
    tag: "Profit",
  },
];

export function HowItWorksModal({
  open,
  onOpenChange,
  onSignIn,
}: HowItWorksModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[color:var(--surface)] border-[color:var(--border-soft)] text-[color:var(--text-strong)] max-w-lg">
        <DialogHeader>
          <DialogTitle>How it works</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {steps.map((step) => (
            <div
              key={step.title}
              className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] p-4"
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">{step.title}</div>
                <span className="rounded-full bg-[color:var(--surface-3)] px-3 py-1 text-xs text-[color:var(--text-muted)]">
                  {step.tag}
                </span>
              </div>
              <div className="mt-2 text-sm text-[color:var(--text-muted)]">
                {step.description}
              </div>
            </div>
          ))}
          <Button
            className="w-full bg-[color:var(--accent)] hover:bg-[color:var(--accent-strong)] text-white"
            onClick={() => {
              onOpenChange(false);
              onSignIn?.();
            }}
          >
            Sign in to get started
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
