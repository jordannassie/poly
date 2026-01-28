import { TopNav } from "@/components/TopNav";
import { CategoryTabs } from "@/components/CategoryTabs";
import { MarketCard } from "@/components/MarketCard";
import { StatsPanel } from "@/components/StatsPanel";
import { CommentsPanel } from "@/components/CommentsPanel";
import { MainFooter } from "@/components/MainFooter";
import { markets } from "@/lib/mockData";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0b1320] text-white">
      <TopNav />
      <CategoryTabs activeLabel="Trending" />
      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {markets.map((market) => (
            <MarketCard key={market.slug} market={market} />
          ))}
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <StatsPanel title="Trending stats" />
          <CommentsPanel />
        </div>
      </main>
      <MainFooter />
    </div>
  );
}
