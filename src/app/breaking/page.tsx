import { CategoryTabs } from "@/components/CategoryTabs";
import { TopNav } from "@/components/TopNav";
import { markets } from "@/lib/mockData";

const movers = markets.slice(0, 5);

const liveFeed = [
  {
    time: "Jan 28, 7:22 AM",
    headline: "Ilhan Omar town hall attack staged?",
  },
  {
    time: "Jan 28, 6:53 AM",
    headline:
      'The Islamic Regime responds to Trump: "IF PUSHED, IT WILL DEFEND ITSELF."',
  },
  {
    time: "Jan 28, 5:00 AM",
    headline: "Trump warns a massive Armada is heading to Iran.",
  },
  {
    time: "Jan 27, 6:34 PM",
    headline: "US strikes Iran by...? Markets spike in response.",
  },
];

export default function BreakingPage() {
  return (
    <div className="min-h-screen bg-[#0b1320] text-white">
      <TopNav />
      <CategoryTabs activeLabel="Breaking" />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 space-y-6">
        <div className="rounded-2xl border border-white/10 bg-[#111a27] p-6 flex items-center justify-between">
          <div>
            <div className="text-xs text-white/50 mb-2">Jan 28, 2026</div>
            <div className="text-2xl font-semibold">Breaking News</div>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-[#1e2a3d] flex items-center justify-center text-xl">
              ⬇
            </div>
            <div className="h-14 w-14 rounded-full bg-[#2d7ff9] flex items-center justify-center text-xl">
              ⬆
            </div>
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="space-y-4">
            {movers.map((market) => (
              <div
                key={market.slug}
                className="rounded-2xl border border-white/10 bg-[#111a27] p-4 flex items-center justify-between"
              >
                <div>
                  <div className="text-sm font-semibold">{market.title}</div>
                  <div className="text-xs text-white/50">{market.volume}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-lg font-semibold">
                    {market.outcomes[0]?.prob ?? 0}%
                  </div>
                  <div className="flex h-6 items-end gap-1">
                    {market.sparkline?.map((point, index) => (
                      <div
                        key={`${market.slug}-spark-${index}`}
                        className="w-1 rounded-sm bg-[#1b8f4b]/70"
                        style={{ height: `${Math.max(6, point / 2)}px` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </section>
          <aside className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-[#111a27] p-4">
              <div className="flex items-center justify-between text-sm text-white/60">
                <span>Live from @polymarket</span>
                <span className="rounded-full bg-white/10 px-2 py-1 text-xs">
                  Follow on X
                </span>
              </div>
              <div className="mt-4 space-y-4">
                {liveFeed.map((item) => (
                  <div key={item.time} className="space-y-1">
                    <div className="text-xs text-white/40">{item.time}</div>
                    <div className="text-sm">{item.headline}</div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
