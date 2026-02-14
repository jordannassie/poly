"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { ChevronDown, Moon, Sun, Bell, Coins, DollarSign, Menu, X, Home, Trophy, Settings, Wallet, Radio, BarChart3, Briefcase } from "lucide-react";
import { ProvePicksLogo } from "./ui/ProvePicksLogo";
import { SearchBar } from "./SearchBar";
import { Button } from "./ui/button";
import { Avatar } from "./ui/Avatar";
import { AuthModal } from "./AuthModal";
import { HowItWorksModal } from "./HowItWorksModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import { clearDemoUser, DemoUser, getDemoUser, setDemoUser } from "@/lib/demoAuth";
import { getSupabaseClient, getUntypedSupabaseClient } from "@/lib/supabase";
import { initTheme, ThemeMode, toggleTheme } from "@/lib/theme";
import { useCoinBalance } from "@/lib/coins/useCoinBalance";

const MODE_KEY = "provepicks:mode";

declare global {
  interface Window {
    __provepicksAuth?: { isLoggedIn: boolean; userId: string | null };
    __provepicksIsLoggedIn?: boolean;
    __provepicksMode?: "coin" | "cash";
  }
}

// Real user type from /api/me
interface RealUser {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  wallet_address?: string;
}

export function TopNav() {
  const [authOpen, setAuthOpen] = useState(false);
  const [howOpen, setHowOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoUser, setDemoUserState] = useState<DemoUser | null>(null);
  const [realUser, setRealUser] = useState<RealUser | null>(null);
  const [authType, setAuthType] = useState<"supabase" | "wallet" | "none">("none");
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [mode, setMode] = useState<"coin" | "cash">("coin");
  // Fetch real user from /api/me
  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch("/api/me");
      const data = await res.json();
      if (data.user) {
        setRealUser(data.user);
        setAuthType(data.authType);
        void fetch("/api/coins/ensure", { method: "POST" }).catch((error) => {
          console.error("Failed to ensure coin account:", error);
        });
      } else {
        setRealUser(null);
        setAuthType("none");
      }
    } catch {
      setRealUser(null);
      setAuthType("none");
    }
  }, []);

  useEffect(() => {
    setDemoUserState(getDemoUser());
    setTheme(initTheme());
    fetchMe();
  }, [fetchMe]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.__provepicksMode ?? window.localStorage.getItem(MODE_KEY);
    setMode(stored === "cash" ? "cash" : "coin");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(MODE_KEY, mode);
    window.__provepicksMode = mode;
    window.dispatchEvent(
      new CustomEvent("provepicks:mode-change", {
        detail: { mode },
      }),
    );
  }, [mode]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handler = () => setHowOpen(true);
    window.addEventListener("provepicks:open-how-it-works", handler);
    return () => {
      window.removeEventListener("provepicks:open-how-it-works", handler);
    };
  }, []);

  const {
    coinBalance,
    coinLoading,
  } = useCoinBalance(realUser?.id ?? null);

  const proveItAmount =
    mode === "coin"
      ? coinLoading || coinBalance === null
        ? "— Coins"
        : `${coinBalance.toLocaleString()} Coins`
      : "$0.00";

  useEffect(() => {
    if (typeof document === "undefined") return;
    const observer = new MutationObserver(() => {
      setTheme(
        document.documentElement.classList.contains("dark") ? "dark" : "light",
      );
    });
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  // Determine if user is logged in (real user takes priority over demo)
  const isLoggedIn = realUser !== null || demoUser !== null;
  const currentUser = realUser || demoUser;

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    window.__provepicksAuth = {
      isLoggedIn,
      userId: realUser?.id ?? null,
    };
    window.dispatchEvent(
      new CustomEvent("provepicks:auth-ready", {
        detail: window.__provepicksAuth,
      }),
    );
    return () => {
      window.__provepicksAuth = undefined;
    };
  }, [isLoggedIn, realUser?.id]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handler = () => setAuthOpen(true);
    window.addEventListener("provepicks:open-auth", handler);
    return () => {
      window.removeEventListener("provepicks:open-auth", handler);
    };
  }, []);

  const initials = useMemo(() => {
    if (realUser) {
      // Use real user display name or username
      const name = realUser.display_name || realUser.username || "";
      if (name) {
        return name
          .split(" ")
          .map((word) => word[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();
      }
      // Fallback to wallet address initials
      if (realUser.wallet_address) {
        return realUser.wallet_address.slice(0, 2).toUpperCase();
      }
      return "U";
    }
    if (!demoUser) return "";
    return demoUser.name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [realUser, demoUser]);

  // Get profile link
  const profileLink = useMemo(() => {
    if (realUser?.username) {
      return `/u/${realUser.username}`;
    }
    if (demoUser?.handle) {
      return `/u/${demoUser.handle.replace("@", "").toLowerCase()}`;
    }
    return "/settings";
  }, [realUser, demoUser]);

  // Handle logout
  const handleLogout = async () => {
    // Clear demo user locally
    clearDemoUser();
    setDemoUserState(null);
    setRealUser(null);
    setAuthType("none");
    
    // Call logout API to clear server-side cookies
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch (error) {
      console.error("Logout API error:", error);
    }
    
    // Hard redirect to home
    window.location.href = "/";
  };

  return (
    <>
      <div className="bg-gradient-to-r from-orange-500 to-amber-500">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-4">
          <Link href="/" className="flex items-center gap-2 text-white flex-shrink-0">
            <ProvePicksLogo size="lg" glow />
            <span className="text-lg font-bold text-white hidden sm:inline">
              ProvePicks
            </span>
          </Link>

          {/* Global Search */}
          <div className="flex-1 flex justify-center max-w-md mx-2 md:mx-4">
            <SearchBar />
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              className="h-9 w-9 rounded-full p-0 text-white/80 hover:text-white hover:bg-white/20"
              onClick={() => setTheme(toggleTheme())}
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            {/* How it works */}
            <button
              className="text-xs md:text-sm text-white/80 hover:text-white"
              onClick={() => setHowOpen(true)}
              type="button"
            >
              How it works
            </button>
            {/* Coin/Cash toggle moved below to sit between nav and sub menu */}
            
            {isLoggedIn ? (
              <div className="flex items-center gap-2 md:gap-4">
                {/* Notifications */}
                <Button
                  variant="ghost"
                  className="h-8 w-8 md:h-9 md:w-9 rounded-full p-0 text-white/80 hover:text-white hover:bg-white/20"
                >
                  <Bell className="h-4 w-4" />
                </Button>
                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1 rounded-full p-1 text-white/80 hover:text-white">
                      <Avatar 
                        src={realUser?.avatar_url}
                        name={realUser?.display_name || realUser?.username || undefined}
                        size="sm"
                      />
                      <ChevronDown className="h-3 w-3 md:h-4 md:w-4 text-white/70" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-[#1a1a1a] border-white/10 text-white w-48">
                  <DropdownMenuItem asChild>
                    <Link href={profileLink} className="text-white/80 hover:text-white focus:text-white">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/portfolio" className="text-white/80 hover:text-white focus:text-white">Portfolio</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="text-white/80 hover:text-white focus:text-white">Settings</Link>
                  </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/leaderboard" className="text-white/80 hover:text-white focus:text-white">Leaderboard</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem
                      className="flex items-center justify-between text-white/80 hover:text-white focus:text-white"
                      onSelect={() => setTheme(toggleTheme())}
                    >
                      {theme === "dark" ? "Dark mode" : "Light mode"}
                      {theme === "dark" ? (
                        <Moon className="h-4 w-4 text-white/40" />
                      ) : (
                        <Sun className="h-4 w-4 text-white/40" />
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-white/80 hover:text-white focus:text-white">Support</DropdownMenuItem>
                    <DropdownMenuItem className="text-white/80 hover:text-white focus:text-white">Terms of Use</DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem
                      className="text-red-400 focus:text-red-300"
                      onSelect={handleLogout}
                    >
                      Logout
                    </DropdownMenuItem>
                </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="flex items-center gap-1 md:gap-2">
                <Button
                  variant="ghost"
                  className="text-white/80 hover:text-white hover:bg-white/20 text-xs md:text-sm px-2 md:px-4"
                  onClick={() => setAuthOpen(true)}
                >
                  Log in
                </Button>
                <Button
                  className="bg-white text-orange-600 hover:bg-white/90 font-semibold text-xs md:text-sm px-3 md:px-4"
                  onClick={() => setAuthOpen(true)}
                >
                  Sign up
                </Button>
              </div>
            )}
            {/* Mobile Menu Button */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  className="md:hidden h-9 w-9 p-0 text-white/80 hover:text-white hover:bg-white/20"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] p-0">
                <SheetHeader className="p-4 border-b border-[color:var(--border-soft)]">
                  <SheetTitle className="flex items-center gap-2 text-[color:var(--text-strong)]">
                    <ProvePicksLogo size="sm" />
                    ProvePicks
                  </SheetTitle>
                </SheetHeader>
                <div className="py-4">
                  {/* Navigation Links */}
                  <nav className="space-y-1 px-2">
                    <Link
                      href="/"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-3 rounded-lg text-[color:var(--text-muted)] hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text-strong)] transition"
                    >
                      <Home className="h-5 w-5" />
                      <span className="font-medium">Home</span>
                    </Link>
                    <Link
                      href="/?view=live"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-3 rounded-lg text-[color:var(--text-muted)] hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text-strong)] transition"
                    >
                      <Radio className="h-5 w-5 text-red-500" />
                      <span className="font-medium">Live</span>
                    </Link>
                    <Link
                      href="/sports"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-3 rounded-lg text-[color:var(--text-muted)] hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text-strong)] transition"
                    >
                      <BarChart3 className="h-5 w-5" />
                      <span className="font-medium">Sports</span>
                    </Link>
                    {/* Plinko link - HIDDEN (code saved but not shown in nav) */}
                    <Link
                      href="/leaderboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-3 rounded-lg text-[color:var(--text-muted)] hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text-strong)] transition"
                    >
                      <Trophy className="h-5 w-5 text-white/60" />
                      <span className="font-medium">Leaderboard</span>
                    </Link>
                    {demoUser && (
                      <>
                        <Link
                          href={`/u/${demoUser.handle.replace("@", "").toLowerCase()}`}
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-3 rounded-lg text-[color:var(--text-muted)] hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text-strong)] transition"
                        >
                          <div className="h-5 w-5 rounded-full bg-gradient-to-br from-neutral-500 to-neutral-700" />
                          <span className="font-medium">Profile</span>
                        </Link>
                        <Link
                          href="/settings"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-3 rounded-lg text-[color:var(--text-muted)] hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text-strong)] transition"
                        >
                          <Settings className="h-5 w-5" />
                          <span className="font-medium">Settings</span>
                        </Link>
                      </>
                    )}
                  </nav>
                  
                  {/* How it works */}
                  <div className="px-2 mt-4 pt-4 border-t border-[color:var(--border-soft)]">
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setHowOpen(true);
                      }}
                      className="flex items-center gap-3 px-3 py-3 rounded-lg text-[color:var(--text-muted)] hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text-strong)] transition w-full"
                    >
                      <span className="font-medium">How it works</span>
                    </button>
                  </div>

                  {/* Auth Buttons or User Info */}
                  <div className="px-4 mt-4 pt-4 border-t border-[color:var(--border-soft)]">
                    {isLoggedIn ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-[color:var(--surface-2)] rounded-lg">
                          <Avatar 
                            src={realUser?.avatar_url}
                            name={realUser?.display_name || realUser?.username || undefined}
                            size="md"
                          />
                          <div>
                            <div className="font-medium text-[color:var(--text-strong)]">
                              {realUser?.display_name || realUser?.username || demoUser?.name || "User"}
                            </div>
                            <div className="text-xs text-[color:var(--text-muted)]">
                              {realUser?.wallet_address 
                                ? `${realUser.wallet_address.slice(0, 4)}...${realUser.wallet_address.slice(-4)}`
                                : demoUser?.email || ""}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          className="w-full border-red-500/50 text-red-500 hover:bg-red-500/10"
                          onClick={() => {
                            handleLogout();
                            setMobileMenuOpen(false);
                          }}
                        >
                          Logout
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Button
                          className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white"
                          onClick={() => {
                            setMobileMenuOpen(false);
                            setAuthOpen(true);
                          }}
                        >
                          Sign up
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            setMobileMenuOpen(false);
                            setAuthOpen(true);
                          }}
                        >
                          Log in
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
      <div className="border-b border-white/10 bg-[#1a1a1a]">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-center gap-3 px-4 py-2.5 text-white flex-wrap">
          {/* Prove It label */}
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
            <span>Prove it:</span>
            <span className="text-sm font-bold text-white">{proveItAmount}</span>
          </div>

          {/* Coin/Cash toggle */}
          <div className="flex items-center gap-2 rounded-full border border-white/20 bg-black/40 px-1.5 py-1 text-[11px] font-semibold tracking-wider">
            <button
              type="button"
              onClick={() => setMode("coin")}
              aria-pressed={mode === "coin"}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 transition duration-200 ${
                mode === "coin"
                  ? "bg-white text-black"
                  : "bg-transparent text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              <Coins className={`h-3 w-3 ${mode === "coin" ? "text-black" : "text-orange-400"}`} />
              Coin
            </button>
            <button
              type="button"
              onClick={() => setMode("cash")}
              aria-pressed={mode === "cash"}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 transition duration-200 ${
                mode === "cash"
                  ? "bg-white text-black"
                  : "bg-transparent text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              <DollarSign className={`h-3 w-3 ${mode === "cash" ? "text-black" : "text-orange-400"}`} />
              Cash
            </button>
          </div>

          {/* Portfolio + Leaderboard icons */}
          <div className="flex items-center gap-0.5">
            <Link
              href="/portfolio"
              className="flex items-center justify-center h-7 w-7 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition"
              title="Portfolio"
            >
              <Briefcase className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/leaderboard"
              className="flex items-center justify-center h-7 w-7 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition"
              title="Leaderboard"
            >
              <Trophy className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
      <AuthModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        onSuccess={(email) => {
          const user = setDemoUser(email);
          setDemoUserState(user);
        }}
      />
      <HowItWorksModal
        open={howOpen}
        onOpenChange={setHowOpen}
        onSignIn={() => setAuthOpen(true)}
      />
    </>
  );
}
