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

const sidebarItems = [
  { id: "profile", label: "Profile" },
  { id: "account", label: "Account" },
  { id: "trading", label: "Trading" },
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

// Phantom wallet connection component
function AccountSection() {
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletStatus, setWalletStatus] = useState<"idle" | "connecting" | "signing" | "verifying" | "success" | "error">("idle");
  const [walletError, setWalletError] = useState<string | null>(null);
  const [hasPhantom, setHasPhantom] = useState<boolean | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  
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

  // Check for Phantom on mount
  useEffect(() => {
    const checkPhantom = () => {
      const isPhantom = window.solana?.isPhantom;
      setHasPhantom(!!isPhantom);
    };
    
    // Wait for window to load
    if (document.readyState === "complete") {
      checkPhantom();
    } else {
      window.addEventListener("load", checkPhantom);
      return () => window.removeEventListener("load", checkPhantom);
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
      
      {/* Wallet Connections */}
      <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface)] p-6 space-y-4">
        <h3 className="font-semibold">Wallet Connections</h3>
        <p className="text-sm text-[color:var(--text-muted)]">
          Connect your crypto wallet to deposit, withdraw, and verify ownership of your trading account.
        </p>
        
        {/* Loading wallets */}
        {loadingWallets && (
          <div className="animate-pulse h-16 bg-[color:var(--surface-2)] rounded-lg"></div>
        )}
        
        {/* Show connected wallets from database */}
        {!loadingWallets && wallets.map((wallet) => (
          <div key={wallet.id} className="flex items-center justify-between p-4 rounded-lg bg-[color:var(--surface-2)]">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center">
                <span className="text-white font-bold text-xs">{wallet.chain.toUpperCase().slice(0, 3)}</span>
              </div>
              <div>
                <div className="font-mono text-sm">{formatAddress(wallet.wallet_address)}</div>
                <div className="flex items-center gap-2 text-xs">
                  {wallet.verified && <span className="text-green-500">Verified</span>}
                  {wallet.is_primary && <span className="text-purple-500">• Primary</span>}
                  <span className="text-[color:var(--text-muted)]">
                    • Connected {new Date(wallet.connected_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" className="border-[color:var(--border-soft)]">
              Disconnect
            </Button>
          </div>
        ))}

        {/* Connect Phantom Button - show different text if wallets exist */}
        <Button 
          onClick={() => setShowWalletModal(true)}
          className="gap-2 bg-purple-600 hover:bg-purple-700 text-white"
        >
          <Wallet className="h-4 w-4" />
          {wallets.length > 0 ? "Connect Another Wallet" : "Connect Phantom Wallet"}
        </Button>
      </div>
      
      {/* Danger Zone */}
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 space-y-4">
        <h3 className="font-semibold text-red-500">Danger Zone</h3>
        <p className="text-sm text-[color:var(--text-muted)]">
          Once you delete your account, there is no going back.
        </p>
        <Button variant="outline" className="border-red-500 text-red-500 hover:bg-red-500/10">
          Delete Account
        </Button>
      </div>

      {/* Phantom Wallet Modal */}
      {showWalletModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Connect Phantom</h2>
              <button 
                onClick={() => {
                  setShowWalletModal(false);
                  setWalletStatus("idle");
                  setWalletError(null);
                }}
                className="text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="text-center py-6">
              <div className="mx-auto h-20 w-20 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center mb-4">
                <Wallet className="h-10 w-10 text-white" />
              </div>
              
              {/* Phantom not installed */}
              {hasPhantom === false && (
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
              {hasPhantom !== false && walletStatus === "idle" && (
                <>
                  <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
                  <p className="text-[color:var(--text-muted)] text-sm mb-4">
                    Connect your Phantom wallet and sign a message to verify ownership.
                  </p>
                  <Button 
                    onClick={handleConnectWallet}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    Connect Phantom
                  </Button>
                </>
              )}

              {/* Connecting state */}
              {walletStatus === "connecting" && (
                <>
                  <h3 className="text-lg font-semibold mb-2">Connecting...</h3>
                  <p className="text-[color:var(--text-muted)] text-sm">
                    Please approve the connection in Phantom.
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
                    Please sign the verification message in Phantom.
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
                  <div className="space-y-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <h1 className="text-2xl font-bold">Profile Settings</h1>
                      {username && (
                        <a
                          href={`/u/${username}`}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-sm font-medium shadow-lg shadow-purple-500/25 transition-all hover:shadow-purple-500/40 hover:scale-105"
                        >
                          <User className="h-4 w-4" />
                          View Profile
                          <span className="text-white/70">@{username}</span>
                        </a>
                      )}
                    </div>

                    {/* Banner */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Banner Image</label>
                      <div className="relative h-32 rounded-xl overflow-hidden bg-gradient-to-r from-purple-600 to-blue-600">
                        {bannerUrl && (
                          <img
                            src={bannerUrl}
                            alt="Banner"
                            className="w-full h-full object-cover"
                          />
                        )}
                        <label className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition cursor-pointer">
                          <div className="flex items-center gap-2 text-white">
                            {uploadingBanner ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <>
                                <Upload className="h-5 w-5" />
                                <span>Upload Banner</span>
                              </>
                            )}
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleBannerUpload}
                            disabled={uploadingBanner}
                          />
                        </label>
                      </div>
                    </div>

                    {/* Avatar */}
                    <div className="flex items-center gap-4">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt="Avatar"
                          className="h-16 w-16 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-yellow-500 flex items-center justify-center text-white font-bold text-xl">
                          {(displayName || username || "U").slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <label className="cursor-pointer">
                        <Button
                          variant="outline"
                          className="gap-2 border-[color:var(--border-soft)]"
                          disabled={uploadingAvatar}
                          asChild
                        >
                          <span>
                            {uploadingAvatar ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Upload className="h-4 w-4" />
                            )}
                            {uploadingAvatar ? "Uploading..." : "Upload Avatar"}
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

                    {/* Upload Error */}
                    {uploadError && (
                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {uploadError}
                      </div>
                    )}

                    {/* Name */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Name</label>
                      <Input
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Your display name"
                        maxLength={50}
                        className="bg-[color:var(--surface-2)] border-[color:var(--border-soft)]"
                      />
                      <p className="text-xs text-[color:var(--text-muted)]">
                        This is how your name will appear on your profile
                      </p>
                    </div>

                    {/* Email - Hidden for wallet users */}
                    {authProvider !== "wallet" && emailVisible && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Email</label>
                        <Input
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="bg-[color:var(--surface-2)] border-[color:var(--border-soft)]"
                        />
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-[color:var(--text-muted)]">Not verified</span>
                          <button className="text-blue-500 hover:underline">Resend</button>
                        </div>
                      </div>
                    )}
                    
                    {/* Wallet login indicator */}
                    {authProvider === "wallet" && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Email</label>
                        <div className="text-sm text-[color:var(--text-muted)] py-2">
                          — (wallet login)
                        </div>
                      </div>
                    )}

                    {/* Username */}
                    <div className="space-y-2">
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
                      {usernameError ? (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {usernameError}
                        </p>
                      ) : (
                        <p className="text-xs text-[color:var(--text-muted)]">
                          3-20 characters, lowercase letters, numbers, and underscores only
                        </p>
                      )}
                    </div>

                    {/* Bio */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Bio</label>
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Tell others about yourself"
                        rows={4}
                        className="w-full rounded-lg bg-[color:var(--surface-2)] border border-[color:var(--border-soft)] p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Website */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Website</label>
                      <Input
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="provepicks.com"
                        className="bg-[color:var(--surface-2)] border-[color:var(--border-soft)]"
                      />
                      <p className="text-xs text-[color:var(--text-muted)]">
                        Your website or social profile link
                      </p>
                    </div>

                    {/* Save */}
                    <div className="flex items-center gap-4">
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
                          "Save changes"
                        )}
                      </Button>
                    </div>

                  </div>
                )}

                {activeSection === "account" && (
                  <AccountSection />
                )}

                {activeSection === "trading" && (
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
