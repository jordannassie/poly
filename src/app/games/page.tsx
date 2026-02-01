"use client";

import Link from "next/link";
import { TopNav } from "@/components/TopNav";
import { MainFooter } from "@/components/MainFooter";
import { CircleDot, Shield, Sparkles, TrendingUp } from "lucide-react";

export default function GamesPage() {
  return (
    <div className="min-h-screen bg-[color:var(--app-bg)] text-[color:var(--text-strong)]">
      <TopNav />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            Games
          </h1>
          <p className="text-lg text-[color:var(--text-muted)] max-w-2xl mx-auto">
            Provably fair games with transparent odds. Every outcome is verifiable.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-green-500" />
            </div>
            <h3 className="font-semibold mb-2">Provably Fair</h3>
            <p className="text-sm text-[color:var(--text-muted)]">
              Verify every outcome using cryptographic proofs
            </p>
          </div>
          <div className="bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-blue-500/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-blue-500" />
            </div>
            <h3 className="font-semibold mb-2">96% RTP</h3>
            <p className="text-sm text-[color:var(--text-muted)]">
              Transparent return-to-player across all modes
            </p>
          </div>
          <div className="bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-purple-500/10 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-purple-500" />
            </div>
            <h3 className="font-semibold mb-2">Instant Payouts</h3>
            <p className="text-sm text-[color:var(--text-muted)]">
              Winnings credited immediately to your balance
            </p>
          </div>
        </div>

        {/* Games Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Plinko Card */}
          <Link href="/games/plinko" className="group">
            <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 border border-purple-500/30 rounded-xl overflow-hidden hover:border-purple-500/60 transition-all hover:scale-[1.02]">
              <div className="aspect-video bg-gradient-to-b from-[#0f1419] to-[#1a1d23] flex items-center justify-center relative">
                {/* Plinko visualization */}
                <div className="relative w-32 h-32">
                  {[0, 1, 2, 3, 4].map(row => (
                    <div key={row} className="flex justify-center gap-4" style={{ marginTop: row === 0 ? 0 : 8 }}>
                      {Array(row + 3).fill(0).map((_, i) => (
                        <div key={i} className="w-2 h-2 rounded-full bg-white/80" />
                      ))}
                    </div>
                  ))}
                </div>
                {/* Ball */}
                <div className="absolute top-8 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 animate-bounce" />
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CircleDot className="h-5 w-5 text-purple-400" />
                  <h3 className="text-lg font-bold">Plinko</h3>
                </div>
                <p className="text-sm text-[color:var(--text-muted)] mb-3">
                  Drop the ball and win up to 25x
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">
                    96% RTP
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-400">
                    3 Modes
                  </span>
                </div>
              </div>
            </div>
          </Link>

          {/* Coming Soon Card */}
          <div className="bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl overflow-hidden opacity-50">
            <div className="aspect-video bg-[color:var(--surface-2)] flex items-center justify-center">
              <span className="text-4xl">🎲</span>
            </div>
            <div className="p-4">
              <h3 className="text-lg font-bold mb-2">More Games</h3>
              <p className="text-sm text-[color:var(--text-muted)]">
                Coming soon...
              </p>
            </div>
          </div>
        </div>

        {/* Transparency Section */}
        <div className="mt-12 bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4">Transparency</h2>
          <p className="text-[color:var(--text-muted)] mb-4">
            All game outcomes are determined using a provably fair system. Before each session, 
            we commit to a server seed hash. You can verify that outcomes match the committed hash 
            after each play.
          </p>
          <Link 
            href="/api/games/plinko/rtp" 
            target="_blank"
            className="text-purple-400 hover:text-purple-300 text-sm font-medium"
          >
            View RTP calculations →
          </Link>
        </div>
      </main>

      <MainFooter />
    </div>
  );
}
