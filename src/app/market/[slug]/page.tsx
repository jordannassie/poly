import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryTabs } from "@/components/CategoryTabs";
import { OutcomeRow } from "@/components/OutcomeRow";
import { TopNav } from "@/components/TopNav";
import { TradePanel } from "@/components/TradePanel";
import { MainFooter } from "@/components/MainFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { demoComments, getMarketBySlug, markets } from "@/lib/mockData";

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
            <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface)] p-6 space-y-4">
              <div className="text-sm font-semibold">Live odds</div>
              <div className="h-48 rounded-xl bg-[color:var(--surface-2)] border border-[color:var(--border-soft)] flex items-center justify-center text-sm text-[color:var(--text-subtle)]">
                Price chart placeholder
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] p-4">
                  <div className="text-xs text-[color:var(--text-subtle)]">Volume</div>
                  <div className="text-lg font-semibold">{market.volume}</div>
                </div>
                <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] p-4">
                  <div className="text-xs text-[color:var(--text-subtle)]">Open interest</div>
                  <div className="text-lg font-semibold">$412k</div>
                </div>
                <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] p-4">
                  <div className="text-xs text-[color:var(--text-subtle)]">Traders</div>
                  <div className="text-lg font-semibold">4,238</div>
                </div>
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
