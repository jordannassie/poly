"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { TopNav } from "@/components/TopNav";
import { MainFooter } from "@/components/MainFooter";
import { SportsSidebar } from "@/components/SportsSidebar";
import { LightningLoader } from "@/components/ui/LightningLoader";
import { Users, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Team {
  id: string;
  name: string;
  league: string;
  slug: string;
  logoUrl: string;
  primaryColor: string;
}

interface TeamsResponse {
  teams: Team[];
  count: number;
  counts: Record<string, number>;
  league: string;
}

// League tabs configuration
const LEAGUE_TABS = [
  { key: "all", label: "All", icon: "🌐" },
  { key: "NFL", label: "NFL", icon: "🏈" },
  { key: "NBA", label: "NBA", icon: "🏀" },
  { key: "SOCCER", label: "Soccer", icon: "⚽" },
  { key: "MLB", label: "MLB", icon: "⚾" },
  { key: "NHL", label: "NHL", icon: "🏒" },
];

/**
 * Browse Communities Page
 * 
 * Shows all team communities with league filtering.
 */
export default function CommunitiesPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [activeLeague, setActiveLeague] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch teams when league changes
  useEffect(() => {
    async function fetchTeams() {
      setLoading(true);
      try {
        const url = activeLeague === "all" 
          ? "/api/communities/teams"
          : `/api/communities/teams?league=${activeLeague}`;
        
        const res = await fetch(url);
        if (res.ok) {
          const data: TeamsResponse = await res.json();
          setTeams(data.teams);
          setCounts(data.counts);
        }
      } catch (error) {
        console.error("Failed to fetch teams:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchTeams();
  }, [activeLeague]);

  // Filter teams by search query
  const filteredTeams = searchQuery
    ? teams.filter(team => 
        team.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : teams;

  // Group teams by league for "all" view
  const groupedTeams = activeLeague === "all"
    ? groupTeamsByLeague(filteredTeams)
    : { [activeLeague]: filteredTeams };

  return (
    <div className="min-h-screen bg-[color:var(--app-bg)] text-[color:var(--text-strong)]">
      <TopNav />

      <div className="flex flex-col lg:flex-row">
        {/* Sidebar */}
        <SportsSidebar activeSport="" />

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <Users className="h-8 w-8 text-[color:var(--accent)]" />
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">Communities</h1>
                <p className="text-sm text-[color:var(--text-muted)]">
                  Join your favorite team communities
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--text-muted)]" />
              <Input
                placeholder="Search teams..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-[color:var(--surface)] border-[color:var(--border-soft)]"
              />
            </div>

            {/* League Tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
              {LEAGUE_TABS.map((tab) => {
                const count = tab.key === "all" 
                  ? Object.values(counts).reduce((a, b) => a + b, 0)
                  : counts[tab.key] || 0;
                
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveLeague(tab.key)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${
                      activeLeague === tab.key
                        ? "bg-[color:var(--accent)] text-white"
                        : "bg-[color:var(--surface)] text-[color:var(--text-muted)] hover:bg-[color:var(--surface-2)]"
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                    {count > 0 && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        activeLeague === tab.key
                          ? "bg-white/20"
                          : "bg-[color:var(--surface-2)]"
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Teams Grid */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <LightningLoader size="lg" text="Loading communities..." />
              </div>
            ) : filteredTeams.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-[color:var(--text-subtle)] mb-4" />
                <p className="text-[color:var(--text-muted)]">
                  {searchQuery 
                    ? `No teams found for "${searchQuery}"`
                    : "No teams available. Sync teams from the Admin panel."
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {Object.entries(groupedTeams).map(([league, leagueTeams]) => (
                  <div key={league}>
                    {activeLeague === "all" && (
                      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <span>{getLeagueIcon(league)}</span>
                        <span>{league}</span>
                        <span className="text-sm text-[color:var(--text-muted)] font-normal">
                          ({leagueTeams.length})
                        </span>
                      </h2>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                      {leagueTeams.map((team) => (
                        <TeamCard key={team.id} team={team} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      <MainFooter />
    </div>
  );
}

/**
 * Team Card Component
 */
function TeamCard({ team }: { team: Team }) {
  const [imgError, setImgError] = useState(false);

  return (
    <Link
      href={`/teams/${team.league.toLowerCase()}/${team.slug}`}
      className="group flex flex-col items-center p-4 rounded-xl bg-[color:var(--surface)] border border-[color:var(--border-soft)] hover:border-[color:var(--border-strong)] transition"
    >
      {/* Team Logo */}
      <div 
        className="w-16 h-16 rounded-full flex items-center justify-center mb-3 overflow-hidden group-hover:scale-105 transition"
        style={{ backgroundColor: team.primaryColor }}
      >
        {team.logoUrl && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={team.logoUrl}
            alt={team.name}
            className="w-14 h-14 object-contain"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="text-white font-bold text-xl">
            {team.name.charAt(0)}
          </span>
        )}
      </div>

      {/* Team Name */}
      <span className="text-sm font-medium text-[color:var(--text-strong)] text-center line-clamp-2">
        {team.name}
      </span>

      {/* League Badge */}
      <span className="text-xs text-[color:var(--text-muted)] mt-1 bg-[color:var(--surface-2)] px-2 py-0.5 rounded">
        {team.league}
      </span>
    </Link>
  );
}

/**
 * Group teams by league
 */
function groupTeamsByLeague(teams: Team[]): Record<string, Team[]> {
  const groups: Record<string, Team[]> = {};
  
  for (const team of teams) {
    if (!groups[team.league]) {
      groups[team.league] = [];
    }
    groups[team.league].push(team);
  }

  // Sort leagues in preferred order
  const order = ["NFL", "NBA", "SOCCER", "MLB", "NHL"];
  const sorted: Record<string, Team[]> = {};
  
  for (const league of order) {
    if (groups[league]) {
      sorted[league] = groups[league];
    }
  }
  
  // Add any remaining leagues
  for (const league of Object.keys(groups)) {
    if (!sorted[league]) {
      sorted[league] = groups[league];
    }
  }

  return sorted;
}

/**
 * Get league icon
 */
function getLeagueIcon(league: string): string {
  const icons: Record<string, string> = {
    NFL: "🏈",
    NBA: "🏀",
    SOCCER: "⚽",
    MLB: "⚾",
    NHL: "🏒",
  };
  return icons[league] || "🏆";
}
