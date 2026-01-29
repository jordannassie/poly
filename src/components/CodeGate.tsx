"use client";

import { useState, useEffect } from "react";
import { Zap, Lock, ArrowRight, Trophy, Users, TrendingUp, Shield, ChevronDown, Check } from "lucide-react";
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
  const [email, setEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [showCodeGate, setShowCodeGate] = useState(false);

  useEffect(() => {
    // Check if already unlocked
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") {
      setIsUnlocked(true);
    }
    setIsLoading(false);
  }, []);

  const handleCodeSubmit = (e: React.FormEvent) => {
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

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && email.includes("@")) {
      // TODO: Send to backend/email service
      setEmailSubmitted(true);
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

  // Features data
  const features = [
    {
      icon: <Trophy className="h-6 w-6" />,
      title: "Prove Your Picks",
      description: "Track your predictions with verified on-chain records. No more screenshots.",
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "Follow Top Traders",
      description: "See what the best predictors are betting on in real-time.",
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "Live Leaderboards",
      description: "Compete for the top spots and build your reputation.",
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Transparent Stats",
      description: "Win rates, streaks, and P&L - all publicly verifiable.",
    },
  ];

  // Show waitlist page
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0 bg-[url('https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/Sports%20Bet/image/alluring_swan_07128_Seahawks_vs_patriots_football_--ar_169_--_71ef6a5c-e7d7-4a27-9f1a-cd6de9f2772d_0.png')] bg-cover bg-center opacity-20" />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0a0a]/80 to-[#0a0a0a]" />
        
        <div className="relative z-10 max-w-4xl mx-auto px-4 py-16 md:py-24 text-center">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="h-14 w-14 md:h-16 md:w-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/25">
              <Zap className="h-8 w-8 md:h-9 md:w-9 text-white" />
            </div>
            <span className="text-3xl md:text-4xl font-bold">ProvePicks</span>
          </div>

          {/* Coming Soon Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-500/30 mb-6">
            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-orange-400 font-medium text-sm">Coming Soon</span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            Join the Waitlist
          </h1>
          <p className="text-lg md:text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            The social prediction market for sports. Follow traders. Track picks. Prove performance.
          </p>

          {/* Email Signup Form */}
          {emailSubmitted ? (
            <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 max-w-md mx-auto">
              <div className="flex items-center justify-center gap-2 text-green-400 mb-2">
                <Check className="h-5 w-5" />
                <span className="font-semibold">You&apos;re on the list!</span>
              </div>
              <p className="text-gray-400 text-sm">
                We&apos;ll notify you at <span className="text-white">{email}</span> when we launch.
              </p>
            </div>
          ) : (
            <form onSubmit={handleEmailSubmit} className="max-w-md mx-auto">
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 h-12 bg-white/10 border-white/20 text-white placeholder:text-gray-500 focus:border-orange-500"
                  required
                />
                <Button
                  type="submit"
                  className="h-12 px-6 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold"
                >
                  Get Notified
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
              <p className="text-gray-500 text-sm mt-3">
                Be the first to know when we go live. No spam, ever.
              </p>
            </form>
          )}
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
          Why ProvePicks?
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 hover:border-orange-500/30 transition"
            >
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center text-orange-400 mb-4">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-400 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Code Access Section */}
      <div className="max-w-md mx-auto px-4 py-12">
        <button
          onClick={() => setShowCodeGate(!showCodeGate)}
          className="w-full flex items-center justify-center gap-2 text-gray-500 hover:text-gray-400 transition text-sm"
        >
          <Lock className="h-4 w-4" />
          <span>Have an access code?</span>
          <ChevronDown className={`h-4 w-4 transition ${showCodeGate ? "rotate-180" : ""}`} />
        </button>

        {showCodeGate && (
          <div className="mt-6 bg-[#111111] border border-gray-800 rounded-2xl p-6">
            <form onSubmit={handleCodeSubmit} className="space-y-4">
              <div className="flex justify-center gap-3">
                {[0, 1, 2, 3].map((index) => (
                  <div
                    key={index}
                    className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center text-xl font-bold transition-all ${
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
                className="text-center bg-gray-900 border-gray-700 text-white"
                placeholder="Enter 4-digit code"
                maxLength={4}
                autoFocus={showCodeGate}
              />

              {error && (
                <p className="text-red-500 text-sm text-center">Incorrect code. Please try again.</p>
              )}

              <Button
                type="submit"
                disabled={code.length !== 4}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white h-11 font-semibold disabled:opacity-50"
              >
                Unlock Access
              </Button>
            </form>
          </div>
        )}
      </div>

      {/* Simple Footer */}
      <footer className="border-t border-gray-800 py-8">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold">ProvePicks</span>
          </div>
          <p className="text-gray-500 text-sm">
            © 2026 ProvePicks. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
