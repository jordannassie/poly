import { TopNav } from "@/components/TopNav";
import { CategoryTabs } from "@/components/CategoryTabs";
import { MarketCard } from "@/components/MarketCard";
import { Leaderboard } from "@/components/Leaderboard";
import { Achievements } from "@/components/Achievements";
import { UserLevel } from "@/components/UserLevel";
import { MainFooter } from "@/components/MainFooter";
import { markets } from "@/lib/mockData";

export default function Home() {
  return (
    <div className="min-h-screen bg-[color:var(--app-bg)] text-[color:var(--text-strong)]">
      <TopNav />
      <CategoryTabs activeLabel="Trending" />
      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 border border-[color:var(--border-soft)]">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">🎯 Predict & Win</h1>
              <p className="text-sm text-[color:var(--text-muted)]">
                Place bets on real-world events and earn rewards
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-500">+500 XP Today</span>
              <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-500">🔥 3 Day Streak</span>
            </div>
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              {markets.map((market) => (
                <MarketCard key={market.slug} market={market} />
              ))}
            </div>
          </div>
          <aside className="space-y-6">
            <UserLevel />
            <Leaderboard />
            <Achievements />
          </aside>
        </div>
      </main>
      <MainFooter />
    </div>
  );
}
