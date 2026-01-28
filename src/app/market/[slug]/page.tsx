import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryTabs } from "@/components/CategoryTabs";
import { OutcomeRow } from "@/components/OutcomeRow";
import { TopNav } from "@/components/TopNav";
import { TradePanel } from "@/components/TradePanel";
import { StatsPanel } from "@/components/StatsPanel";
import { CommentsPanel } from "@/components/CommentsPanel";
import { MainFooter } from "@/components/MainFooter";
import { getMarketBySlug } from "@/lib/mockData";

type MarketPageProps = {
  params: { slug: string };
};

export default function MarketPage({ params }: MarketPageProps) {
  const { slug } = params;
  const market = getMarketBySlug(slug);

  if (!market) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[color:var(--app-bg)] text-[color:var(--text-strong)]">
      <TopNav />
      <CategoryTabs activeLabel={market.category} />
      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="space-y-6">
            <Link
              href="/"
              className="text-sm text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)]"
            >
              ← Back to Movers
            </Link>
            <div className="space-y-3">
              <div className="text-2xl font-semibold">{market.title}</div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-[color:var(--surface-2)] px-3 py-1 text-xs text-[color:var(--text-muted)]">
                  {market.endDate}
                </span>
                <span className="rounded-full bg-[color:var(--surface-2)] px-3 py-1 text-xs text-[color:var(--text-muted)]">
                  Feb 28
                </span>
              </div>
              <div className="text-sm text-[color:var(--text-subtle)]">
                {market.volume}
              </div>
            </div>
            <div className="space-y-3">
              {market.outcomes.map((outcome) => (
                <OutcomeRow key={outcome.id} outcome={outcome} />
              ))}
            </div>
            <StatsPanel title="Market stats" />
            <CommentsPanel title="Trader comments" />
          </section>
          <aside className="lg:sticky lg:top-24 h-fit">
            <TradePanel market={market} />
          </aside>
        </div>
      </main>
      <MainFooter />
    </div>
  );
}
