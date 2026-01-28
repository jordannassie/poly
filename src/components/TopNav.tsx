"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, ChevronDown, Moon, Sun, Bell, Zap, Menu, X, Home, Trophy, Settings, Wallet, Radio, BarChart3 } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
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

export function TopNav() {
  const [authOpen, setAuthOpen] = useState(false);
  const [howOpen, setHowOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoUser, setDemoUserState] = useState<DemoUser | null>(null);
  const [theme, setTheme] = useState<ThemeMode>("dark");

  useEffect(() => {
    setDemoUserState(getDemoUser());
    setTheme(initTheme());
  }, []);

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

  const initials = useMemo(() => {
    if (!demoUser) return "";
    return demoUser.name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [demoUser]);

  return (
    <>
      <div className="bg-gradient-to-r from-orange-500 to-amber-500">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-4">
          <Link href="/" className="flex items-center gap-3 text-white">
            <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <span className="hidden text-lg font-bold sm:block text-white">
              ProvePicks
            </span>
          </Link>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-white/60" />
            <Input
              placeholder="Search markets"
              className="pl-9 bg-white/20 border-white/30 text-white placeholder:text-white/60 focus:bg-white/30"
            />
          </div>
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
            <div className="hidden items-center gap-4 text-sm text-white/80 md:flex">
              <button
                className="hover:text-white"
                onClick={() => setHowOpen(true)}
                type="button"
              >
                How it works
              </button>
              {demoUser ? (
                <>
                  {/* Portfolio & Cash */}
                  <Link href="/portfolio" className="flex items-center gap-4 mr-2 hover:opacity-80 transition">
                    <div className="text-center">
                      <div className="text-xs text-white/70">Portfolio</div>
                      <div className="text-sm font-semibold text-white">$0.00</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-white/70">Cash</div>
                      <div className="text-sm font-semibold text-white">$0.00</div>
                    </div>
                  </Link>
                  {/* Notifications */}
                  <Button
                    variant="ghost"
                    className="h-9 w-9 rounded-full p-0 text-white/80 hover:text-white hover:bg-white/20"
                  >
                    <Bell className="h-4 w-4" />
                  </Button>
                  {/* User Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-1 rounded-full p-1 text-white/80 hover:text-white">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-xs font-semibold text-white">
                          {initials}
                        </span>
                        <ChevronDown className="h-4 w-4 text-white/70" />
                      </button>
                    </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-[color:var(--surface)] border-[color:var(--border-soft)] text-[color:var(--text-strong)] w-48">
                    <DropdownMenuItem asChild>
                      <Link href="/portfolio">Portfolio</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/settings">Settings</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/leaderboard">Leaderboard</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>Rewards</DropdownMenuItem>
                    <DropdownMenuItem>APIs</DropdownMenuItem>
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
                    <DropdownMenuItem>Documentation</DropdownMenuItem>
                    <DropdownMenuItem>Terms of Use</DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-[color:var(--border-soft)]" />
                    <DropdownMenuItem
                      className="text-red-500 focus:text-red-400"
                      onSelect={() => {
                        clearDemoUser();
                        setDemoUserState(null);
                      }}
                    >
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    className="text-white/80 hover:text-white hover:bg-white/20"
                    onClick={() => setAuthOpen(true)}
                  >
                    Log in
                  </Button>
                  <Button
                    className="bg-white text-orange-600 hover:bg-white/90 font-semibold"
                    onClick={() => setAuthOpen(true)}
                  >
                    Sign up
                  </Button>
                </>
              )}
            </div>
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
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
                      <Zap className="h-4 w-4 text-white" />
                    </div>
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
                    {demoUser ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-[color:var(--surface-2)] rounded-lg">
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-600 text-sm font-semibold text-white">
                            {initials}
                          </span>
                          <div>
                            <div className="font-medium text-[color:var(--text-strong)]">{demoUser.name}</div>
                            <div className="text-xs text-[color:var(--text-muted)]">{demoUser.email}</div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          className="w-full border-red-500/50 text-red-500 hover:bg-red-500/10"
                          onClick={() => {
                            clearDemoUser();
                            setDemoUserState(null);
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
