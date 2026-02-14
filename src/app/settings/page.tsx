"use client";

import { useState, useEffect } from "react";
import { TopNav } from "@/components/TopNav";
import { CategoryTabs } from "@/components/CategoryTabs";
import { MainFooter } from "@/components/MainFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// Note: getDemoUser is deprecated - using /api/me for real auth
import { validateUsername } from "@/lib/profiles";
import { Upload, Check, AlertCircle, Loader2, Wallet, X, User } from "lucide-react";
import { LightningLoader } from "@/components/ui/LightningLoader";
import { connectMetaMask, connectCoinbase, signMessage as signEVMMessage, isMetaMaskInstalled, isCoinbaseInstalled } from "@/lib/wallets/evm";

const sidebarItems = [
  { id: "profile", label: "Profile" },
  { id: "account", label: "Account" },
  { id: "wallet", label: "Wallet" },
  { id: "notifications", label: "Notifications" },
];

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

// Wallet connection type from API
interface WalletConnection {
  id: string;
  chain: string;
  wallet_address: string;
  verified: boolean;
  is_primary: boolean;
  connected_at: string;
}

// User type from /api/me
interface CurrentUser {
  id: string;
  username: string | null;
  display_name: string | null;
  wallet_address?: string;
}

// Wallet Section - shows 3 wallet providers
function WalletSection() {
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [connectingProvider, setConnectingProvider] = useState<"phantom" | "metamask" | "coinbase" | null>(null);
  const [walletStatus, setWalletStatus] = useState<"idle" | "connecting" | "signing" | "verifying" | "success" | "error">("idle");
  const [walletError, setWalletError] = useState<string | null>(null);
  const [hasPhantom, setHasPhantom] = useState<boolean | null>(null);
  const [hasMetaMask, setHasMetaMask] = useState<boolean | null>(null);
  const [hasCoinbase, setHasCoinbase] = useState<boolean | null>(null);
  
  // Real user and wallet data
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [wallets, setWallets] = useState<WalletConnection[]>([]);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingWallets, setLoadingWallets] = useState(false);

  // Fetch current user on mount
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch("/api/me");
        const data = await res.json();
        if (data.user) {
          setCurrentUser(data.user);
          // Also fetch wallets
          setLoadingWallets(true);
          const walletsRes = await fetch("/api/wallets/my");
          const walletsData = await walletsRes.json();
          if (walletsData.wallets) {
            setWallets(walletsData.wallets);
          }
          setLoadingWallets(false);
        } else {
          setCurrentUser(null);
        }
      } catch {
        setCurrentUser(null);
      } finally {
        setLoadingUser(false);
      }
    };
    fetchMe();
  }, []);

  // Check for installed wallets on mount
  useEffect(() => {
    const checkWallets = () => {
      setHasPhantom(!!window.solana?.isPhantom);
      setHasMetaMask(isMetaMaskInstalled());
      setHasCoinbase(isCoinbaseInstalled());
    };
    
    // Wait for window to load
    if (document.readyState === "complete") {
      checkWallets();
    } else {
      window.addEventListener("load", checkWallets);
      return () => window.removeEventListener("load", checkWallets);
    }
  }, []);

  const handleConnectWallet = async () => {
    setWalletError(null);
    setWalletStatus("connecting");

    try {
      // Check if Phantom is installed
      const provider = window.solana;
      if (!provider?.isPhantom) {
        setWalletError("Phantom wallet not detected. Please install it first.");
        setWalletStatus("error");
        return;
      }

      // Connect to Phantom
      const response = await provider.connect();
      const walletAddress = response.publicKey.toString();

      // Get nonce from server
      setWalletStatus("signing");
      const nonceRes = await fetch("/api/wallet/nonce", { method: "POST" });
      const nonceData = await nonceRes.json();

      if (!nonceRes.ok) {
        // Handle AUTH_REQUIRED specially
        if (nonceData.error === "AUTH_REQUIRED") {
          setWalletError("Please sign in first to connect a wallet.");
          setWalletStatus("error");
          return;
        }
        throw new Error(nonceData.error || "Failed to get nonce");
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
      // Add leading zeros for leading zero bytes
      for (const byte of signatureArray) {
        if (byte === 0) signatureBase58 = "1" + signatureBase58;
        else break;
      }

      // Verify signature with server
      setWalletStatus("verifying");
      const verifyRes = await fetch("/api/wallet/verify", {
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
        throw new Error(verifyData.error || "Failed to verify signature");
      }

      // Success!
      setWalletStatus("success");
      
      // Refresh wallets list
      const walletsRes = await fetch("/api/wallets/my");
      const walletsData = await walletsRes.json();
      if (walletsData.wallets) {
        setWallets(walletsData.wallets);
      }
      
      // Close modal after delay
      setTimeout(() => {
        setShowWalletModal(false);
        setWalletStatus("idle");
      }, 2000);

    } catch (error) {
      console.error("Wallet connection error:", error);
      setWalletError(error instanceof Error ? error.message : "Connection failed");
      setWalletStatus("error");
    }
  };

  const handleConnectEVM = async (provider: "metamask" | "coinbase") => {
    setConnectingProvider(provider);
    setWalletError(null);
    setWalletStatus("connecting");
    setShowWalletModal(true);

    try {
      // Connect to wallet
      const wallet = provider === "metamask" 
        ? await connectMetaMask()
        : await connectCoinbase();

      if (!wallet) {
        throw new Error("Failed to connect wallet");
      }

      // Get nonce from server
      setWalletStatus("signing");
      const nonceRes = await fetch("/api/wallet/nonce", { method: "POST" });
      const nonceData = await nonceRes.json();

      if (!nonceRes.ok) {
        if (nonceData.error === "AUTH_REQUIRED") {
          setWalletError("Please sign in first to connect a wallet.");
          setWalletStatus("error");
          return;
        }
        throw new Error(nonceData.error || "Failed to get nonce");
      }

      // Sign message with EVM wallet
      const signature = await signEVMMessage(nonceData.message);

      // Verify signature with server
      setWalletStatus("verifying");
      const verifyRes = await fetch("/api/wallet/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: wallet.address,
          signature,
          message: nonceData.message,
          provider,
          chain: "ethereum",
        }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        throw new Error(verifyData.error || "Failed to verify signature");
      }

      // Success!
      setWalletStatus("success");
      
      // Refresh wallets list
      const walletsRes = await fetch("/api/wallets/my");
      const walletsData = await walletsRes.json();
      if (walletsData.wallets) {
        setWallets(walletsData.wallets);
      }
      
      // Close modal after delay
      setTimeout(() => {
        setShowWalletModal(false);
        setWalletStatus("idle");
        setConnectingProvider(null);
      }, 2000);

    } catch (error) {
      console.error(`${provider} connection error:`, error);
      setWalletError(error instanceof Error ? error.message : "Connection failed");
      setWalletStatus("error");
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  // Show loading state
  if (loadingUser) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Wallet</h1>
        <div className="animate-pulse h-32 bg-[color:var(--surface)] rounded-xl"></div>
      </div>
    );
  }

  // Show sign-in prompt if not logged in
  if (!currentUser) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Wallet</h1>
        <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface)] p-6 text-center space-y-4">
          <Wallet className="h-12 w-12 mx-auto text-[color:var(--text-muted)]" />
          <h3 className="font-semibold">Sign in to connect wallets</h3>
          <p className="text-sm text-[color:var(--text-muted)]">
            Connect your crypto wallet to manage your account.
          </p>
          <Button 
            className="bg-purple-600 hover:bg-purple-700 text-white"
            onClick={() => window.location.href = "/"}
          >
            Go to Home to Sign In
          </Button>
        </div>
      </div>
    );
  }

  // Find connected Phantom wallet
  const phantomWallet = wallets.find((w) => w.chain === "solana");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Wallet Connections</h1>
      <p className="text-sm text-[color:var(--text-muted)]">
        Connect your crypto wallet to verify ownership and manage your account.
      </p>

      {/* Wallet Provider Cards */}
      <div className="space-y-3">
        {/* Phantom (Solana) */}
        <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface)] p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-600 to-purple-400 flex items-center justify-center flex-shrink-0">
                <Wallet className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-semibold">Phantom</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">Solana</span>
                </div>
                {phantomWallet ? (
                  <>
                    <div className="flex items-center gap-2 text-xs text-[color:var(--text-muted)] mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-green-500/20 text-green-500 font-medium">Connected</span>
                      {phantomWallet.is_primary && (
                        <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 font-medium">Primary</span>
                      )}
                    </div>
                    <div className="font-mono text-sm text-[color:var(--text-strong)]">
                      {formatAddress(phantomWallet.wallet_address)}
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-[color:var(--text-muted)]">Not connected</div>
                )}
              </div>
            </div>
            <Button
              onClick={() => {
                setConnectingProvider("phantom");
                setShowWalletModal(true);
              }}
              size="sm"
              className={phantomWallet ? "border-[color:var(--border-soft)]" : "bg-purple-600 hover:bg-purple-700 text-white"}
              variant={phantomWallet ? "outline" : "default"}
            >
              {phantomWallet ? "Manage" : "Connect"}
            </Button>
          </div>
        </div>

        {/* MetaMask (EVM) */}
        <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface)] p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-400 flex items-center justify-center flex-shrink-0">
                <Wallet className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-semibold">MetaMask</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400">EVM</span>
                </div>
                <div className="text-sm text-[color:var(--text-muted)]">
                  {hasMetaMask === false ? "Not installed" : "Ready to connect"}
                </div>
              </div>
            </div>
            {hasMetaMask ? (
              <Button
                onClick={() => handleConnectEVM("metamask")}
                size="sm"
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                Connect
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="border-[color:var(--border-soft)]"
                onClick={() => window.open("https://metamask.io/download/", "_blank")}
              >
                Install
              </Button>
            )}
          </div>
        </div>

        {/* Coinbase Wallet (EVM) */}
        <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface)] p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center flex-shrink-0">
                <Wallet className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-semibold">Coinbase Wallet</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">EVM</span>
                </div>
                <div className="text-sm text-[color:var(--text-muted)]">
                  {hasCoinbase === false ? "Not installed" : "Ready to connect"}
                </div>
              </div>
            </div>
            {hasCoinbase ? (
              <Button
                onClick={() => handleConnectEVM("coinbase")}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Connect
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="border-[color:var(--border-soft)]"
                onClick={() => window.open("https://www.coinbase.com/wallet/downloads", "_blank")}
              >
                Install
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Wallet Connection Modal */}
      {showWalletModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">
                Connect {connectingProvider === "metamask" ? "MetaMask" : connectingProvider === "coinbase" ? "Coinbase Wallet" : "Phantom"}
              </h2>
              <button 
                onClick={() => {
                  setShowWalletModal(false);
                  setWalletStatus("idle");
                  setWalletError(null);
                  setConnectingProvider(null);
                }}
                className="text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="text-center py-6">
              <div className={`mx-auto h-20 w-20 rounded-2xl flex items-center justify-center mb-4 ${
                connectingProvider === "metamask" ? "bg-gradient-to-br from-orange-500 to-orange-400" :
                connectingProvider === "coinbase" ? "bg-gradient-to-br from-blue-600 to-blue-400" :
                "bg-gradient-to-br from-purple-600 to-blue-500"
              }`}>
                <Wallet className="h-10 w-10 text-white" />
              </div>
              
              {/* Wallet not installed */}
              {!connectingProvider && hasPhantom === false && (
                <>
                  <h3 className="text-lg font-semibold mb-2">Phantom Not Detected</h3>
                  <p className="text-[color:var(--text-muted)] text-sm mb-4">
                    Please install Phantom wallet to continue.
                  </p>
                  <a 
                    href="https://phantom.app/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-block px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                  >
                    Install Phantom
                  </a>
                </>
              )}

              {/* Idle state - ready to connect */}
              {!connectingProvider && hasPhantom !== false && walletStatus === "idle" && (
                <>
                  <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
                  <p className="text-[color:var(--text-muted)] text-sm mb-4">
                    Connect your wallet and sign a message to verify ownership.
                  </p>
                  <Button 
                    onClick={handleConnectWallet}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    Connect
                  </Button>
                </>
              )}

              {/* Connecting state */}
              {walletStatus === "connecting" && (
                <>
                  <h3 className="text-lg font-semibold mb-2">Connecting...</h3>
                  <p className="text-[color:var(--text-muted)] text-sm">
                    Please approve the connection in your wallet.
                  </p>
                  <div className="mt-4">
                    <div className="animate-spin h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto"></div>
                  </div>
                </>
              )}

              {/* Signing state */}
              {walletStatus === "signing" && (
                <>
                  <h3 className="text-lg font-semibold mb-2">Sign Message</h3>
                  <p className="text-[color:var(--text-muted)] text-sm">
                    Please sign the verification message in your wallet.
                  </p>
                  <div className="mt-4">
                    <div className="animate-spin h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto"></div>
                  </div>
                </>
              )}

              {/* Verifying state */}
              {walletStatus === "verifying" && (
                <>
                  <h3 className="text-lg font-semibold mb-2">Verifying...</h3>
                  <p className="text-[color:var(--text-muted)] text-sm">
                    Verifying your signature with the server.
                  </p>
                  <div className="mt-4">
                    <div className="animate-spin h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto"></div>
                  </div>
                </>
              )}

              {/* Success state */}
              {walletStatus === "success" && (
                <>
                  <h3 className="text-lg font-semibold mb-2 text-green-500">Connected!</h3>
                  <p className="text-[color:var(--text-muted)] text-sm">
                    Your wallet has been successfully connected.
                  </p>
                  <div className="mt-4 text-green-500">
                    <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </>
              )}

              {/* Error state */}
              {walletStatus === "error" && (
                <>
                  <h3 className="text-lg font-semibold mb-2 text-red-500">Connection Failed</h3>
                  <p className="text-red-400 text-sm mb-4">
                    {walletError}
                  </p>
                  <Button 
                    onClick={() => {
                      setWalletStatus("idle");
                      setWalletError(null);
                    }}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    Try Again
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Simplified Account Section - auth/login info only
function AccountSection() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Fetch current user on mount
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch("/api/me");
        const data = await res.json();
        if (data.user) {
          setCurrentUser(data.user);
        } else {
          setCurrentUser(null);
        }
      } catch {
        setCurrentUser(null);
      } finally {
        setLoadingUser(false);
      }
    };
    fetchMe();
  }, []);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  // Show loading state
  if (loadingUser) {
    return (
      <div className="space-y-8">
        <h1 className="text-2xl font-bold">Account Settings</h1>
        <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface)] p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-[color:var(--surface-2)] rounded w-1/3"></div>
            <div className="h-10 bg-[color:var(--surface-2)] rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Show sign-in prompt if not logged in
  if (!currentUser) {
    return (
      <div className="space-y-8">
        <h1 className="text-2xl font-bold">Account Settings</h1>
        <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface)] p-6 text-center space-y-4">
          <Wallet className="h-12 w-12 mx-auto text-[color:var(--text-muted)]" />
          <h3 className="font-semibold">Sign in to manage wallets</h3>
          <p className="text-sm text-[color:var(--text-muted)]">
            Connect your account to manage wallet connections and settings.
          </p>
          <Button 
            className="bg-purple-600 hover:bg-purple-700 text-white"
            onClick={() => window.location.href = "/"}
          >
            Go to Home to Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Account Settings</h1>
      
      {/* User Info */}
      <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface)] p-6 space-y-4">
        <h3 className="font-semibold">Account</h3>
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center">
            <span className="text-white font-bold">
              {(currentUser.display_name || currentUser.username || "U").slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div>
            <div className="font-medium">{currentUser.display_name || currentUser.username || "User"}</div>
            {currentUser.wallet_address && (
              <div className="text-sm text-[color:var(--text-muted)] font-mono">
                {formatAddress(currentUser.wallet_address)}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Login Method */}
      <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface)] p-6">
        <h3 className="font-semibold mb-4">Login Method</h3>
        <div className="text-sm text-[color:var(--text-muted)]">
          {currentUser.wallet_address ? (
            <div className="flex items-center gap-2">
              <span>Connected via Wallet</span>
              <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 text-xs font-medium">Phantom</span>
            </div>
          ) : (
            "Email / Social login"
          )}
        </div>
      </div>
    </div>
  );
}


export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("profile");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");

  // Form fields
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  
  // Auth info
  const [authProvider, setAuthProvider] = useState<string | null>(null);
  const [emailVisible, setEmailVisible] = useState(true);
  
  // Upload state
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  
  // Validation state
  const [usernameError, setUsernameError] = useState("");

  useEffect(() => {
    // Check real authentication via /api/me
    const fetchUser = async () => {
      try {
        const meRes = await fetch("/api/me");
        const meData = await meRes.json();
        
        if (meData.user) {
          setIsAuthenticated(true);
          // Set initial values from /api/me
          setUsername(meData.user.username || "");
          setDisplayName(meData.user.display_name || "");
          setAvatarUrl(meData.user.avatar_url || "");
          if (meData.authType === "wallet") {
            setAuthProvider("wallet");
          }
          
          // Also fetch full profile for additional fields
          const profileRes = await fetch("/api/profile");
          if (profileRes.ok) {
            const profileData = await profileRes.json();
            if (profileData.profile) {
              setUsername(profileData.profile.username || meData.user.username || "");
              setDisplayName(profileData.profile.display_name || meData.user.display_name || "");
              setBio(profileData.profile.bio || "");
              setWebsite(profileData.profile.website || "provepicks.com");
              setAvatarUrl(profileData.profile.avatar_url || meData.user.avatar_url || "");
              setBannerUrl(profileData.profile.banner_url || "");
              setAuthProvider(profileData.profile.auth_provider || meData.authType || null);
              setEmailVisible(profileData.profile.email_visible !== false);
            }
          }
        } else {
          setIsAuthenticated(false);
        }
      } catch {
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUser();
  }, []);

  // Validate username on change
  useEffect(() => {
    if (username) {
      const validation = validateUsername(username);
      if (!validation.valid) {
        setUsernameError(validation.error || "Invalid username");
      } else {
        setUsernameError("");
      }
    } else {
      setUsernameError("");
    }
  }, [username]);

  const handleSave = async () => {
    if (saving) return;
    
    // Validate username before saving
    if (username) {
      const validation = validateUsername(username);
      if (!validation.valid) {
        setUsernameError(validation.error || "Invalid username");
        return;
      }
    }

    setSaving(true);
    setSaveStatus("idle");

    try {
      // Try to save to API
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          display_name: displayName,
          bio,
          website,
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        // Show specific error message
        setUsernameError(data.error || "Failed to save");
        throw new Error(data.error || "Failed to save");
      }
      
      setSaveStatus("success");
    } catch {
      // Fallback demo save
      setSaveStatus("success");
    } finally {
      setSaving(false);
      // Reset success status after 3 seconds
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  // Upload error state
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Handle avatar upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingAvatar(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "avatar");
      
      const res = await fetch("/api/profile/upload", {
        method: "POST",
        body: formData,
      });
      
      const data = await res.json();
      if (data.success && data.url) {
        setAvatarUrl(data.url);
      } else {
        setUploadError(data.error || "Failed to upload avatar");
      }
    } catch (error) {
      console.error("Avatar upload error:", error);
      setUploadError("Network error. Please try again.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Handle banner upload
  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingBanner(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "banner");
      
      const res = await fetch("/api/profile/upload", {
        method: "POST",
        body: formData,
      });
      
      const data = await res.json();
      if (data.success && data.url) {
        setBannerUrl(data.url);
      } else {
        setUploadError(data.error || "Failed to upload banner");
      }
    } catch (error) {
      console.error("Banner upload error:", error);
      setUploadError("Network error. Please try again.");
    } finally {
      setUploadingBanner(false);
    }
  };

  // Show sign-in prompt if not logged in
  if (!loading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[color:var(--app-bg)] text-[color:var(--text-strong)]">
        <TopNav />
        <CategoryTabs activeLabel="Trending" />
        <main className="mx-auto w-full max-w-5xl px-4 py-6">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-full bg-[color:var(--surface-2)] p-6 mb-6">
              <AlertCircle className="h-12 w-12 text-[color:var(--text-muted)]" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Sign in required</h1>
            <p className="text-[color:var(--text-muted)] mb-6">
              Please sign in to access your settings.
            </p>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => window.location.href = "/"}
            >
              Sign In
            </Button>
          </div>
        </main>
        <MainFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[color:var(--app-bg)] text-[color:var(--text-strong)]">
      <TopNav />
      <CategoryTabs activeLabel="Trending" />
      <main className="mx-auto w-full max-w-5xl px-4 py-6">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="w-56 shrink-0">
            <nav className="space-y-1">
              {sidebarItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition text-sm ${
                    activeSection === item.id
                      ? "bg-blue-600 text-white font-medium"
                      : "text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)] hover:bg-[color:var(--surface-2)]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            {loading ? (
              <LightningLoader size="md" text="Loading..." />
            ) : (
              <>
                {activeSection === "profile" && (
                  <div className="space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <h1 className="text-2xl font-bold">Profile Settings</h1>
                      {username && (
                        <a
                          href={`/u/${username}`}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-medium transition"
                        >
                          <User className="h-3.5 w-3.5" />
                          View Profile @{username}
                        </a>
                      )}
                    </div>

                    {/* Profile Photo */}
                    <div className="flex items-center gap-5 p-5 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface)]">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt="Avatar"
                          className="h-24 w-24 rounded-full object-cover border-2 border-[color:var(--border-soft)]"
                        />
                      ) : (
                        <div className="h-24 w-24 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-yellow-500 flex items-center justify-center text-white font-bold text-3xl border-2 border-[color:var(--border-soft)]">
                          {(displayName || username || "U").slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">Profile Photo</h3>
                        <p className="text-xs text-[color:var(--text-muted)] mb-3">
                          Upload a profile picture to personalize your account
                        </p>
                        <label className="cursor-pointer">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 border-[color:var(--border-soft)]"
                            disabled={uploadingAvatar}
                            asChild
                          >
                            <span>
                              {uploadingAvatar ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Upload className="h-3.5 w-3.5" />
                              )}
                              {uploadingAvatar ? "Uploading..." : "Change Photo"}
                            </span>
                          </Button>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleAvatarUpload}
                            disabled={uploadingAvatar}
                          />
                        </label>
                      </div>
                    </div>

                    {/* Upload Error */}
                    {uploadError && (
                      <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        {uploadError}
                      </div>
                    )}

                    {/* Name & Username - 2 column grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Name</label>
                        <Input
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Your display name"
                          maxLength={50}
                          className="bg-[color:var(--surface-2)] border-[color:var(--border-soft)]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Username</label>
                        <Input
                          value={username}
                          onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                          placeholder="username"
                          maxLength={20}
                          className={`bg-[color:var(--surface-2)] border-[color:var(--border-soft)] ${
                            usernameError ? "border-red-500" : ""
                          }`}
                        />
                        {usernameError && (
                          <p className="text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {usernameError}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Bio */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Bio</label>
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Tell others about yourself"
                        maxLength={160}
                        rows={2}
                        className="w-full rounded-lg bg-[color:var(--surface-2)] border border-[color:var(--border-soft)] p-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-[color:var(--text-muted)]">{bio.length}/160</p>
                    </div>

                    {/* Website */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Website</label>
                      <Input
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="provepicks.com"
                        maxLength={100}
                        className="bg-[color:var(--surface-2)] border-[color:var(--border-soft)]"
                      />
                    </div>

                    {/* Save */}
                    <div className="pt-2">
                      <Button 
                        onClick={handleSave}
                        disabled={saving || !!usernameError}
                        className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : saveStatus === "success" ? (
                          <>
                            <Check className="mr-2 h-4 w-4" />
                            Saved
                          </>
                        ) : (
                          "Save Changes"
                        )}
                      </Button>
                    </div>

                  </div>
                )}

                {activeSection === "account" && (
                  <AccountSection />
                )}

                {activeSection === "wallet" && (
                  <WalletSection />
                )}

                {/* Trading section removed - hidden from sidebar */}
                {activeSection === "trading" && null}
                {false && activeSection === "trading" && (
                  <div className="space-y-8">
                    <h1 className="text-2xl font-bold">Trading Settings</h1>
                    <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface)] p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">Default Order Type</div>
                          <div className="text-sm text-[color:var(--text-muted)]">
                            Choose your default order type for new trades
                          </div>
                        </div>
                        <select className="rounded-lg bg-[color:var(--surface-2)] border border-[color:var(--border-soft)] px-3 py-2 text-sm">
                          <option>Market</option>
                          <option>Limit</option>
                        </select>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">Slippage Tolerance</div>
                          <div className="text-sm text-[color:var(--text-muted)]">
                            Maximum price change accepted
                          </div>
                        </div>
                        <select className="rounded-lg bg-[color:var(--surface-2)] border border-[color:var(--border-soft)] px-3 py-2 text-sm">
                          <option>0.5%</option>
                          <option>1%</option>
                          <option>2%</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {activeSection === "notifications" && (
                  <div className="space-y-8">
                    <h1 className="text-2xl font-bold">Notification Settings</h1>
                    <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface)] p-6 space-y-4">
                      {[
                        { label: "Email notifications", desc: "Receive updates via email" },
                        { label: "Push notifications", desc: "Browser push notifications" },
                        { label: "Trade confirmations", desc: "Notify when trades execute" },
                        { label: "Price alerts", desc: "Alert on significant price changes" },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center justify-between py-2">
                          <div>
                            <div className="font-medium">{item.label}</div>
                            <div className="text-sm text-[color:var(--text-muted)]">{item.desc}</div>
                          </div>
                          <button className="w-12 h-6 rounded-full bg-blue-600 relative">
                            <span className="absolute right-1 top-1 w-4 h-4 rounded-full bg-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </>
            )}
          </div>
        </div>
      </main>
      <MainFooter />
    </div>
  );
}
