"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Users, Compass, Star, User } from "lucide-react";

interface PopularTeam {
  id: string;
  name: string;
  league: string;
  slug: string;
  logoUrl: string;
  primaryColor: string;
}

interface SidebarCommunitiesProps {
  onNavigate?: () => void;
  collapsed?: boolean;
}

/**
 * Sidebar Communities Section
 * 
 * Shows quick links to communities and popular teams.
 */
export function SidebarCommunities({ onNavigate, collapsed = false }: SidebarCommunitiesProps) {
  const [popularTeams, setPopularTeams] = useState<PopularTeam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPopularTeams() {
      try {
        const res = await fetch("/api/communities/popular");
        if (res.ok) {
          const data = await res.json();
          setPopularTeams(data.teams || []);
        }
      } catch (error) {
        console.error("Failed to fetch popular teams:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchPopularTeams();
  }, []);

  // Collapsed view - just icons
  if (collapsed) {
    return (
      <div className="py-2 space-y-2">
        <div className="h-px bg-[color:var(--border-soft)] mx-2 my-2" />
        <Link
          href="/communities"
          className="flex items-center justify-center h-10 mx-2 rounded-lg text-[color:var(--text-muted)] hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text-strong)] transition"
          title="Communities"
          onClick={onNavigate}
        >
          <Users className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Section Header */}
      <div className="px-4 py-2 mt-2">
        <div className="text-xs font-semibold text-[color:var(--text-subtle)] uppercase tracking-wider">
          Communities
        </div>
      </div>

      <div className="px-2 pb-2 space-y-0.5">
        {/* Browse All */}
        <Link
          href="/communities"
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-[color:var(--text-muted)] hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text-strong)] transition"
        >
          <Compass className="h-4 w-4" />
          <span className="font-medium text-sm">Browse All</span>
        </Link>

        {/* My Communities - Placeholder */}
        <div
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-[color:var(--text-muted)] opacity-50 cursor-not-allowed"
          title="Sign in to see your communities"
        >
          <User className="h-4 w-4" />
          <span className="font-medium text-sm">My Communities</span>
        </div>

        {/* Divider */}
        <div className="h-px bg-[color:var(--border-soft)] mx-1 my-2" />

        {/* Popular Teams Label */}
        <div className="px-3 py-1">
          <span className="text-xs text-[color:var(--text-subtle)] flex items-center gap-1">
            <Star className="h-3 w-3" />
            Popular
          </span>
        </div>

        {/* Popular Teams */}
        {loading ? (
          <div className="px-3 py-2">
            <div className="animate-pulse space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-8 bg-[color:var(--surface-2)] rounded" />
              ))}
            </div>
          </div>
        ) : popularTeams.length > 0 ? (
          popularTeams.slice(0, 5).map((team) => (
            <Link
              key={team.id}
              href={`/teams/${team.league.toLowerCase()}/${team.slug}`}
              onClick={onNavigate}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-[color:var(--text-muted)] hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text-strong)] transition"
            >
              {/* Team Logo */}
              <div 
                className="w-6 h-6 rounded-full flex items-center justify-center overflow-hidden"
                style={{ backgroundColor: team.primaryColor }}
              >
                {team.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={team.logoUrl}
                    alt={team.name}
                    className="w-5 h-5 object-contain"
                  />
                ) : (
                  <span className="text-white text-xs font-bold">
                    {team.name.charAt(0)}
                  </span>
                )}
              </div>
              <span className="font-medium text-sm truncate flex-1">{team.name}</span>
              <span className="text-[10px] text-[color:var(--text-subtle)] bg-[color:var(--surface-2)] px-1.5 py-0.5 rounded">
                {team.league}
              </span>
            </Link>
          ))
        ) : (
          <div className="px-3 py-2 text-xs text-[color:var(--text-subtle)]">
            No teams synced yet
          </div>
        )}
      </div>
    </>
  );
}
