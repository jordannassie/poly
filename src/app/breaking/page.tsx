import { CategoryTabs } from "@/components/CategoryTabs";
import { TopNav } from "@/components/TopNav";
import { StatsPanel } from "@/components/StatsPanel";
import { CommentsPanel } from "@/components/CommentsPanel";
import { MainFooter } from "@/components/MainFooter";
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
    <div className="min-h-screen bg-[color:var(--app-bg)] text-[color:var(--text-strong)]">
      <TopNav />
      <CategoryTabs activeLabel="Breaking" />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 space-y-6">
        <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface)] p-6 flex items-center justify-between">
          <div>
            <div className="text-xs text-[color:var(--text-subtle)] mb-2">
              Jan 28, 2026
            </div>
            <div className="text-2xl font-semibold">Breaking News</div>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-[color:var(--surface-3)] flex items-center justify-center text-xl">
              ⬇
            </div>
            <div className="h-14 w-14 rounded-full bg-[color:var(--accent)] text-white flex items-center justify-center text-xl">
              ⬆
            </div>
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="space-y-4">
            {movers.map((market) => (
              <div
                key={market.slug}
                className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface)] p-4 flex items-center justify-between"
              >
                <div>
                  <div className="text-sm font-semibold">{market.title}</div>
                  <div className="text-xs text-[color:var(--text-subtle)]">
                    {market.volume}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-lg font-semibold">
                    {market.outcomes[0]?.prob ?? 0}%
                  </div>
                  <div className="flex h-6 items-end gap-1">
                    {market.sparkline?.map((point, index) => (
                      <div
                        key={`${market.slug}-spark-${index}`}
                        className="w-1 rounded-sm bg-[color:var(--yes)]/70"
                        style={{ height: `${Math.max(6, point / 2)}px` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </section>
          <aside className="space-y-4">
            <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface)] p-4">
              <div className="flex items-center justify-between text-sm text-[color:var(--text-muted)]">
                <span>Live from @provepicks</span>
                <span className="rounded-full bg-[color:var(--surface-2)] px-2 py-1 text-xs">
                  Follow on X
                </span>
              </div>
              <div className="mt-4 space-y-4">
                {liveFeed.map((item) => (
                  <div key={item.time} className="space-y-1">
                    <div className="text-xs text-[color:var(--text-subtle)]">
                      {item.time}
                    </div>
                    <div className="text-sm">{item.headline}</div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <StatsPanel title="Breaking stats" />
          <CommentsPanel title="User comments" />
        </div>
      </main>
      <MainFooter />
    </div>
  );
}
