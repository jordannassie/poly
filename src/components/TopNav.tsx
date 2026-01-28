"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { AuthModal } from "./AuthModal";

export function TopNav() {
  const [authOpen, setAuthOpen] = useState(false);

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
          </div>
          <Button
            variant="ghost"
            className="md:hidden text-white/70 hover:text-white hover:bg-white/10"
            onClick={() => setAuthOpen(true)}
          >
            Log in
          </Button>
        </div>
      </div>
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </>
  );
}
