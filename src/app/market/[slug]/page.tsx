import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryTabs } from "@/components/CategoryTabs";
import { OutcomeRow } from "@/components/OutcomeRow";
import { TopNav } from "@/components/TopNav";
import { TradePanel } from "@/components/TradePanel";
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
    <div className="min-h-screen bg-[#0b1320] text-white">
      <TopNav />
      <CategoryTabs activeLabel={market.category} />
      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="space-y-6">
            <Link href="/" className="text-sm text-white/60 hover:text-white">
              ← Back to Movers
            </Link>
            <div className="space-y-3">
              <div className="text-2xl font-semibold">{market.title}</div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
                  {market.endDate}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
                  Feb 28
                </span>
              </div>
              <div className="text-sm text-white/50">{market.volume}</div>
            </div>
            <div className="space-y-3">
              {market.outcomes.map((outcome) => (
                <OutcomeRow key={outcome.id} outcome={outcome} />
              ))}
            </div>
          </section>
          <aside className="lg:sticky lg:top-24 h-fit">
            <TradePanel market={market} />
          </aside>
        </div>
      </main>
    </div>
  );
}
