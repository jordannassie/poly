"use client";

import { useState, useEffect } from "react";
import { Zap, Lock, ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

const ACCESS_CODE = "1234";
const STORAGE_KEY = "provepicks-access-granted";

type CodeGateProps = {
  children: React.ReactNode;
};

export function CodeGate({ children }: CodeGateProps) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if already unlocked
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") {
      setIsUnlocked(true);
    }
    setIsLoading(false);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code === ACCESS_CODE) {
      localStorage.setItem(STORAGE_KEY, "true");
      setIsUnlocked(true);
      setError(false);
    } else {
      setError(true);
      setCode("");
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 4);
    setCode(value);
    setError(false);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-pulse">
          <Zap className="h-12 w-12 text-orange-500" />
        </div>
      </div>
    );
  }

  // Show children if unlocked
  if (isUnlocked) {
    return <>{children}</>;
  }

  // Show gate
  return (
    <div className="min-h-screen bg-[#0a0a0a] relative flex flex-col items-center justify-center px-4">
      {/* Background image */}
      <div className="absolute inset-0 bg-[url('https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/Sports%20Bet/image/alluring_swan_07128_Seahawks_vs_patriots_football_--ar_169_--_71ef6a5c-e7d7-4a27-9f1a-cd6de9f2772d_0.png')] bg-cover bg-center opacity-30" />
      {/* Background gradient effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 text-center max-w-md w-full">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/25">
            <Zap className="h-9 w-9 text-white" />
          </div>
          <span className="text-4xl font-bold text-white">ProvePicks</span>
        </div>

        {/* Coming Soon Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-500/30 mb-8">
          <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          <span className="text-orange-400 font-medium">Coming Soon</span>
        </div>

        {/* Tagline */}
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">
          The Future of Sports Betting
        </h1>
        <p className="text-gray-400 mb-8">
          Be among the first to experience the next generation of sports prediction markets.
        </p>

        {/* Code Entry */}
        <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4 justify-center">
            <Lock className="h-5 w-5 text-gray-500" />
            <span className="text-gray-400 text-sm">Enter access code</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex justify-center gap-3">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className={`w-14 h-16 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all ${
                    code[index]
                      ? "border-orange-500 bg-orange-500/10 text-white"
                      : error
                      ? "border-red-500 bg-red-500/10"
                      : "border-gray-700 bg-gray-900 text-gray-600"
                  }`}
                >
                  {code[index] ? "•" : ""}
                </div>
              ))}
            </div>

            <Input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={handleCodeChange}
              className="sr-only"
              autoFocus
              placeholder="Enter code"
            />

            {/* Hidden input for actual typing */}
            <div className="flex justify-center gap-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "←"].map((digit, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    if (digit === "←") {
                      setCode(code.slice(0, -1));
                    } else if (digit && code.length < 4) {
                      setCode(code + digit);
                    }
                    setError(false);
                  }}
                  className={`w-12 h-12 rounded-xl font-semibold text-lg transition-all ${
                    digit === ""
                      ? "invisible"
                      : digit === "←"
                      ? "bg-gray-800 text-gray-400 hover:bg-gray-700"
                      : "bg-gray-800 text-white hover:bg-gray-700 active:scale-95"
                  }`}
                >
                  {digit}
                </button>
              ))}
            </div>

            {error && (
              <p className="text-red-500 text-sm">Incorrect code. Please try again.</p>
            )}

            <Button
              type="submit"
              disabled={code.length !== 4}
              className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white h-12 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Unlock Access</span>
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-gray-600 text-sm">
          Don&apos;t have a code?{" "}
          <a href="#" className="text-orange-500 hover:underline">
            Join the waitlist
          </a>
        </p>
      </div>
    </div>
  );
}
