"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { ChevronDown, Moon, Sun, Bell, Menu, X, Home, Trophy, Settings, Wallet, Radio, BarChart3 } from "lucide-react";
import { ProvePicksLogo } from "./ui/ProvePicksLogo";
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
import { initTheme, ThemeMode, toggleTheme } from "@/lib/theme";

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

  // Fetch real user from /api/me
  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch("/api/me");
      const data = await res.json();
      if (data.user) {
        setRealUser(data.user);
        setAuthType(data.authType);
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
          <Link href="/" className="flex items-center gap-2 text-white">
            <ProvePicksLogo size="sm" glow />
            <span className="text-lg font-bold text-white">
              ProvePicks
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
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
            
            {isLoggedIn ? (
              <div className="flex items-center gap-2 md:gap-4">
                {/* Portfolio & Cash */}
                <Link href="/portfolio" className="flex items-center gap-2 md:gap-4 hover:opacity-80 transition">
                  <div className="text-center">
                    <div className="text-[10px] md:text-xs text-white/70">Portfolio</div>
                    <div className="text-xs md:text-sm font-semibold text-white">$0.00</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] md:text-xs text-white/70">Cash</div>
                    <div className="text-xs md:text-sm font-semibold text-white">$0.00</div>
                  </div>
                </Link>
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
                  <DropdownMenuContent className="bg-[color:var(--surface)] border-[color:var(--border-soft)] text-[color:var(--text-strong)] w-48">
                    <DropdownMenuItem asChild>
                      <Link href={profileLink}>Profile</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/portfolio">Portfolio</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/settings">Settings</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/leaderboard">Leaderboard</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-[color:var(--border-soft)]" />
                    <DropdownMenuItem
                      className="flex items-center justify-between"
                      onSelect={() => setTheme(toggleTheme())}
                    >
                      {theme === "dark" ? "Dark mode" : "Light mode"}
                      {theme === "dark" ? (
                        <Moon className="h-4 w-4 text-[color:var(--text-subtle)]" />
                      ) : (
                        <Sun className="h-4 w-4 text-[color:var(--text-subtle)]" />
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem>Support</DropdownMenuItem>
                    <DropdownMenuItem>Terms of Use</DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-[color:var(--border-soft)]" />
                    <DropdownMenuItem
                      className="text-red-500 focus:text-red-400"
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
                      <Trophy className="h-5 w-5 text-yellow-500" />
                      <span className="font-medium">Leaderboard</span>
                    </Link>
                    {demoUser && (
                      <>
                        <Link
                          href={`/u/${demoUser.handle.replace("@", "").toLowerCase()}`}
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-3 rounded-lg text-[color:var(--text-muted)] hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text-strong)] transition"
                        >
                          <div className="h-5 w-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
                          <span className="font-medium">Profile</span>
                        </Link>
                        <Link
                          href="/portfolio"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-3 rounded-lg text-[color:var(--text-muted)] hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text-strong)] transition"
                        >
                          <Wallet className="h-5 w-5 text-green-500" />
                          <span className="font-medium">Portfolio</span>
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
