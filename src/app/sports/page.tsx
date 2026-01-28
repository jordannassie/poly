import { CategoryTabs } from "@/components/CategoryTabs";
import { MarketCard } from "@/components/MarketCard";
import { SportsSidebar } from "@/components/SportsSidebar";
import { TopNav } from "@/components/TopNav";
import { StatsPanel } from "@/components/StatsPanel";
import { CommentsPanel } from "@/components/CommentsPanel";
import { MainFooter } from "@/components/MainFooter";
import { markets } from "@/lib/mockData";

const sportsMarkets = markets.filter((market) => market.category === "Sports");

export default function SportsPage() {
  return (
    <div className="min-h-screen bg-[color:var(--app-bg)] text-[color:var(--text-strong)]">
      <TopNav />
      <CategoryTabs activeLabel="Sports" />
      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <div className="flex gap-6">
          <SportsSidebar />
          <section className="flex-1 space-y-4">
            <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface)] p-4">
              <div className="text-sm text-[color:var(--text-muted)] mb-2">
                Sports • NFL
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-lg font-semibold">Seahawks vs Patriots</div>
                  <div className="text-xs text-[color:var(--text-subtle)]">
                    Feb 8 • 3:30 PM
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="rounded-lg bg-[color:var(--yes)] px-4 py-2 text-white">
                    SEA 69¢
                  </div>
                  <div className="rounded-lg bg-[color:var(--surface-2)] px-4 py-2 text-[color:var(--text-strong)]">
                    NE 32¢
                  </div>
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sportsMarkets.map((market) => (
                <MarketCard key={market.slug} market={market} />
              ))}
              {markets
                .filter((market) => market.category !== "Sports")
                .slice(0, 2)
                .map((market) => (
                  <MarketCard key={market.slug} market={market} />
                ))}
            </div>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <StatsPanel title="Sports stats" />
              <CommentsPanel />
            </div>
          </section>
        </div>
      </main>
      <MainFooter />
    </div>
  );
}
