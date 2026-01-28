"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, ChevronDown, Moon, Sun, Bell, Zap } from "lucide-react";
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
import { clearDemoUser, DemoUser, getDemoUser, setDemoUser } from "@/lib/demoAuth";
import { initTheme, ThemeMode, toggleTheme } from "@/lib/theme";

export function TopNav() {
  const [authOpen, setAuthOpen] = useState(false);
  const [howOpen, setHowOpen] = useState(false);
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
          <Link href="/" className="flex items-center gap-2 text-white">
            <div className="h-8 w-8 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="hidden text-sm font-bold sm:block text-white">
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
            {!demoUser && (
              <Button
                variant="ghost"
                className="md:hidden text-white/80 hover:text-white hover:bg-white/20"
                onClick={() => setAuthOpen(true)}
              >
                Log in
              </Button>
            )}
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
