"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Wallet,
  Sparkles,
  ShieldCheck,
  KeyRound,
  Mail,
} from "lucide-react";

type AuthModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (email?: string) => void;
};

const walletActions = [
  { id: "wallet", icon: Wallet },
  { id: "spark", icon: Sparkles },
  { id: "shield", icon: ShieldCheck },
  { id: "key", icon: KeyRound },
];

export function AuthModal({
  open,
  onOpenChange,
  onSuccess,
}: AuthModalProps) {
  const [email, setEmail] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[color:var(--surface)] border-[color:var(--border-soft)] text-[color:var(--text-strong)] max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Welcome to ProvePicks</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Button
            className="w-full bg-[color:var(--accent)] hover:bg-[color:var(--accent-strong)] text-white"
            onClick={() => {
              onSuccess?.("demo@provepicks.com");
              onOpenChange(false);
            }}
          >
            <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--surface-3)] text-[color:var(--text-strong)]">
              G
            </span>
            Continue with Google
          </Button>
          <div className="text-center text-xs uppercase text-[color:var(--text-subtle)]">
            or
          </div>
          <div className="space-y-2">
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-[color:var(--text-subtle)]" />
              <Input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email address"
                className="pl-9 bg-[color:var(--surface-2)] border-[color:var(--border-soft)] text-[color:var(--text-strong)] placeholder:text-[color:var(--text-subtle)]"
              />
            </div>
            <Button
              className="w-full bg-[color:var(--surface-2)] hover:bg-[color:var(--surface-3)] text-[color:var(--text-strong)]"
              onClick={() => {
                onSuccess?.(email);
                onOpenChange(false);
              }}
            >
              Continue
            </Button>
          </div>
          <div className="grid grid-cols-4 gap-3 pt-2">
            {walletActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  className="flex h-11 items-center justify-center rounded-lg bg-[color:var(--surface-2)] border border-[color:var(--border-soft)] text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)] hover:bg-[color:var(--surface-3)] transition"
                  type="button"
                >
                  <Icon className="h-5 w-5" />
                </button>
              );
            })}
          </div>
          <div className="text-xs text-[color:var(--text-subtle)] text-center">
            By trading, you agree to the Terms • Privacy
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
