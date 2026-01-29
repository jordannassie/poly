"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TopNav } from "@/components/TopNav";
import { CategoryTabs } from "@/components/CategoryTabs";
import { SportsSidebar } from "@/components/SportsSidebar";
import { MainFooter } from "@/components/MainFooter";
import { TodayGames } from "@/components/sports/TodayGames";
import { UpcomingGames } from "@/components/sports/UpcomingGames";
import { TeamLogoGrid } from "@/components/sports/TeamLogoGrid";
import { sportsGames } from "@/lib/mockData";
import Link from "next/link";
import { TeamOutcomeButton } from "@/components/market/TeamOutcomeButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, ToggleRight, ChevronDown, MoreHorizontal, Heart, Loader2 } from "lucide-react";

// Valid leagues
const VALID_LEAGUES = ["nfl", "nba", "mlb", "nhl"] as const;
type ValidLeague = (typeof VALID_LEAGUES)[number];

// League display config
const LEAGUE_CONFIG: Record<ValidLeague, { name: string; icon: string; color: string }> = {
  nfl: { name: "NFL", icon: "🏈", color: "#013369" },
  nba: { name: "NBA", icon: "🏀", color: "#C9082A" },
  mlb: { name: "MLB", icon: "⚾", color: "#002D72" },
  nhl: { name: "NHL", icon: "🏒", color: "#000000" },
};

// Team logo lookup type
interface TeamInfo {
  abbreviation: string;
  logoUrl: string | null;
  primaryColor: string | null;
}

// Inner component that uses useSearchParams
function SportsPageContent() {
  const searchParams = useSearchParams();
  
  // Parse and validate league from URL
  const leagueParam = searchParams.get("league")?.toLowerCase() || "nfl";
  const league: ValidLeague = VALID_LEAGUES.includes(leagueParam as ValidLeague) 
    ? (leagueParam as ValidLeague) 
    : "nfl";
  
  const leagueConfig = LEAGUE_CONFIG[league];
  
  const [showSpreads, setShowSpreads] = useState(true);
  const [teamLogos, setTeamLogos] = useState<Map<string, TeamInfo>>(new Map());

  // Fetch team logos when league changes
  useEffect(() => {
    async function fetchTeamLogos() {
      try {
        const res = await fetch(`/api/sports/teams?league=${league}`);
        if (res.ok) {
          const data = await res.json();
          const logoMap = new Map<string, TeamInfo>();
          for (const team of data.teams) {
            logoMap.set(team.abbreviation, {
              abbreviation: team.abbreviation,
              logoUrl: team.logoUrl,
              primaryColor: team.primaryColor,
            });
          }
          setTeamLogos(logoMap);
        }
      } catch (error) {
        console.error("Failed to fetch team logos:", error);
      }
    }
    fetchTeamLogos();
  }, [league]);

  // Helper to get logo URL for a team abbreviation
  const getTeamLogo = (abbr: string): string | null => {
    return teamLogos.get(abbr)?.logoUrl || null;
  };

  return (
    <div className="min-h-screen bg-[color:var(--app-bg)] text-[color:var(--text-strong)]">
      <TopNav />
      <CategoryTabs activeLabel={leagueConfig.name} />

      <div className="flex flex-col lg:flex-row">
        {/* Sidebar */}
        <SportsSidebar activeSport={league} />

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 md:mb-6">
              <div className="flex items-center gap-2 md:gap-3">
                <span className="text-xl md:text-2xl">{leagueConfig.icon}</span>
                <h1 className="text-xl md:text-2xl font-bold">{leagueConfig.name}</h1>
              </div>
              <div className="flex items-center gap-2 md:gap-4">
                <Button variant="ghost" size="icon" className="h-8 w-8 md:h-9 md:w-9">
                  <Settings className="h-4 w-4 md:h-5 md:w-5" />
                </Button>
                <button
                  onClick={() => setShowSpreads(!showSpreads)}
                  className="flex items-center gap-1.5 md:gap-2 bg-[color:var(--surface-2)] rounded-full px-3 md:px-4 py-1.5 md:py-2"
                >
                  <ToggleRight className={`h-4 w-4 md:h-5 md:w-5 ${showSpreads ? "text-green-500" : "text-[color:var(--text-muted)]"}`} />
                  <span className="text-xs md:text-sm hidden sm:inline">Show Spreads + Totals</span>
                  <span className="text-xs sm:hidden">Spreads</span>
                </button>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="live" className="mb-4 md:mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <TabsList className="bg-[color:var(--surface)] border border-[color:var(--border-soft)]">
                  <TabsTrigger value="live" className="data-[state=active]:bg-[color:var(--surface-2)] text-xs md:text-sm">
                    Live Data
                  </TabsTrigger>
                  <TabsTrigger value="games" className="data-[state=active]:bg-[color:var(--surface-2)] text-xs md:text-sm">
                    Demo Games
                  </TabsTrigger>
                  <TabsTrigger value="teams" className="data-[state=active]:bg-[color:var(--surface-2)] text-xs md:text-sm">
                    All Teams
                  </TabsTrigger>
                </TabsList>
              </div>
            </Tabs>

            {/* Live Games from SportsDataIO */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4 text-[color:var(--text-strong)]">Today&apos;s Games</h2>
              <TodayGames league={league} />
            </div>

            {/* Upcoming Games */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4 text-[color:var(--text-strong)]">Upcoming Matchups</h2>
              <p className="text-sm text-[color:var(--text-muted)] mb-4">Make your picks for upcoming {leagueConfig.name} games</p>
              <UpcomingGames league={league} days={7} />
            </div>

            {/* Teams Grid */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4 text-[color:var(--text-strong)]">{leagueConfig.name} Teams</h2>
              <TeamLogoGrid league={league} />
            </div>

            {/* Demo Games Section - Only show for NFL since mock data is NFL-only */}
            {league === "nfl" && (
              <>
                <div className="border-t border-[color:var(--border-soft)] pt-8 mt-8">
                  <h2 className="text-lg font-semibold mb-4 text-[color:var(--text-muted)]">Demo Games (Mock Data)</h2>
                </div>

                {/* Demo Games List */}
                <div className="space-y-3 md:space-y-4">
                  {sportsGames
                    .filter((g) => g.league === "NFL")
                    .map((game) => (
                      <Link
                        key={game.id}
                        href={`/market/${game.id}`}
                        className="block bg-[color:var(--surface)] border rounded-xl p-3 md:p-4 transition border-[color:var(--border-soft)] hover:border-[color:var(--border-strong)]"
                      >
                        {/* Game Header */}
                        <div className="flex items-center justify-between mb-3 md:mb-4">
                          <div className="flex items-center gap-2 md:gap-3">
                            <span className="text-xs md:text-sm font-medium bg-[color:var(--surface-2)] px-2 md:px-3 py-1 rounded">
                              {game.gameTime}
                            </span>
                            <span className="text-xs md:text-sm text-[color:var(--text-muted)]">{game.volume}</span>
                          </div>
                          <span className="text-xs md:text-sm text-[color:var(--text-subtle)] flex items-center gap-1">
                            <span className="hidden sm:inline">Demo Only</span>
                            <span className="sm:hidden">Demo</span>
                          </span>
                        </div>

                        {/* Mobile Layout - Compact */}
                        <div className="md:hidden space-y-3">
                          {/* Teams Row */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs overflow-hidden"
                                style={{ backgroundColor: game.team1.color }}
                              >
                                {getTeamLogo(game.team1.abbr) ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img 
                                    src={getTeamLogo(game.team1.abbr)!} 
                                    alt={game.team1.name}
                                    className="w-6 h-6 object-contain"
                                    loading="lazy"
                                  />
                                ) : (
                                  game.team1.abbr
                                )}
                              </div>
                              <div>
                                <div className="font-medium text-sm">{game.team1.name}</div>
                                <div className="text-xs text-[color:var(--text-subtle)]">{game.team1.record}</div>
                              </div>
                            </div>
                            <TeamOutcomeButton
                              team={{
                                name: game.team1.name,
                                abbr: game.team1.abbr,
                                logoUrl: getTeamLogo(game.team1.abbr),
                                color: game.team1.color,
                              }}
                              priceCents={game.team1.odds}
                              compact
                              className="h-8"
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs overflow-hidden"
                                style={{ backgroundColor: game.team2.color }}
                              >
                                {getTeamLogo(game.team2.abbr) ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img 
                                    src={getTeamLogo(game.team2.abbr)!} 
                                    alt={game.team2.name}
                                    className="w-6 h-6 object-contain"
                                    loading="lazy"
                                  />
                                ) : (
                                  game.team2.abbr
                                )}
                              </div>
                              <div>
                                <div className="font-medium text-sm">{game.team2.name}</div>
                                <div className="text-xs text-[color:var(--text-subtle)]">{game.team2.record}</div>
                              </div>
                            </div>
                            <TeamOutcomeButton
                              team={{
                                name: game.team2.name,
                                abbr: game.team2.abbr,
                                logoUrl: getTeamLogo(game.team2.abbr),
                                color: game.team2.color,
                              }}
                              priceCents={game.team2.odds}
                              compact
                              className="h-8"
                            />
                          </div>
                          {/* Mobile Spreads/Totals */}
                          {showSpreads && (game.spread || game.total) && (
                            <div className="flex gap-2 pt-2 border-t border-[color:var(--border-soft)]">
                              {game.spread && (
                                <div className="flex-1 text-center py-1.5 bg-[color:var(--surface-2)] rounded-lg text-xs">
                                  <span className="text-[color:var(--text-muted)]">Spread </span>
                                  <span className="font-medium">{game.spread.team1}</span>
                                </div>
                              )}
                              {game.total && (
                                <div className="flex-1 text-center py-1.5 bg-[color:var(--surface-2)] rounded-lg text-xs">
                                  <span className="text-[color:var(--text-muted)]">O/U </span>
                                  <span className="font-medium">{game.total.over}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Desktop Layout - Full */}
                        <div className="hidden md:block space-y-3">
                          {/* Team 1 Row */}
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3 w-48">
                              <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm overflow-hidden"
                                style={{ backgroundColor: game.team1.color }}
                              >
                                {getTeamLogo(game.team1.abbr) ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img 
                                    src={getTeamLogo(game.team1.abbr)!} 
                                    alt={game.team1.name}
                                    className="w-8 h-8 object-contain"
                                    loading="lazy"
                                  />
                                ) : (
                                  game.team1.abbr
                                )}
                              </div>
                              <div>
                                <div className="font-medium">{game.team1.name}</div>
                                <div className="text-xs text-[color:var(--text-subtle)]">{game.team1.record}</div>
                              </div>
                            </div>

                            {/* Moneyline */}
                            <TeamOutcomeButton
                              team={{
                                name: game.team1.name,
                                abbr: game.team1.abbr,
                                logoUrl: getTeamLogo(game.team1.abbr),
                                color: game.team1.color,
                              }}
                              priceCents={game.team1.odds}
                              compact
                              className="w-32"
                            />

                            {/* Spread */}
                            {showSpreads && game.spread && (
                              <div className="flex items-center gap-2 px-4 py-2 bg-[color:var(--surface-2)] rounded-lg">
                                <span className="text-[color:var(--text-muted)]">{game.team1.abbr} {game.spread.team1}</span>
                                <span className="font-medium">{game.spread.odds1}¢</span>
                              </div>
                            )}

                            {/* Total */}
                            {showSpreads && game.total && (
                              <div className="flex items-center gap-2 px-4 py-2 bg-[color:var(--surface-2)] rounded-lg">
                                <span className="text-[color:var(--text-muted)]">O {game.total.over}</span>
                                <span className="font-medium">{game.total.odds1}¢</span>
                              </div>
                            )}
                          </div>

                          {/* Team 2 Row */}
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3 w-48">
                              <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm overflow-hidden"
                                style={{ backgroundColor: game.team2.color }}
                              >
                                {getTeamLogo(game.team2.abbr) ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img 
                                    src={getTeamLogo(game.team2.abbr)!} 
                                    alt={game.team2.name}
                                    className="w-8 h-8 object-contain"
                                    loading="lazy"
                                  />
                                ) : (
                                  game.team2.abbr
                                )}
                              </div>
                              <div>
                                <div className="font-medium">{game.team2.name}</div>
                                <div className="text-xs text-[color:var(--text-subtle)]">{game.team2.record}</div>
                              </div>
                            </div>

                            {/* Moneyline */}
                            <TeamOutcomeButton
                              team={{
                                name: game.team2.name,
                                abbr: game.team2.abbr,
                                logoUrl: getTeamLogo(game.team2.abbr),
                                color: game.team2.color,
                              }}
                              priceCents={game.team2.odds}
                              compact
                              className="w-32"
                            />

                            {/* Spread */}
                            {showSpreads && game.spread && (
                              <div className="flex items-center gap-2 px-4 py-2 bg-[color:var(--surface-2)] rounded-lg">
                                <span className="text-[color:var(--text-muted)]">{game.team2.abbr} {game.spread.team2}</span>
                                <span className="font-medium">{game.spread.odds2}¢</span>
                              </div>
                            )}

                            {/* Total */}
                            {showSpreads && game.total && (
                              <div className="flex items-center gap-2 px-4 py-2 bg-[color:var(--surface-2)] rounded-lg">
                                <span className="text-[color:var(--text-muted)]">U {game.total.under}</span>
                                <span className="font-medium">{game.total.odds2}¢</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                </div>
              </>
            )}

            {/* Comments Section */}
            <div className="mt-6 md:mt-8 bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl p-3 md:p-4">
              <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                <Input
                  placeholder="Add a comment"
                  className="flex-1 bg-[color:var(--surface-2)] border-[color:var(--border-soft)] text-sm"
                />
                <Button className="bg-[color:var(--accent)] hover:bg-[color:var(--accent-strong)] text-white text-sm h-9 px-3 md:px-4">
                  Post
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2 md:gap-4 mb-3 md:mb-4">
                <Button variant="outline" size="sm" className="gap-1 md:gap-2 text-xs md:text-sm h-7 md:h-8">
                  Newest <ChevronDown className="h-3 w-3 md:h-4 md:w-4" />
                </Button>
                <label className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-[color:var(--text-muted)]">
                  <input type="checkbox" className="rounded w-3 h-3 md:w-4 md:h-4" />
                  Holders
                </label>
                <div className="hidden sm:flex ml-auto items-center gap-2 text-xs md:text-sm text-[color:var(--text-muted)]">
                  <span className="text-yellow-500">⚠</span>
                  Beware of external links.
                </div>
              </div>

              {/* Sample Comments */}
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-sm font-bold">
                    C
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">CR78</span>
                      <span className="text-xs text-[color:var(--text-subtle)]">3h ago</span>
                      <button className="ml-auto">
                        <MoreHorizontal className="h-4 w-4 text-[color:var(--text-muted)]" />
                      </button>
                    </div>
                    <p className="text-sm text-[color:var(--text-muted)] mb-2">
                      can anyone spare me a dollar :D , will be appreciated
                    </p>
                    <div className="flex items-center gap-4 text-sm text-[color:var(--text-muted)]">
                      <button className="flex items-center gap-1 hover:text-[color:var(--text-strong)]">
                        <Heart className="h-4 w-4" /> 0
                      </button>
                      <button className="hover:text-[color:var(--text-strong)]">Reply</button>
                    </div>
                    <button className="text-sm text-[color:var(--text-muted)] mt-2">
                      Hide 1 Replies
                    </button>

                    {/* Reply */}
                    <div className="flex gap-3 mt-3 pl-4 border-l border-[color:var(--border-soft)]">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                        N
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">nvo</span>
                          <span className="text-xs text-[color:var(--text-subtle)]">12m ago</span>
                        </div>
                        <p className="text-sm text-[color:var(--text-muted)]">
                          <span className="text-blue-400">@CR78</span> stfu
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

      </div>

      <MainFooter />
    </div>
  );
}

// Loading fallback for Suspense
function SportsPageLoading() {
  return (
    <div className="min-h-screen bg-[color:var(--app-bg)] flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-[color:var(--text-muted)]" />
      <span className="ml-3 text-[color:var(--text-muted)]">Loading...</span>
    </div>
  );
}

// Main export with Suspense boundary for useSearchParams
export default function SportsPage() {
  return (
    <Suspense fallback={<SportsPageLoading />}>
      <SportsPageContent />
    </Suspense>
  );
}
