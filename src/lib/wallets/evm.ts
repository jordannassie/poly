/**
 * EVM Wallet Connection (MetaMask + Coinbase Wallet)
 * Uses window.ethereum provider
 */

export interface EVMWallet {
  address: string;
  provider: "metamask" | "coinbase";
  chainId: number;
}

export async function connectMetaMask(): Promise<EVMWallet | null> {
  if (typeof window === "undefined") return null;
  
  const ethereum = (window as any).ethereum;
  if (!ethereum) {
    throw new Error("MetaMask not installed");
  }

  if (!ethereum.isMetaMask) {
    throw new Error("Please use MetaMask");
  }

  try {
    const accounts = await ethereum.request({ method: "eth_requestAccounts" });
    const chainId = await ethereum.request({ method: "eth_chainId" });
    
    return {
      address: accounts[0],
      provider: "metamask",
      chainId: parseInt(chainId, 16),
    };
  } catch (error) {
    console.error("MetaMask connection error:", error);
    throw error;
  }
}

export async function connectCoinbase(): Promise<EVMWallet | null> {
  if (typeof window === "undefined") return null;
  
  const ethereum = (window as any).ethereum;
  if (!ethereum) {
    throw new Error("Coinbase Wallet not installed");
  }

  if (!ethereum.isCoinbaseWallet) {
    throw new Error("Please use Coinbase Wallet");
  }

  try {
    const accounts = await ethereum.request({ method: "eth_requestAccounts" });
    const chainId = await ethereum.request({ method: "eth_chainId" });
    
    return {
      address: accounts[0],
      provider: "coinbase",
      chainId: parseInt(chainId, 16),
    };
  } catch (error) {
    console.error("Coinbase Wallet connection error:", error);
    throw error;
  }
}

export async function signMessage(message: string): Promise<string> {
  if (typeof window === "undefined") throw new Error("Window not available");
  
  const ethereum = (window as any).ethereum;
  if (!ethereum) throw new Error("Wallet not found");

  const accounts = await ethereum.request({ method: "eth_accounts" });
  if (!accounts || accounts.length === 0) {
    throw new Error("No connected accounts");
  }

  const signature = await ethereum.request({
    method: "personal_sign",
    params: [message, accounts[0]],
  });

  return signature;
}

export function isMetaMaskInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as any).ethereum?.isMetaMask;
}

export function isCoinbaseInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as any).ethereum?.isCoinbaseWallet;
}

export async function disconnectEVM(): Promise<void> {
  // EVM wallets don't have a programmatic disconnect
  // User must disconnect through the wallet extension
  return;
}
