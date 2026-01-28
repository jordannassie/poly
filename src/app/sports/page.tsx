import Link from "next/link";
import { CategoryTabs } from "@/components/CategoryTabs";
import { MarketCard } from "@/components/MarketCard";
import { SportsSidebar } from "@/components/SportsSidebar";
import { TopNav } from "@/components/TopNav";
import { MainFooter } from "@/components/MainFooter";
import { Button } from "@/components/ui/button";
import { markets } from "@/lib/mockData";
import { Radio, Play, ChevronRight } from "lucide-react";

const sportsMarkets = markets.filter((market) => market.category === "Sports");

const moreGames = [
  { time: "Today 11:00 AM", volume: "$0.0 Vol.", team1: "ex-GANK Esports", team2: "777", price1: "76¢", price2: "25¢" },
  { time: "Today 11:00 AM", volume: "$0.0 Vol.", team1: "OLDBOYS", team2: "RUSH", price1: "61¢", price2: "40¢" },
  { time: "Today 2:00 PM", volume: "$12.5k Vol.", team1: "Team Liquid", team2: "Fnatic", price1: "52¢", price2: "49¢" },
];

export default function SportsPage() {
  return (
    <div className="min-h-screen bg-[color:var(--app-bg)] text-[color:var(--text-strong)]">
      <TopNav />
      <CategoryTabs activeLabel="Sports" />
      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <div className="flex gap-6">
          <SportsSidebar />
          <section className="flex-1 space-y-6">
            {/* Breadcrumb */}
            <div className="text-sm text-[color:var(--text-muted)]">
              Sports <ChevronRight className="h-3 w-3 inline" /> NFL
            </div>

            {/* Featured Matchup Card */}
            <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface)] overflow-hidden">
              <div className="p-6">
                {/* Live badge */}
                <div className="flex items-center justify-center gap-2 mb-6">
                  <span className="flex items-center gap-1 text-green-500 text-sm font-semibold">
                    <Radio className="h-3 w-3 animate-pulse" />
                    LIVE
                  </span>
                  <span className="text-[color:var(--text-muted)] text-sm">Game 3 • Best of 3</span>
                </div>

                {/* Teams */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col items-center gap-2 flex-1">
                    <div className="h-20 w-20 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white text-2xl font-bold">
                      SEA
                    </div>
                    <span className="font-semibold">Seahawks</span>
                    <span className="text-xs text-[color:var(--text-muted)]">27.8%</span>
                  </div>

                  <div className="flex flex-col items-center gap-2">
                    <div className="text-4xl font-bold">1 - 1</div>
                    {/* Progress bar */}
                    <div className="w-32 h-2 rounded-full overflow-hidden flex">
                      <div className="bg-blue-500 h-full" style={{ width: "27.8%" }} />
                      <div className="bg-red-500 h-full" style={{ width: "72.2%" }} />
                    </div>
                    <div className="text-xs text-[color:var(--text-muted)]">$595.49k Vol.</div>
                    <span className="text-green-500 text-sm font-semibold">+ $198</span>
                  </div>

                  <div className="flex flex-col items-center gap-2 flex-1">
                    <div className="h-20 w-20 rounded-xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-white text-2xl font-bold">
                      NE
                    </div>
                    <span className="font-semibold">Patriots</span>
                    <span className="text-xs text-[color:var(--text-muted)]">72.2%</span>
                  </div>
                </div>

                {/* Watch Stream */}
                <div className="flex justify-center mt-6">
                  <Button variant="outline" className="gap-2 border-[color:var(--border-soft)]">
                    <Play className="h-4 w-4" />
                    Watch Stream
                  </Button>
                </div>
              </div>

              {/* Betting options */}
              <div className="border-t border-[color:var(--border-soft)] divide-y divide-[color:var(--border-soft)]">
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-semibold">Moneyline</div>
                    <div className="text-xs text-[color:var(--text-muted)]">$337k Vol.</div>
                  </div>
                  <div className="flex gap-2">
                    <Button className="bg-green-600 hover:bg-green-700 text-white">SEA 28.7¢</Button>
                    <Button className="bg-[color:var(--surface-2)] hover:bg-[color:var(--surface-3)] text-[color:var(--text-strong)]">NE 73.0¢</Button>
                  </div>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-semibold">Quarter 1 Winner</div>
                    <div className="text-xs text-[color:var(--text-muted)]">$258k Vol.</div>
                  </div>
                  <div className="flex gap-2">
                    <Button className="bg-green-600 hover:bg-green-700 text-white">SEA 0¢</Button>
                    <Button className="bg-red-600 hover:bg-red-700 text-white">NE 0¢</Button>
                  </div>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-semibold">Point Spread</div>
                    <div className="text-xs text-[color:var(--text-muted)]">$249 Vol.</div>
                  </div>
                  <div className="flex gap-2">
                    <Button className="bg-[color:var(--surface-2)] hover:bg-[color:var(--surface-3)] text-[color:var(--text-strong)]">SEA -1.5 0¢</Button>
                    <Button className="bg-[color:var(--surface-2)] hover:bg-[color:var(--surface-3)] text-[color:var(--text-strong)]">NE +1.5 0¢</Button>
                  </div>
                </div>
              </div>
            </div>
                        {/* More Games */}
            <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface)] p-4">
              <h3 className="font-semibold mb-4">More NFL Games</h3>
              <div className="space-y-3">
                {moreGames.map((game, index) => (
                  <Link
                    key={index}
                    href="/market/seahawks-vs-patriots"
                    className="flex items-center justify-between p-3 rounded-xl bg-[color:var(--surface-2)] hover:bg-[color:var(--surface-3)] transition"
                  >
                    <div>
                      <div className="text-xs text-[color:var(--text-muted)]">{game.time} • {game.volume}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="h-6 w-6 rounded bg-gradient-to-br from-purple-500 to-pink-500" />
                        <span className="font-medium">{game.team1}</span>
                        <span className="text-[color:var(--text-muted)]">vs</span>
                        <div className="h-6 w-6 rounded bg-gradient-to-br from-orange-500 to-red-500" />
                        <span className="font-medium">{game.team2}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-500 font-semibold">{game.price1}</span>
                      <span className="text-[color:var(--text-muted)]">/</span>
                      <span className="text-red-500 font-semibold">{game.price2}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Market Cards Grid */}
            <div className="grid gap-4 sm:grid-cols-2">
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
          </section>
        </div>
      </main>
      <MainFooter />
    </div>
  );
}
