import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryTabs } from "@/components/CategoryTabs";
import { OutcomeRow } from "@/components/OutcomeRow";
import { TopNav } from "@/components/TopNav";
import { TradePanel } from "@/components/TradePanel";
import { MainFooter } from "@/components/MainFooter";
import { MultiLineChart } from "@/components/MultiLineChart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { demoComments, getMarketBySlug, markets } from "@/lib/mockData";
import { Eye, Bookmark, TrendingUp, TrendingDown } from "lucide-react";

const outcomeColors = ["#3b82f6", "#f97316", "#ef4444", "#22c55e", "#a855f7"];

type MarketPageProps = {
  params: { slug: string };
};

export default function MarketPage({ params }: MarketPageProps) {
  const { slug } = params;
  const market = getMarketBySlug(slug);
  const relatedMarkets = markets.filter((item) => item.slug !== slug).slice(0, 3);

  if (!market) {
    notFound();
  }

  // Generate smooth chart data for each outcome
  const chartLines = market.outcomes.map((outcome, index) => ({
    name: outcome.name,
    color: outcomeColors[index % outcomeColors.length],
    data: Array.from({ length: 20 }, (_, i) => {
      const base = outcome.prob;
      // Smooth sine wave without random noise
      const wave = Math.sin(i * 0.3 + index * 2) * 12;
      const trend = (i / 19) * 8 - 4; // Slight trend over time
      return Math.max(5, Math.min(95, base + wave + trend));
    }),
    currentValue: outcome.prob,
  }));

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
            {/* Header with title and actions */}
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                {market.title.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl font-bold">{market.title}</h1>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Bookmark className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="rounded-full bg-[color:var(--surface-2)] px-3 py-1 text-xs text-[color:var(--text-muted)]">
                    {market.endDate}
                  </span>
                  <span className="rounded-full bg-[color:var(--surface-2)] px-3 py-1 text-xs text-[color:var(--text-muted)]">
                    Feb 28
                  </span>
                </div>
              </div>
            </div>

            {/* Multi-line chart */}
            <MultiLineChart lines={chartLines} />

            {/* Volume stats */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-[color:var(--text-muted)]">{market.volume}</span>
              </div>
            </div>

            {/* Outcomes list */}
            <div className="space-y-3">
              {market.outcomes.map((outcome, index) => (
                <div
                  key={outcome.id}
                  className="flex items-center justify-between gap-4 rounded-xl bg-[color:var(--surface)] border border-[color:var(--border-soft)] p-4 hover:border-[color:var(--border-strong)] transition"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-1 h-10 rounded-full"
                      style={{ backgroundColor: outcomeColors[index % outcomeColors.length] }}
                    />
                    <div>
                      <div className="font-semibold">{outcome.name}</div>
                      <div className="text-xs text-[color:var(--text-subtle)]">
                        {outcome.volume}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-2xl font-bold">{outcome.prob}%</div>
                      <div className="flex items-center gap-1 text-xs">
                        {outcome.prob > 50 ? (
                          <TrendingUp className="h-3 w-3 text-green-500" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-500" />
                        )}
                        <span className={outcome.prob > 50 ? "text-green-500" : "text-red-500"}>
                          {outcome.prob > 50 ? "+" : ""}{(outcome.prob - 50).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button className="bg-green-600 hover:bg-green-700 text-white h-9 px-4">
                        Buy Yes {outcome.yesPrice}¢
                      </Button>
                      <Button className="bg-red-600 hover:bg-red-700 text-white h-9 px-4">
                        Buy No {outcome.noPrice}¢
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Stats Grid */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface)] p-4">
                <div className="text-xs text-[color:var(--text-subtle)]">Volume</div>
                <div className="text-lg font-semibold">{market.volume}</div>
              </div>
              <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface)] p-4">
                <div className="text-xs text-[color:var(--text-subtle)]">Open interest</div>
                <div className="text-lg font-semibold">$412k</div>
              </div>
              <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface)] p-4">
                <div className="text-xs text-[color:var(--text-subtle)]">Traders</div>
                <div className="text-lg font-semibold">4,238</div>
              </div>
            </div>

            <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface)] p-6 space-y-4">
              <div className="text-sm font-semibold">Rules summary</div>
              <p className="text-sm text-[color:var(--text-muted)]">
                This market resolves to Yes if the specified outcome occurs by the
                resolution date. It resolves to No otherwise. Resolution sources
                are based on official announcements and widely reported results.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button className="bg-[color:var(--surface-2)] hover:bg-[color:var(--surface-3)] text-[color:var(--text-strong)]">
                  View full rules
                </Button>
                <Button className="bg-[color:var(--surface-2)] hover:bg-[color:var(--surface-3)] text-[color:var(--text-strong)]">
                  Help center
                </Button>
              </div>
            </div>
            <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface)] p-6 space-y-4">
              <div className="text-sm font-semibold">People are also buying</div>
              <div className="space-y-3">
                {relatedMarkets.map((item) => (
                  <Link
                    key={item.slug}
                    href={`/market/${item.slug}`}
                    className="flex items-center justify-between rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] p-4"
                  >
                    <div>
                      <div className="text-sm font-semibold">{item.title}</div>
                      <div className="text-xs text-[color:var(--text-subtle)]">
                        {item.volume}
                      </div>
                    </div>
                    <div className="text-sm text-[color:var(--text-muted)]">
                      {item.outcomes[0]?.prob ?? 0}%
                    </div>
                  </Link>
                ))}
              </div>
              <Button className="bg-[color:var(--surface-2)] hover:bg-[color:var(--surface-3)] text-[color:var(--text-strong)]">
                Show more
              </Button>
            </div>
            <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface)] p-6 space-y-4">
              <Tabs defaultValue="ideas">
                <TabsList className="grid grid-cols-2 bg-[color:var(--surface-2)]">
                  <TabsTrigger value="ideas">Ideas</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] p-4 space-y-3">
                <Input
                  placeholder="What’s your prediction?"
                  className="bg-[color:var(--surface)] border-[color:var(--border-soft)] text-[color:var(--text-strong)] placeholder:text-[color:var(--text-subtle)]"
                />
                <div className="flex items-center justify-between text-xs text-[color:var(--text-subtle)]">
                  <span>GIF</span>
                  <span>800 left</span>
                </div>
                <Button className="bg-[color:var(--accent)] hover:bg-[color:var(--accent-strong)] text-white">
                  Post
                </Button>
              </div>
              <div className="space-y-3">
                {demoComments.map((comment) => (
                  <div
                    key={comment.id}
                    className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] p-4"
                  >
                    <div className="flex items-center justify-between text-xs text-[color:var(--text-subtle)]">
                      <span>@{comment.user}</span>
                      <span>{comment.time}</span>
                    </div>
                    <div className="mt-2 text-sm text-[color:var(--text-strong)]">
                      {comment.message}
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
