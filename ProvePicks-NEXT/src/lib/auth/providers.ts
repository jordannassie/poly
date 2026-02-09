/**
 * Auth Provider Configuration
 * 
 * Configuration and utilities for each authentication provider.
 */

import { AuthProvider } from "./index";

export interface ProviderConfig {
  id: AuthProvider;
  name: string;
  description: string;
  iconType: "wallet" | "social";
  color: string;
  hoverColor: string;
  chainHint?: string;
  installUrl?: string;
}

export const authProviders: Record<AuthProvider, ProviderConfig> = {
  phantom: {
    id: "phantom",
    name: "Phantom",
    description: "Solana wallet",
    iconType: "wallet",
    color: "bg-purple-600",
    hoverColor: "hover:bg-purple-700",
    chainHint: "Solana",
    installUrl: "https://phantom.app/",
  },
  metamask: {
    id: "metamask",
    name: "MetaMask",
    description: "Popular EVM wallet",
    iconType: "wallet",
    color: "bg-orange-500",
    hoverColor: "hover:bg-orange-600",
    chainHint: "Ethereum / EVM",
    installUrl: "https://metamask.io/download/",
  },
  coinbase: {
    id: "coinbase",
    name: "Coinbase Wallet",
    description: "Coinbase's EVM wallet",
    iconType: "wallet",
    color: "bg-blue-600",
    hoverColor: "hover:bg-blue-700",
    chainHint: "Ethereum / EVM",
    installUrl: "https://www.coinbase.com/wallet",
  },
  google: {
    id: "google",
    name: "Google",
    description: "Sign in with Google",
    iconType: "social",
    color: "bg-white",
    hoverColor: "hover:bg-gray-100",
  },
  tiktok: {
    id: "tiktok",
    name: "TikTok",
    description: "Sign in with TikTok",
    iconType: "social",
    color: "bg-black",
    hoverColor: "hover:bg-gray-900",
  },
};

/**
 * Get OAuth redirect URL for a provider
 */
export function getOAuthRedirectUrl(provider: "google" | "tiktok"): string {
  const baseUrl = typeof window !== "undefined" 
    ? window.location.origin 
    : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  
  if (provider === "google") {
    // Google OAuth is handled by Supabase
    return `${baseUrl}/api/auth/callback`;
  }
  
  // TikTok uses custom callback
  return `${baseUrl}/api/auth/tiktok/callback`;
}

/**
 * Generate a random state parameter for OAuth
 */
export function generateOAuthState(): string {
  const array = new Uint8Array(32);
  if (typeof window !== "undefined") {
    crypto.getRandomValues(array);
  }
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
