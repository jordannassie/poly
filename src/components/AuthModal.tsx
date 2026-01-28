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
      <DialogContent className="bg-[#111a27] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Welcome to Polymarket</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Button
            className="w-full bg-[#2d7ff9] hover:bg-[#3a8bff] text-white"
            onClick={() => {
              onSuccess?.("demo@polymarket.com");
              onOpenChange(false);
            }}
          >
            <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/10">
              G
            </span>
            Continue with Google
          </Button>
          <div className="text-center text-xs uppercase text-white/40">
            or
          </div>
          <div className="space-y-2">
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-white/40" />
              <Input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email address"
                className="pl-9 bg-[#0b1320] border-white/10 text-white placeholder:text-white/40"
              />
            </div>
            <Button
              className="w-full bg-white/10 hover:bg-white/20 text-white"
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
                  className="flex h-11 items-center justify-center rounded-lg bg-[#0b1320] border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition"
                  type="button"
                >
                  <Icon className="h-5 w-5" />
                </button>
              );
            })}
          </div>
          <div className="text-xs text-white/40 text-center">
            By trading, you agree to the Terms • Privacy
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
