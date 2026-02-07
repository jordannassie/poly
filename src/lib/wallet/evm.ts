/**
 * EVM Wallet Connector Module
 * 
 * Provides wallet connection functionality for EVM-compatible wallets:
 * - MetaMask
 * - Coinbase Wallet
 * 
 * Uses wagmi + viem + @wagmi/connectors for connection management.
 * Client-side only - no custody.
 */

"use client";

// Type definitions for EVM provider (injected by browser extensions)
interface EthereumProvider {
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, callback: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, callback: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export interface EvmConnectionResult {
  address: string;
  chainId: number;
}

export type EvmWalletType = "metamask" | "coinbase";

/**
 * Check if MetaMask is installed
 */
export function hasMetaMask(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window.ethereum?.isMetaMask);
}

/**
 * Check if Coinbase Wallet is installed
 */
export function hasCoinbaseWallet(): boolean {
  if (typeof window === "undefined") return false;
  // Coinbase Wallet injects as window.ethereum with isCoinbaseWallet flag
  // or as window.coinbaseWalletExtension
  return !!(
    window.ethereum?.isCoinbaseWallet ||
    (window as unknown as { coinbaseWalletExtension?: unknown }).coinbaseWalletExtension
  );
}

/**
 * Check if any EVM wallet is available
 */
export function hasEvmWallet(): boolean {
  if (typeof window === "undefined") return false;
  return !!window.ethereum;
}

/**
 * Get the current connected EVM address (if any)
 */
export async function getEvmAddress(): Promise<string | null> {
  if (typeof window === "undefined" || !window.ethereum) return null;
  
  try {
    const accounts = await window.ethereum.request({
      method: "eth_accounts",
    }) as string[];
    return accounts[0] || null;
  } catch {
    return null;
  }
}

/**
 * Get the current chain ID
 */
export async function getChainId(): Promise<number | null> {
  if (typeof window === "undefined" || !window.ethereum) return null;
  
  try {
    const chainIdHex = await window.ethereum.request({
      method: "eth_chainId",
    }) as string;
    return parseInt(chainIdHex, 16);
  } catch {
    return null;
  }
}

/**
 * Connect to MetaMask
 */
export async function connectMetaMask(): Promise<EvmConnectionResult> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask is not installed");
  }

  if (!window.ethereum.isMetaMask) {
    throw new Error("MetaMask is not the active provider");
  }

  try {
    // Request account access
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    }) as string[];

    if (!accounts || accounts.length === 0) {
      throw new Error("No accounts returned from MetaMask");
    }

    // Get chain ID
    const chainIdHex = await window.ethereum.request({
      method: "eth_chainId",
    }) as string;
    const chainId = parseInt(chainIdHex, 16);

    return {
      address: accounts[0],
      chainId,
    };
  } catch (error) {
    if ((error as { code?: number }).code === 4001) {
      throw new Error("Connection rejected by user");
    }
    throw error;
  }
}

/**
 * Connect to Coinbase Wallet
 */
export async function connectCoinbaseWallet(): Promise<EvmConnectionResult> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("Coinbase Wallet is not installed");
  }

  try {
    // Request account access - Coinbase Wallet also uses window.ethereum
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    }) as string[];

    if (!accounts || accounts.length === 0) {
      throw new Error("No accounts returned from Coinbase Wallet");
    }

    // Get chain ID
    const chainIdHex = await window.ethereum.request({
      method: "eth_chainId",
    }) as string;
    const chainId = parseInt(chainIdHex, 16);

    return {
      address: accounts[0],
      chainId,
    };
  } catch (error) {
    if ((error as { code?: number }).code === 4001) {
      throw new Error("Connection rejected by user");
    }
    throw error;
  }
}

/**
 * Disconnect EVM wallet (clears local state, doesn't revoke permissions)
 */
export function disconnectEvm(): void {
  // EVM wallets don't have a disconnect method
  // Permissions are managed in the wallet extension itself
  // This is a placeholder for clearing any app-level state
}

/**
 * Sign a message with the connected EVM wallet
 */
export async function signMessage(message: string): Promise<string> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No EVM wallet connected");
  }

  const accounts = await window.ethereum.request({
    method: "eth_accounts",
  }) as string[];

  if (!accounts || accounts.length === 0) {
    throw new Error("No account connected");
  }

  const signature = await window.ethereum.request({
    method: "personal_sign",
    params: [message, accounts[0]],
  }) as string;

  return signature;
}

/**
 * Get wallet display info
 */
export function getWalletInfo(walletType: EvmWalletType): {
  name: string;
  installUrl: string;
} {
  switch (walletType) {
    case "metamask":
      return {
        name: "MetaMask",
        installUrl: "https://metamask.io/download/",
      };
    case "coinbase":
      return {
        name: "Coinbase Wallet",
        installUrl: "https://www.coinbase.com/wallet",
      };
  }
}
