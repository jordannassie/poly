"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Loader2 } from "lucide-react";
import {
  hasMetaMask,
  hasCoinbaseWallet,
  connectMetaMask,
  connectCoinbaseWallet,
  signMessage as signEvmMessage,
} from "@/lib/wallet/evm";
import { getLogoUrl } from "@/lib/images/getLogoUrl";

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

type WalletStatus = "idle" | "connecting" | "signing" | "verifying" | "success" | "error";

// MetaMask Fox Icon
function MetaMaskIcon({ className }: { className?: string }) {
  const src = getLogoUrl("crypto/MetaMask_Fox.svg.png");
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img 
      src={src || ""}
      alt="MetaMask" 
      className={className}
    />
  );
}

// Coinbase Icon
function CoinbaseIcon({ className }: { className?: string }) {
  const src = getLogoUrl("crypto/coinbase-logo-icon.webp");
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img 
      src={src || ""}
      alt="Coinbase" 
      className={className}
    />
  );
}

// Google Icon
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

// TikTok Icon
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" fill="currentColor"/>
    </svg>
  );
}

// Phantom Icon
function PhantomIcon({ className }: { className?: string }) {
  const src = getLogoUrl("crypto/favicon.svg");
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img 
      src={src || ""}
      alt="Phantom" 
      className={className}
    />
  );
}

export function AuthModal({
  open,
  onOpenChange,
  onSuccess,
}: AuthModalProps) {
  const [email, setEmail] = useState("");
  
  // Phantom state (existing)
  const [phantomStatus, setPhantomStatus] = useState<WalletStatus>("idle");
  const [phantomError, setPhantomError] = useState<string | null>(null);
  const [hasPhantom, setHasPhantom] = useState<boolean | null>(null);
  
  // EVM wallet state
  const [metamaskStatus, setMetamaskStatus] = useState<WalletStatus>("idle");
  const [metamaskError, setMetamaskError] = useState<string | null>(null);
  const [hasMetaMaskWallet, setHasMetaMaskWallet] = useState<boolean | null>(null);
  
  const [coinbaseStatus, setCoinbaseStatus] = useState<WalletStatus>("idle");
  const [coinbaseError, setCoinbaseError] = useState<string | null>(null);
  const [hasCoinbaseWalletInstalled, setHasCoinbaseWalletInstalled] = useState<boolean | null>(null);
  
  // OAuth state
  const [googleLoading, setGoogleLoading] = useState(false);
  const [tiktokLoading, setTiktokLoading] = useState(false);

  // Check for wallets on mount
  useEffect(() => {
    if (open) {
      const checkWallets = () => {
        setHasPhantom(!!window.solana?.isPhantom);
        setHasMetaMaskWallet(hasMetaMask());
        setHasCoinbaseWalletInstalled(hasCoinbaseWallet());
      };
      if (document.readyState === "complete") {
        checkWallets();
      } else {
        window.addEventListener("load", checkWallets);
        return () => window.removeEventListener("load", checkWallets);
      }
    }
  }, [open]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setPhantomStatus("idle");
      setPhantomError(null);
      setMetamaskStatus("idle");
      setMetamaskError(null);
      setCoinbaseStatus("idle");
      setCoinbaseError(null);
      setGoogleLoading(false);
      setTiktokLoading(false);
    }
  }, [open]);

  // PHANTOM LOGIN (existing - unchanged)
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

  // EVM WALLET LOGIN (MetaMask)
  const handleMetaMaskLogin = async () => {
    setMetamaskError(null);
    setMetamaskStatus("connecting");

    try {
      // Connect to MetaMask
      const { address } = await connectMetaMask();

      // Get nonce from server
      setMetamaskStatus("signing");
      const nonceRes = await fetch("/api/auth/evm/nonce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address }),
      });
      const nonceData = await nonceRes.json();

      if (!nonceRes.ok) {
        throw new Error(nonceData.details || nonceData.error || "Failed to get nonce");
      }

      // Sign the SIWE message
      const message = nonceData.message;
      const signature = await signEvmMessage(message);

      // Verify with server
      setMetamaskStatus("verifying");
      const verifyRes = await fetch("/api/auth/evm/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          signature,
          message,
          walletType: "metamask",
        }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        throw new Error(verifyData.error || "Failed to verify");
      }

      // Success!
      setMetamaskStatus("success");
      
      setTimeout(() => {
        onSuccess?.(`evm_${address.slice(2, 10)}@provepicks.local`);
        onOpenChange(false);
        window.location.href = "/";
      }, 1000);

    } catch (error) {
      console.error("MetaMask login error:", error);
      setMetamaskError(error instanceof Error ? error.message : "Connection failed");
      setMetamaskStatus("error");
    }
  };

  // EVM WALLET LOGIN (Coinbase Wallet)
  const handleCoinbaseLogin = async () => {
    setCoinbaseError(null);
    setCoinbaseStatus("connecting");

    try {
      // Connect to Coinbase Wallet
      const { address } = await connectCoinbaseWallet();

      // Get nonce from server
      setCoinbaseStatus("signing");
      const nonceRes = await fetch("/api/auth/evm/nonce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address }),
      });
      const nonceData = await nonceRes.json();

      if (!nonceRes.ok) {
        throw new Error(nonceData.details || nonceData.error || "Failed to get nonce");
      }

      // Sign the SIWE message
      const message = nonceData.message;
      const signature = await signEvmMessage(message);

      // Verify with server
      setCoinbaseStatus("verifying");
      const verifyRes = await fetch("/api/auth/evm/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          signature,
          message,
          walletType: "coinbase",
        }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        throw new Error(verifyData.error || "Failed to verify");
      }

      // Success!
      setCoinbaseStatus("success");
      
      setTimeout(() => {
        onSuccess?.(`evm_${address.slice(2, 10)}@provepicks.local`);
        onOpenChange(false);
        window.location.href = "/";
      }, 1000);

    } catch (error) {
      console.error("Coinbase Wallet login error:", error);
      setCoinbaseError(error instanceof Error ? error.message : "Connection failed");
      setCoinbaseStatus("error");
    }
  };

  // GOOGLE OAUTH
  const handleGoogleLogin = () => {
    setGoogleLoading(true);
    // Redirect to Google OAuth endpoint
    window.location.href = "/api/auth/google";
  };

  // TIKTOK OAUTH
  const handleTikTokLogin = () => {
    setTiktokLoading(true);
    // Redirect to TikTok OAuth endpoint
    window.location.href = "/api/auth/tiktok/authorize";
  };

  // Helper to render wallet button content
  const renderWalletButtonContent = (
    status: WalletStatus,
    icon: React.ReactNode,
    label: string
  ) => {
    if (status === "idle" || status === "error") {
      return (
        <>
          {icon}
          {label}
        </>
      );
    }
    if (status === "success") {
      return (
        <>
          <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Connected!
        </>
      );
    }
    return (
      <>
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {status === "connecting" && "Connecting..."}
        {status === "signing" && "Sign in wallet..."}
        {status === "verifying" && "Verifying..."}
      </>
    );
  };

  // Get any active error
  const activeError = phantomError || metamaskError || coinbaseError;
  
  // Check if any wallet is processing
  const isWalletProcessing = 
    (phantomStatus !== "idle" && phantomStatus !== "error") ||
    (metamaskStatus !== "idle" && metamaskStatus !== "error") ||
    (coinbaseStatus !== "idle" && coinbaseStatus !== "error");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1a1a1a] border-white/10 text-white max-w-sm">
        <DialogHeader className="text-center pb-2">
          <DialogTitle className="text-2xl font-bold">Sign in</DialogTitle>
          <p className="text-gray-400 text-sm">Choose how you want to continue</p>
        </DialogHeader>
        
        <div className="space-y-4 pt-2">
          {/* === PRIMARY: Google === */}
          <Button
            className="w-full h-12 bg-white hover:bg-gray-100 text-gray-800 font-medium rounded-xl"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <GoogleIcon className="mr-3 h-5 w-5" />
            )}
            Continue with Google
          </Button>

          {/* === SECONDARY: TikTok === */}
          <Button
            className="w-full h-12 bg-[#242424] hover:bg-[#2e2e2e] text-white font-medium rounded-xl border border-white/10"
            onClick={handleTikTokLogin}
            disabled={tiktokLoading}
          >
            {tiktokLoading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <TikTokIcon className="mr-3 h-5 w-5" />
            )}
            Continue with TikTok
          </Button>

          {/* === DIVIDER === */}
          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-[#242424]" />
            <span className="text-gray-500 text-xs">or use wallet</span>
            <div className="flex-1 h-px bg-[#242424]" />
          </div>

          {/* === WALLETS: Icon Row === */}
          <div className="flex justify-center gap-4">
            {/* Phantom */}
            <button
              onClick={handlePhantomLogin}
              disabled={isWalletProcessing}
              className="group flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-[#242424] transition-colors disabled:opacity-50"
              title="Phantom (Solana)"
            >
              <div className="w-12 h-12 rounded-full bg-[#8B7FD3] flex items-center justify-center overflow-hidden">
                {phantomStatus !== "idle" && phantomStatus !== "error" ? (
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                ) : (
                  <PhantomIcon className="h-8 w-8" />
                )}
              </div>
              <span className="text-xs text-gray-400 group-hover:text-white">Phantom</span>
            </button>

            {/* MetaMask */}
            <button
              onClick={handleMetaMaskLogin}
              disabled={isWalletProcessing}
              className="group flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-[#242424] transition-colors disabled:opacity-50"
              title="MetaMask (Ethereum)"
            >
              <div className="w-12 h-12 rounded-full bg-[#f6851b] flex items-center justify-center overflow-hidden">
                {metamaskStatus !== "idle" && metamaskStatus !== "error" ? (
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                ) : (
                  <MetaMaskIcon className="h-8 w-8" />
                )}
              </div>
              <span className="text-xs text-gray-400 group-hover:text-white">MetaMask</span>
            </button>

            {/* Coinbase */}
            <button
              onClick={handleCoinbaseLogin}
              disabled={isWalletProcessing}
              className="group flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-[#242424] transition-colors disabled:opacity-50"
              title="Coinbase Wallet (Ethereum)"
            >
              <div className="w-12 h-12 rounded-full bg-[#0052FF] flex items-center justify-center overflow-hidden">
                {coinbaseStatus !== "idle" && coinbaseStatus !== "error" ? (
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                ) : (
                  <CoinbaseIcon className="h-8 w-8" />
                )}
              </div>
              <span className="text-xs text-gray-400 group-hover:text-white">Coinbase</span>
            </button>
          </div>

          {/* Error display */}
          {activeError && (
            <p className="text-red-400 text-sm text-center bg-red-400/10 rounded-lg py-2 px-3">
              {activeError}
            </p>
          )}

          {/* === EMAIL (Collapsed/Minimal) === */}
          <div className="pt-2">
            <div className="flex gap-2">
              <Input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email address"
                className="flex-1 h-10 bg-[#242424] border-white/10 text-white placeholder:text-gray-500 rounded-lg"
              />
              <Button
                className="h-10 px-4 bg-[#3a3a5a] hover:bg-[#4a4a6a] text-white rounded-lg"
                onClick={() => {
                  if (email) {
                    onSuccess?.(email);
                    onOpenChange(false);
                  }
                }}
                disabled={!email}
              >
                Go
              </Button>
            </div>
          </div>
          
          {/* Footer */}
          <p className="text-gray-500 text-xs text-center pt-2">
            By continuing, you agree to our Terms & Privacy Policy
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
