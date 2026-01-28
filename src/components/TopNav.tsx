"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, ChevronDown, Moon } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { AuthModal } from "./AuthModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { clearDemoUser, DemoUser, getDemoUser, setDemoUser } from "@/lib/demoAuth";

export function TopNav() {
  const [authOpen, setAuthOpen] = useState(false);
  const [demoUser, setDemoUserState] = useState<DemoUser | null>(null);

  useEffect(() => {
    setDemoUserState(getDemoUser());
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
      <div className="border-b border-white/5 bg-[#0b1320]/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-4">
          <Link href="/" className="flex items-center gap-2 text-white">
            <div className="h-8 w-8 rounded-md bg-[#2d7ff9] flex items-center justify-center text-sm font-bold">
              P
            </div>
            <span className="hidden text-sm font-semibold sm:block">
              Polymarket
            </span>
          </Link>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-white/40" />
            <Input
              placeholder="Search polymarket"
              className="pl-9 bg-[#111a27] border-white/10 text-white placeholder:text-white/40"
            />
          </div>
          <div className="ml-auto hidden items-center gap-4 text-sm text-white/70 md:flex">
            <Link href="/breaking" className="hover:text-white">
              How it works
            </Link>
            {demoUser ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-full bg-white/5 px-2 py-1 text-white/80 hover:text-white">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1e2a3d] text-xs font-semibold">
                      {initials}
                    </span>
                    <span className="text-sm">{demoUser.handle}</span>
                    <ChevronDown className="h-4 w-4 text-white/50" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-[#0b1320] border-white/10 text-white w-48">
                  <DropdownMenuItem asChild>
                    <Link href="/account">Account</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>Leaderboard</DropdownMenuItem>
                  <DropdownMenuItem>Rewards</DropdownMenuItem>
                  <DropdownMenuItem>APIs</DropdownMenuItem>
                  <DropdownMenuItem>Builders</DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem className="flex items-center justify-between">
                    Dark mode
                    <Moon className="h-4 w-4 text-white/60" />
                  </DropdownMenuItem>
                  <DropdownMenuItem>Support</DropdownMenuItem>
                  <DropdownMenuItem>Documentation</DropdownMenuItem>
                  <DropdownMenuItem>Terms of Use</DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem
                    className="text-red-400 focus:text-red-300"
                    onSelect={() => {
                      clearDemoUser();
                      setDemoUserState(null);
                    }}
                  >
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button
                  variant="ghost"
                  className="text-white/70 hover:text-white hover:bg-white/10"
                  onClick={() => setAuthOpen(true)}
                >
                  Log in
                </Button>
                <Button
                  className="bg-[#2d7ff9] hover:bg-[#3a8bff] text-white"
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
              className="md:hidden text-white/70 hover:text-white hover:bg-white/10"
              onClick={() => setAuthOpen(true)}
            >
              Log in
            </Button>
          )}
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
    </>
  );
}
