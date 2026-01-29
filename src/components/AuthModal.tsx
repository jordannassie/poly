"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Wallet,
  Sparkles,
  ShieldCheck,
  KeyRound,
  Mail,
  Loader2,
} from "lucide-react";

// Phantom wallet types
interface PhantomProvider {
  isPhantom?: boolean;
  connect: () => Promise<{ publicKey: { toString: () => string } }>;
  disconnect: () => Promise<void>;
  signMessage: (message: Uint8Array, encoding: string) => Promise<{ signature: Uint8Array }>;
  publicKey?: { toString: () => string };
  isConnected?: boolean;
}

declare global {
  interface Window {
    solana?: PhantomProvider;
  }
}

type AuthModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (email?: string) => void;
};

const walletActions = [
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
  const [phantomStatus, setPhantomStatus] = useState<"idle" | "connecting" | "signing" | "verifying" | "success" | "error">("idle");
  const [phantomError, setPhantomError] = useState<string | null>(null);
  const [hasPhantom, setHasPhantom] = useState<boolean | null>(null);

  // Check for Phantom on mount
  useEffect(() => {
    if (open) {
      const checkPhantom = () => {
        setHasPhantom(!!window.solana?.isPhantom);
      };
      if (document.readyState === "complete") {
        checkPhantom();
      } else {
        window.addEventListener("load", checkPhantom);
        return () => window.removeEventListener("load", checkPhantom);
      }
    }
  }, [open]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setPhantomStatus("idle");
      setPhantomError(null);
    }
  }, [open]);

  const handlePhantomLogin = async () => {
    setPhantomError(null);
    setPhantomStatus("connecting");

    try {
      const provider = window.solana;
      if (!provider?.isPhantom) {
        setPhantomError("Phantom wallet not detected");
        setPhantomStatus("error");
        return;
      }

      // Connect to Phantom
      const response = await provider.connect();
      const walletAddress = response.publicKey.toString();

      // Get nonce from server (wallet-first auth endpoint)
      setPhantomStatus("signing");
      const nonceRes = await fetch("/api/auth/phantom/nonce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress }),
      });
      const nonceData = await nonceRes.json();

      if (!nonceRes.ok) {
        // Show details in dev mode for debugging
        const errorMsg = nonceData.error === "NONCE_ERROR" 
          ? (process.env.NODE_ENV === "development" && nonceData.details 
              ? `Nonce error: ${nonceData.details}` 
              : "Failed to generate login nonce")
          : (nonceData.error || "Failed to get nonce");
        throw new Error(errorMsg);
      }

      // Sign the message
      const message = nonceData.message;
      const encodedMessage = new TextEncoder().encode(message);
      const signedMessage = await provider.signMessage(encodedMessage, "utf8");

      // Convert signature to base58
      const signatureArray = Array.from(signedMessage.signature);
      const bs58Chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
      let signatureBase58 = "";
      let num = BigInt(0);
      for (const byte of signatureArray) {
        num = num * BigInt(256) + BigInt(byte);
      }
      while (num > 0) {
        signatureBase58 = bs58Chars[Number(num % BigInt(58))] + signatureBase58;
        num = num / BigInt(58);
      }
      for (const byte of signatureArray) {
        if (byte === 0) signatureBase58 = "1" + signatureBase58;
        else break;
      }

      // Verify with server
      setPhantomStatus("verifying");
      const verifyRes = await fetch("/api/auth/phantom/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress,
          signature: signatureBase58,
          message,
        }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        throw new Error(verifyData.error || "Failed to verify");
      }

      // Success!
      setPhantomStatus("success");
      
      // Call onSuccess with the wallet-generated email
      setTimeout(() => {
        onSuccess?.(`wallet_${walletAddress.slice(0, 8)}@provepicks.local`);
        onOpenChange(false);
        // Reload page to pick up new session
        window.location.href = "/";
      }, 1000);

    } catch (error) {
      console.error("Phantom login error:", error);
      setPhantomError(error instanceof Error ? error.message : "Connection failed");
      setPhantomStatus("error");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[color:var(--surface)] border-[color:var(--border-soft)] text-[color:var(--text-strong)] max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Welcome to ProvePicks</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Continue with Phantom */}
          <Button
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            onClick={handlePhantomLogin}
            disabled={phantomStatus !== "idle" && phantomStatus !== "error"}
          >
            {phantomStatus === "idle" || phantomStatus === "error" ? (
              <>
                <Wallet className="mr-2 h-5 w-5" />
                Continue with Phantom
              </>
            ) : phantomStatus === "success" ? (
              <>
                <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Connected!
              </>
            ) : (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {phantomStatus === "connecting" && "Connecting..."}
                {phantomStatus === "signing" && "Sign message in Phantom..."}
                {phantomStatus === "verifying" && "Verifying..."}
              </>
            )}
          </Button>
          
          {/* Phantom error message */}
          {phantomError && (
            <p className="text-red-400 text-sm text-center">{phantomError}</p>
          )}
          
          {/* Phantom not installed hint */}
          {hasPhantom === false && (
            <p className="text-xs text-center text-[color:var(--text-subtle)]">
              <a href="https://phantom.app/" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">
                Install Phantom
              </a>
              {" "}to login with your wallet
            </p>
          )}

          {/* Continue with Google */}
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
          
          <div className="grid grid-cols-3 gap-3 pt-2">
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
