"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { TopNav } from "@/components/TopNav";
import { SportsSidebar } from "@/components/SportsSidebar";
import { TradePanel } from "@/components/TradePanel";
import { MainFooter } from "@/components/MainFooter";
import { HeadToHeadChart } from "@/components/HeadToHeadChart";
import { CountdownTimer } from "@/components/CountdownTimer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getMarketBySlug, sportsGames, demoComments } from "@/lib/mockData";
import { Settings, Code, Bookmark, Share2, Heart, MoreHorizontal, ChevronRight } from "lucide-react";

type MarketPageProps = {
  params: { slug: string };
};

export default function MarketPage({ params }: MarketPageProps) {
  const { slug } = params;
  
  // Try to find as a sports game first
  const sportsGame = sportsGames.find((g) => g.id === slug);
  const market = getMarketBySlug(slug);

  if (!sportsGame && !market) {
    notFound();
  }

  // If it's a sports game, render sports-specific layout
  if (sportsGame) {
    const formattedMarket = {
      slug: sportsGame.id,
      title: `${sportsGame.team1.name} vs ${sportsGame.team2.name}`,
      category: sportsGame.league,
      volume: sportsGame.volume,
      endDate: `${sportsGame.date} ${sportsGame.gameTime}`,
      outcomes: [
        {
          id: sportsGame.team1.abbr.toLowerCase(),
          name: sportsGame.team1.name,
          prob: sportsGame.team1.odds,
          yesPrice: sportsGame.team1.odds,
          noPrice: 100 - sportsGame.team1.odds,
          volume: sportsGame.volume,
        },
        {
          id: sportsGame.team2.abbr.toLowerCase(),
          name: sportsGame.team2.name,
          prob: sportsGame.team2.odds,
          yesPrice: sportsGame.team2.odds,
          noPrice: 100 - sportsGame.team2.odds,
          volume: sportsGame.volume,
        },
      ],
      sparkline: [],
    };

    return (
      <div className="min-h-screen bg-[color:var(--app-bg)] text-[color:var(--text-strong)]">
        <TopNav />

        <div className="flex">
          {/* Sidebar */}
          <SportsSidebar activeSport="nfl" />

          {/* Main Content */}
          <main className="flex-1 p-6">
            <div className="max-w-4xl">
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-sm text-[color:var(--text-muted)] mb-4">
                <Link href="/sports" className="hover:text-[color:var(--text-strong)]">
                  Sports
                </Link>
                <ChevronRight className="h-4 w-4" />
                <span>{sportsGame.league}</span>
              </div>

              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">
                  {sportsGame.team1.name} vs {sportsGame.team2.name}
                </h1>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon">
                    <Settings className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Code className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Bookmark className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Share2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Head to Head Chart */}
              <HeadToHeadChart
                team1={sportsGame.team1}
                team2={sportsGame.team2}
                gameTime={`${sportsGame.date} ${sportsGame.gameTime}`}
                volume={sportsGame.volume}
              />

              {/* Betting Tabs */}
              <div className="mt-6">
                <Tabs defaultValue="game-lines">
                  <TabsList className="bg-[color:var(--surface)] border border-[color:var(--border-soft)] p-1">
                    <TabsTrigger value="game-lines" className="data-[state=active]:bg-[color:var(--surface-2)]">
                      Game Lines
                    </TabsTrigger>
                    <TabsTrigger value="1st-half" className="data-[state=active]:bg-[color:var(--surface-2)]">
                      1st Half
                    </TabsTrigger>
                    <TabsTrigger value="team-totals" className="data-[state=active]:bg-[color:var(--surface-2)]">
                      Team Totals
                    </TabsTrigger>
                    <TabsTrigger value="touchdowns" className="data-[state=active]:bg-[color:var(--surface-2)]">
                      Touchdowns
                    </TabsTrigger>
                    <TabsTrigger value="rushing" className="data-[state=active]:bg-[color:var(--surface-2)]">
                      Rushing
                    </TabsTrigger>
                    <TabsTrigger value="receiving" className="data-[state=active]:bg-[color:var(--surface-2)]">
                      Receiving
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Betting Options */}
              <div className="mt-6 space-y-4">
                {/* Moneyline */}
                <div className="bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-semibold">Moneyline</div>
                      <div className="text-sm text-[color:var(--text-subtle)]">$1m Vol.</div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white h-12">
                      {sportsGame.team1.abbr} {sportsGame.team1.odds}¢
                    </Button>
                    <Button variant="outline" className="flex-1 h-12 border-[color:var(--border-soft)]">
                      {sportsGame.team2.abbr} {sportsGame.team2.odds}¢
                    </Button>
                  </div>
                </div>

                {/* Spreads */}
                {sportsGame.spread && (
                  <div className="bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-semibold">Spreads</div>
                        <div className="text-sm text-[color:var(--text-subtle)]">$800k Vol.</div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1 flex items-center justify-between px-4 py-3 bg-[color:var(--surface-2)] rounded-lg">
                        <span className="text-[color:var(--text-muted)]">
                          {sportsGame.team1.abbr} {sportsGame.spread.team1}
                        </span>
                        <span className="font-semibold">{sportsGame.spread.odds1}¢</span>
                      </div>
                      <div className="flex-1 flex items-center justify-between px-4 py-3 bg-[color:var(--surface-2)] rounded-lg">
                        <span className="text-[color:var(--text-muted)]">
                          {sportsGame.team2.abbr} {sportsGame.spread.team2}
                        </span>
                        <span className="font-semibold">{sportsGame.spread.odds2}¢</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Totals */}
                {sportsGame.total && (
                  <div className="bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-semibold">Totals</div>
                        <div className="text-sm text-[color:var(--text-subtle)]">$650k Vol.</div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1 flex items-center justify-between px-4 py-3 bg-[color:var(--surface-2)] rounded-lg">
                        <span className="text-[color:var(--text-muted)]">Over {sportsGame.total.over}</span>
                        <span className="font-semibold">{sportsGame.total.odds1}¢</span>
                      </div>
                      <div className="flex-1 flex items-center justify-between px-4 py-3 bg-[color:var(--surface-2)] rounded-lg">
                        <span className="text-[color:var(--text-muted)]">Under {sportsGame.total.under}</span>
                        <span className="font-semibold">{sportsGame.total.odds2}¢</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Player Props */}
                <div className="bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-semibold">Player Props</div>
                      <div className="text-sm text-[color:var(--text-subtle)]">68 markets</div>
                    </div>
                    <Button variant="ghost" size="sm">
                      View All <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-[color:var(--surface-2)] rounded-lg">
                      <div className="text-sm text-[color:var(--text-muted)]">QB Passing Yards</div>
                      <div className="font-semibold mt-1">Over 275.5</div>
                    </div>
                    <div className="p-3 bg-[color:var(--surface-2)] rounded-lg">
                      <div className="text-sm text-[color:var(--text-muted)]">Total TDs</div>
                      <div className="font-semibold mt-1">Over 4.5</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comments */}
              <div className="mt-8 bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl p-4">
                <div className="flex items-center gap-3 mb-4">
                  <Input
                    placeholder="Add a comment"
                    className="flex-1 bg-[color:var(--surface-2)] border-[color:var(--border-soft)]"
                  />
                  <Button className="bg-[color:var(--accent)] hover:bg-[color:var(--accent-strong)] text-white">
                    Post
                  </Button>
                </div>

                <div className="space-y-4">
                  {demoComments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                        {comment.user.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{comment.user}</span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              comment.tag === "Yes"
                                ? "bg-green-500/20 text-green-500"
                                : "bg-red-500/20 text-red-500"
                            }`}
                          >
                            {comment.tag}
                          </span>
                          <span className="text-xs text-[color:var(--text-subtle)]">
                            {comment.time}
                          </span>
                          <button className="ml-auto">
                            <MoreHorizontal className="h-4 w-4 text-[color:var(--text-muted)]" />
                          </button>
                        </div>
                        <p className="text-sm text-[color:var(--text-muted)]">{comment.message}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-[color:var(--text-muted)]">
                          <button className="flex items-center gap-1 hover:text-[color:var(--text-strong)]">
                            <Heart className="h-4 w-4" /> 0
                          </button>
                          <button className="hover:text-[color:var(--text-strong)]">Reply</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </main>

          {/* Trade Panel */}
          <div className="w-80 flex-shrink-0 p-6 border-l border-[color:var(--border-soft)]">
            <div className="sticky top-6">
              <div className="mb-4 p-4 bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: sportsGame.team1.color }}
                  >
                    {sportsGame.team1.abbr}
                  </div>
                  <div>
                    <div className="font-semibold">
                      {sportsGame.team1.name} vs {sportsGame.team2.name}
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-500">
                      {sportsGame.team1.name}
                    </span>
                  </div>
                </div>
              </div>

              <TradePanel market={formattedMarket} />
            </div>
          </div>
        </div>

        <MainFooter />
      </div>
    );
  }

  // Fallback to generic market layout for non-sports markets
  if (!market) {
    notFound();
  }

  const formattedMarket = {
    ...market,
    outcomes: market.outcomes.map((o) => ({
      ...o,
      volume: o.volume,
    })),
  };

  return (
    <div className="min-h-screen bg-[color:var(--app-bg)] text-[color:var(--text-strong)]">
      <TopNav />

      <div className="flex">
        <SportsSidebar />

        <main className="flex-1 p-6">
          <div className="max-w-4xl">
            <Link
              href="/"
              className="inline-flex items-center text-sm text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)] mb-4"
            >
              ← Back to Markets
            </Link>

            <h1 className="text-2xl font-bold mb-4">{market.title}</h1>

            <CountdownTimer endDate={market.endDate} variant="full" />

            <div className="mt-6 space-y-3">
              {market.outcomes.map((outcome) => (
                <div
                  key={outcome.id}
                  className="flex items-center justify-between gap-4 rounded-xl bg-[color:var(--surface)] border border-[color:var(--border-soft)] p-4"
                >
                  <div>
                    <div className="font-semibold">{outcome.name}</div>
                    <div className="text-sm text-[color:var(--text-subtle)]">{outcome.volume}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-2xl font-bold">{outcome.prob}%</div>
                    <Button className="bg-green-600 hover:bg-green-700 text-white">
                      Yes {outcome.yesPrice}¢
                    </Button>
                    <Button className="bg-red-600 hover:bg-red-700 text-white">
                      No {outcome.noPrice}¢
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>

        <div className="w-80 flex-shrink-0 p-6 border-l border-[color:var(--border-soft)]">
          <TradePanel market={formattedMarket} />
        </div>
      </div>

      <MainFooter />
    </div>
  );
}
