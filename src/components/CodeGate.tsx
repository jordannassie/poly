"use client";

import { useState, useEffect } from "react";
import { Zap, Lock, ArrowRight, Trophy, Users, TrendingUp, ChevronDown, Check, Flame, Clock, DollarSign, Activity, X, Minus } from "lucide-react";

// Competitor logos
const competitors = [
  {
    name: "ProvePicks",
    logo: null, // We'll use our own logo component
    isProvePicks: true,
  },
  {
    name: "DraftKings",
    logo: "https://qiodxdkcvewvappuzuud.supabase.co/storage/v1/object/sign/SPORTS/logos/DraftKings-brand-strategy-positioning.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8wOTc3NzFmYi1jYzJjLTQxNGItOTNjYi1jZjk5OGVhNGMyZGMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJTUE9SVFMvbG9nb3MvRHJhZnRLaW5ncy1icmFuZC1zdHJhdGVneS1wb3NpdGlvbmluZy5qcGciLCJpYXQiOjE3Njk3MTg5OTksImV4cCI6MzE1NTM2OTcxODk5OX0.EgRmMPUC7V_u_WjRRr1Ub7oe8-zIL-GzzJuat1Wh16k",
  },
  {
    name: "Underdog",
    logo: "https://qiodxdkcvewvappuzuud.supabase.co/storage/v1/object/sign/SPORTS/logos/underdog_image-and-text_vertical.webp?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8wOTc3NzFmYi1jYzJjLTQxNGItOTNjYi1jZjk5OGVhNGMyZGMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJTUE9SVFMvbG9nb3MvdW5kZXJkb2dfaW1hZ2UtYW5kLXRleHRfdmVydGljYWwud2VicCIsImlhdCI6MTc2OTcxODk2MywiZXhwIjozMTU1MzY5NzE4OTYzfQ.byCy-G9c2c8OceODC7zvZuM2kN5fq_-UH36XzzHi06Q",
  },
  {
    name: "FanDuel",
    logo: "https://qiodxdkcvewvappuzuud.supabase.co/storage/v1/object/sign/SPORTS/logos/images.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8wOTc3NzFmYi1jYzJjLTQxNGItOTNjYi1jZjk5OGVhNGMyZGMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJTUE9SVFMvbG9nb3MvaW1hZ2VzLnBuZyIsImlhdCI6MTc2OTcxODk3NSwiZXhwIjozMTU1MzY5NzE4OTc1fQ.NorLJzpTYuJykb1jtwVkHCcmr1dsAXkAESfBwyg5XZU",
  },
  {
    name: "PrizePicks",
    logo: "https://qiodxdkcvewvappuzuud.supabase.co/storage/v1/object/sign/SPORTS/logos/images-1.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8wOTc3NzFmYi1jYzJjLTQxNGItOTNjYi1jZjk5OGVhNGMyZGMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJTUE9SVFMvbG9nb3MvaW1hZ2VzLTEucG5nIiwiaWF0IjoxNzY5NzE4OTg3LCJleHAiOjMxNzEyOTcxODk4N30.rAyYOqsID2i8JxasvnMa-mrBtdUGyYDkrDxpQpzeuOU",
  },
];

// Comparison features - "yes" = has feature, "no" = doesn't have, "partial" = partial support
type FeatureStatus = "yes" | "no" | "partial";

interface ComparisonFeature {
  feature: string;
  description: string;
  provePicks: FeatureStatus;
  draftkings: FeatureStatus;
  underdog: FeatureStatus;
  fanduel: FeatureStatus;
  prizepicks: FeatureStatus;
}

const comparisonFeatures: ComparisonFeature[] = [
  {
    feature: "Social Trading & Following",
    description: "Follow traders, see their picks",
    provePicks: "yes",
    draftkings: "no",
    underdog: "no",
    fanduel: "no",
    prizepicks: "partial",
  },
  {
    feature: "Verified Track Record",
    description: "On-chain proof of all picks",
    provePicks: "yes",
    draftkings: "no",
    underdog: "no",
    fanduel: "no",
    prizepicks: "no",
  },
  {
    feature: "Public Leaderboards",
    description: "See top performers ranked",
    provePicks: "yes",
    draftkings: "no",
    underdog: "partial",
    fanduel: "no",
    prizepicks: "yes",
  },
  {
    feature: "Copy Trading",
    description: "Mirror successful traders",
    provePicks: "yes",
    draftkings: "no",
    underdog: "no",
    fanduel: "no",
    prizepicks: "no",
  },
  {
    feature: "Transparent P&L Stats",
    description: "Real profit/loss visibility",
    provePicks: "yes",
    draftkings: "no",
    underdog: "no",
    fanduel: "no",
    prizepicks: "no",
  },
  {
    feature: "Real-time Activity Feed",
    description: "Live bets and wins feed",
    provePicks: "yes",
    draftkings: "no",
    underdog: "no",
    fanduel: "no",
    prizepicks: "partial",
  },
  {
    feature: "No Hidden Fees",
    description: "Transparent pricing",
    provePicks: "yes",
    draftkings: "no",
    underdog: "partial",
    fanduel: "partial",
    prizepicks: "yes",
  },
  {
    feature: "Crypto Wallet Login",
    description: "Web3 native authentication",
    provePicks: "yes",
    draftkings: "no",
    underdog: "no",
    fanduel: "no",
    prizepicks: "no",
  },
];
import { Button } from "./ui/button";
import { Input } from "./ui/input";

const ACCESS_CODE = "1234";
const STORAGE_KEY = "provepicks-access-granted";

type CodeGateProps = {
  children: React.ReactNode;
};

// Demo data for live preview
const demoMatchups = [
  {
    id: 1,
    league: "NFL",
    homeTeam: { name: "Chiefs", abbr: "KC", color: "#E31837", odds: 58 },
    awayTeam: { name: "Eagles", abbr: "PHI", color: "#004C54", odds: 42 },
    volume: "$8.5m",
    bettors: 589,
    locksIn: "4h 0m",
  },
  {
    id: 2,
    league: "NBA",
    homeTeam: { name: "Lakers", abbr: "LAL", color: "#552583", odds: 45 },
    awayTeam: { name: "Celtics", abbr: "BOS", color: "#007A33", odds: 55 },
    volume: "$4.2m",
    bettors: 423,
    locksIn: "2h 30m",
  },
  {
    id: 3,
    league: "NFL",
    homeTeam: { name: "Cowboys", abbr: "DAL", color: "#003594", odds: 52 },
    awayTeam: { name: "49ers", abbr: "SF", color: "#AA0000", odds: 48 },
    volume: "$6.1m",
    bettors: 512,
    locksIn: "6h 15m",
  },
];

// Top Traders - different users from activity feed
const demoTraders = [
  { rank: 1, name: "marcus_wins", avatar: "https://randomuser.me/api/portraits/men/32.jpg", profit: "+$437k", winRate: "78%", streak: 12, picks: 234 },
  { rank: 2, name: "sarah_bets", avatar: "https://randomuser.me/api/portraits/women/44.jpg", profit: "+$312k", winRate: "72%", streak: 8, picks: 189 },
  { rank: 3, name: "jay_picks", avatar: "https://randomuser.me/api/portraits/men/22.jpg", profit: "+$256k", winRate: "69%", streak: 6, picks: 312 },
  { rank: 4, name: "emma_trades", avatar: "https://randomuser.me/api/portraits/women/68.jpg", profit: "+$198k", winRate: "67%", streak: 5, picks: 156 },
  { rank: 5, name: "mike_clutch", avatar: "https://randomuser.me/api/portraits/men/75.jpg", profit: "+$145k", winRate: "65%", streak: 4, picks: 278 },
];

// Live Activity - different users from top traders
const demoActivity = [
  { user: "alex_runner", avatar: "https://randomuser.me/api/portraits/men/45.jpg", action: "bet", team: "Chiefs", amount: "$5,000", time: "2m ago" },
  { user: "nina_sports", avatar: "https://randomuser.me/api/portraits/women/28.jpg", action: "won", team: "Lakers", amount: "+$8,200", time: "5m ago" },
  { user: "tyler_picks", avatar: "https://randomuser.me/api/portraits/men/51.jpg", action: "bet", team: "Eagles", amount: "$3,500", time: "8m ago" },
  { user: "jessica_pro", avatar: "https://randomuser.me/api/portraits/women/63.jpg", action: "bet", team: "Celtics", amount: "$2,000", time: "12m ago" },
  { user: "david_wins", avatar: "https://randomuser.me/api/portraits/men/67.jpg", action: "won", team: "Cowboys", amount: "+$4,100", time: "15m ago" },
];

export function CodeGate({ children }: CodeGateProps) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [showCodeGate, setShowCodeGate] = useState(false);
  const [activeMatchup, setActiveMatchup] = useState(0);

  useEffect(() => {
    // Check if already unlocked
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") {
      setIsUnlocked(true);
    }
    setIsLoading(false);
  }, []);

  // Auto-rotate matchups
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveMatchup((prev) => (prev + 1) % demoMatchups.length);
    }, 4000);
    return () => clearInterval(interval);
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

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email && email.includes("@")) {
      try {
        await fetch("/api/waitlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
      } catch {
        // Silently continue even if API fails
      }
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

  const currentMatchup = demoMatchups[activeMatchup];

  // Show waitlist page
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src="https://qiodxdkcvewvappuzuud.supabase.co/storage/v1/object/public/SPORTS/images/alluring_swan_07128_Seahawks_vs_patriots_football_head_to_hea_5a48b8f5-1da9-4ce1-9a32-fc9be9199a22_2%20(1).png"
          alt="Football matchup"
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/50 via-[#0a0a0a]/70 to-[#0a0a0a]" />
        
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-12 md:py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Content */}
            <div className="text-center lg:text-left">
              {/* Logo */}
              <div className="flex items-center justify-center lg:justify-start gap-3 mb-6">
                <div className="h-12 w-12 md:h-14 md:w-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/25">
                  <Zap className="h-7 w-7 md:h-8 md:w-8 text-white" />
                </div>
                <span className="text-2xl md:text-3xl font-bold">ProvePicks</span>
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
              <p className="text-lg md:text-xl text-gray-400 mb-8 max-w-lg mx-auto lg:mx-0">
                The social prediction market for sports. Follow traders. Track picks. Prove performance.
              </p>

              {/* Email Signup Form */}
              {emailSubmitted ? (
                <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 max-w-md mx-auto lg:mx-0">
                  <div className="flex items-center justify-center lg:justify-start gap-2 text-green-400 mb-2">
                    <Check className="h-5 w-5" />
                    <span className="font-semibold">You&apos;re on the list!</span>
                  </div>
                  <p className="text-gray-400 text-sm">
                    We&apos;ll notify you at <span className="text-white">{email}</span> when we launch.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleEmailSubmit} className="max-w-md mx-auto lg:mx-0">
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

            {/* Right: Live Matchup Preview */}
            <div className="hidden lg:block">
              <div className="bg-[#111111] rounded-2xl border border-gray-800 p-6 shadow-2xl">
                {/* Matchup Header */}
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 text-xs font-semibold">
                    {currentMatchup.league}
                  </span>
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <Clock className="h-4 w-4" />
                    <span>Locks in {currentMatchup.locksIn}</span>
                  </div>
                </div>

                {/* Teams */}
                <div className="flex items-center justify-between mb-6">
                  {/* Home Team */}
                  <div className="flex items-center gap-4">
                    <div 
                      className="h-16 w-16 rounded-full flex items-center justify-center text-white font-bold text-lg"
                      style={{ backgroundColor: currentMatchup.homeTeam.color }}
                    >
                      {currentMatchup.homeTeam.abbr}
                    </div>
                    <div>
                      <p className="font-semibold text-lg">{currentMatchup.homeTeam.name}</p>
                      <p className="text-2xl font-bold text-green-400">{currentMatchup.homeTeam.odds}%</p>
                    </div>
                  </div>

                  <div className="text-gray-500 font-bold text-xl">VS</div>

                  {/* Away Team */}
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <p className="font-semibold text-lg">{currentMatchup.awayTeam.name}</p>
                      <p className="text-2xl font-bold text-gray-400">{currentMatchup.awayTeam.odds}%</p>
                    </div>
                    <div 
                      className="h-16 w-16 rounded-full flex items-center justify-center text-white font-bold text-lg"
                      style={{ backgroundColor: currentMatchup.awayTeam.color }}
                    >
                      {currentMatchup.awayTeam.abbr}
                    </div>
                  </div>
                </div>

                {/* Odds Bar */}
                <div className="h-3 bg-gray-800 rounded-full overflow-hidden mb-4">
                  <div 
                    className="h-full transition-all duration-500"
                    style={{ 
                      width: `${currentMatchup.homeTeam.odds}%`,
                      backgroundColor: currentMatchup.homeTeam.color
                    }}
                  />
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    <span>Volume: <span className="text-white font-semibold">{currentMatchup.volume}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span><span className="text-white font-semibold">{currentMatchup.bettors}</span> active bettors</span>
                  </div>
                </div>

                {/* Matchup Indicators */}
                <div className="flex justify-center gap-2 mt-4">
                  {demoMatchups.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveMatchup(i)}
                      className={`h-2 rounded-full transition-all ${
                        i === activeMatchup ? "w-6 bg-orange-500" : "w-2 bg-gray-700"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Stats Bar */}
      <div className="border-y border-gray-800 bg-gradient-to-r from-orange-500/5 via-transparent to-orange-500/5">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex flex-wrap justify-center gap-6 md:gap-12 text-sm">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-400" />
              <span className="text-gray-400">Live Traders:</span>
              <span className="text-white font-semibold">589</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-orange-400" />
              <span className="text-gray-400">Volume Today:</span>
              <span className="text-white font-semibold">$18.8m</span>
            </div>
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-red-400" />
              <span className="text-gray-400">Hot Picks:</span>
              <span className="text-white font-semibold">$82k (10m)</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-400" />
              <span className="text-gray-400">Top Streak:</span>
              <span className="text-white font-semibold">12 wins</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Traders & Activity Section */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Top Traders */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-yellow-400" />
              </div>
              <h2 className="text-xl font-bold">Top Traders</h2>
            </div>
            <div className="space-y-3">
              {demoTraders.map((trader) => (
                <div 
                  key={trader.rank}
                  className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-white/5 to-transparent border border-white/5 hover:border-orange-500/30 transition"
                >
                  <div className="text-lg font-bold text-gray-500 w-6">#{trader.rank}</div>
                  <div className="h-10 w-10 rounded-full overflow-hidden bg-gradient-to-br from-orange-500/30 to-amber-500/30">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={trader.avatar} alt={trader.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">@{trader.name}</p>
                    <p className="text-xs text-gray-500">{trader.picks} picks · {trader.winRate} win rate</p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-bold">{trader.profit}</p>
                    <p className="text-xs text-orange-400">🔥 {trader.streak} streak</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live Activity */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                <Activity className="h-5 w-5 text-green-400" />
              </div>
              <h2 className="text-xl font-bold">Live Activity</h2>
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            </div>
            <div className="space-y-3">
              {demoActivity.map((activity, i) => (
                <div 
                  key={i}
                  className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-white/5 to-transparent border border-white/5"
                >
                  <div className="h-10 w-10 rounded-full overflow-hidden bg-gradient-to-br from-gray-700 to-gray-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={activity.avatar} alt={activity.user} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-semibold text-white">@{activity.user}</span>
                      <span className="text-gray-400"> {activity.action === "bet" ? "placed bet on" : "won on"} </span>
                      <span className="text-orange-400 font-medium">{activity.team}</span>
                    </p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                  <div className={`font-bold ${activity.action === "won" ? "text-green-400" : "text-white"}`}>
                    {activity.amount}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Matchups Preview (Mobile) */}
      <div className="lg:hidden max-w-lg mx-auto px-4 pb-12">
        <h2 className="text-xl font-bold text-center mb-6">Live Markets</h2>
        <div className="space-y-4">
          {demoMatchups.map((matchup) => (
            <div key={matchup.id} className="bg-[#111111] rounded-xl border border-gray-800 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="px-2 py-1 rounded-full bg-orange-500/20 text-orange-400 text-xs font-semibold">
                  {matchup.league}
                </span>
                <span className="text-xs text-gray-500">Locks in {matchup.locksIn}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-xs"
                    style={{ backgroundColor: matchup.homeTeam.color }}
                  >
                    {matchup.homeTeam.abbr}
                  </div>
                  <span className="font-medium">{matchup.homeTeam.name}</span>
                </div>
                <span className="text-green-400 font-bold">{matchup.homeTeam.odds}%</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden my-3">
                <div 
                  className="h-full"
                  style={{ 
                    width: `${matchup.homeTeam.odds}%`,
                    backgroundColor: matchup.homeTeam.color
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-xs"
                    style={{ backgroundColor: matchup.awayTeam.color }}
                  >
                    {matchup.awayTeam.abbr}
                  </div>
                  <span className="font-medium">{matchup.awayTeam.name}</span>
                </div>
                <span className="text-gray-400 font-bold">{matchup.awayTeam.odds}%</span>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-800 text-xs text-gray-500">
                <span>Volume: {matchup.volume}</span>
                <span>{matchup.bettors} bettors</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Why ProvePicks Section */}
      <div className="bg-gradient-to-b from-transparent to-orange-500/5 py-16">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
            Why ProvePicks?
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 hover:border-orange-500/30 transition text-center">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center text-orange-400 mb-4 mx-auto">
                <Trophy className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Prove Your Picks</h3>
              <p className="text-gray-400 text-sm">Verified on-chain records. No more screenshots.</p>
            </div>
            <div className="p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 hover:border-orange-500/30 transition text-center">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center text-orange-400 mb-4 mx-auto">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Follow Top Traders</h3>
              <p className="text-gray-400 text-sm">See what the best predictors are betting on.</p>
            </div>
            <div className="p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 hover:border-orange-500/30 transition text-center">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center text-orange-400 mb-4 mx-auto">
                <TrendingUp className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Live Leaderboards</h3>
              <p className="text-gray-400 text-sm">Compete for the top spots and build reputation.</p>
            </div>
            <div className="p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 hover:border-orange-500/30 transition text-center">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center text-orange-400 mb-4 mx-auto">
                <DollarSign className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Transparent Stats</h3>
              <p className="text-gray-400 text-sm">Win rates, streaks, and P&L - all verifiable.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Matrix Section */}
      <div className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">
            How We Compare
          </h2>
          <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
            ProvePicks is built different. See how we stack up against traditional fantasy and betting platforms.
          </p>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-4 px-4 text-gray-400 font-medium">Feature</th>
                  {competitors.map((comp) => (
                    <th key={comp.name} className="py-4 px-3 text-center">
                      {comp.isProvePicks ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
                            <Zap className="h-4 w-4 text-white" />
                          </div>
                          <span className="font-bold text-orange-400">ProvePicks</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <div className="h-16 w-16 rounded-lg bg-white/10 overflow-hidden flex items-center justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                              src={comp.logo || ''} 
                              alt={comp.name} 
                              className="h-14 w-14 object-contain"
                            />
                          </div>
                          <span className="text-xs text-gray-500">{comp.name}</span>
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((row, i) => (
                  <tr key={i} className="border-b border-gray-800/50 hover:bg-white/5">
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-medium text-white">{row.feature}</p>
                        <p className="text-xs text-gray-500">{row.description}</p>
                      </div>
                    </td>
                    <td className="py-4 px-3 text-center">
                      {row.provePicks === "yes" ? (
                        <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-green-500/20">
                          <Check className="h-5 w-5 text-green-400" />
                        </div>
                      ) : row.provePicks === "partial" ? (
                        <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-yellow-500/20">
                          <Minus className="h-5 w-5 text-yellow-400" />
                        </div>
                      ) : (
                        <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-red-500/20">
                          <X className="h-5 w-5 text-red-400" />
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-3 text-center">
                      {row.draftkings === "yes" ? (
                        <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-green-500/20">
                          <Check className="h-5 w-5 text-green-400" />
                        </div>
                      ) : row.draftkings === "partial" ? (
                        <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-yellow-500/20">
                          <Minus className="h-5 w-5 text-yellow-400" />
                        </div>
                      ) : (
                        <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-red-500/20">
                          <X className="h-5 w-5 text-red-400" />
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-3 text-center">
                      {row.underdog === "yes" ? (
                        <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-green-500/20">
                          <Check className="h-5 w-5 text-green-400" />
                        </div>
                      ) : row.underdog === "partial" ? (
                        <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-yellow-500/20">
                          <Minus className="h-5 w-5 text-yellow-400" />
                        </div>
                      ) : (
                        <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-red-500/20">
                          <X className="h-5 w-5 text-red-400" />
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-3 text-center">
                      {row.fanduel === "yes" ? (
                        <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-green-500/20">
                          <Check className="h-5 w-5 text-green-400" />
                        </div>
                      ) : row.fanduel === "partial" ? (
                        <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-yellow-500/20">
                          <Minus className="h-5 w-5 text-yellow-400" />
                        </div>
                      ) : (
                        <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-red-500/20">
                          <X className="h-5 w-5 text-red-400" />
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-3 text-center">
                      {row.prizepicks === "yes" ? (
                        <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-green-500/20">
                          <Check className="h-5 w-5 text-green-400" />
                        </div>
                      ) : row.prizepicks === "partial" ? (
                        <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-yellow-500/20">
                          <Minus className="h-5 w-5 text-yellow-400" />
                        </div>
                      ) : (
                        <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-red-500/20">
                          <X className="h-5 w-5 text-red-400" />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {comparisonFeatures.map((row, i) => (
              <div key={i} className="bg-[#111111] rounded-xl border border-gray-800 p-4">
                <div className="mb-3">
                  <p className="font-medium text-white">{row.feature}</p>
                  <p className="text-xs text-gray-500">{row.description}</p>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { name: "ProvePicks", value: row.provePicks, highlight: true, logo: null, isProvePicks: true },
                    { name: "DraftKings", value: row.draftkings, logo: competitors[1].logo },
                    { name: "Underdog", value: row.underdog, logo: competitors[2].logo },
                    { name: "FanDuel", value: row.fanduel, logo: competitors[3].logo },
                    { name: "PrizePicks", value: row.prizepicks, logo: competitors[4].logo },
                  ].map((item, j) => (
                    <div key={j} className="flex flex-col items-center gap-2">
                      {/* Logo */}
                      {item.isProvePicks ? (
                        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
                          <Zap className="h-5 w-5 text-white" />
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-white/10 overflow-hidden flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={item.logo || ''} 
                            alt={item.name} 
                            className="h-8 w-8 object-contain"
                          />
                        </div>
                      )}
                      {/* Status */}
                      {item.value === "yes" ? (
                        <div className="h-6 w-6 rounded-full bg-green-500/20 flex items-center justify-center">
                          <Check className="h-4 w-4 text-green-400" />
                        </div>
                      ) : item.value === "partial" ? (
                        <div className="h-6 w-6 rounded-full bg-yellow-500/20 flex items-center justify-center">
                          <Minus className="h-4 w-4 text-yellow-400" />
                        </div>
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-red-500/20 flex items-center justify-center">
                          <X className="h-4 w-4 text-red-400" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex justify-center gap-6 mt-8 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="h-3 w-3 text-green-400" />
              </div>
              <span className="text-gray-400">Full Support</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <Minus className="h-3 w-3 text-yellow-400" />
              </div>
              <span className="text-gray-400">Partial</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-full bg-red-500/20 flex items-center justify-center">
                <X className="h-3 w-3 text-red-400" />
              </div>
              <span className="text-gray-400">Not Available</span>
            </div>
          </div>
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
