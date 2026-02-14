"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Trophy, Calendar, Loader2 } from "lucide-react";
import { getLogoUrl } from "@/lib/images/getLogoUrl";

interface SearchTeam {
  id: number;
  name: string;
  logo: string | null;
  league: string;
  slug: string;
  href: string;
}

interface SearchGame {
  id: number;
  gameId: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string | null;
  awayLogo: string | null;
  startsAt: string;
  status: string;
  href: string;
}

interface SearchResults {
  teams: SearchTeam[];
  games: SearchGame[];
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function formatGameTime(startsAt: string): string {
  const date = new Date(startsAt);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0) return "Started";
  if (diffHours < 1) return `${Math.max(1, Math.floor(diffMs / 60000))}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function TeamLogo({ logo, name, size = 28 }: { logo: string | null; name: string; size?: number }) {
  const [error, setError] = useState(false);
  const resolved = getLogoUrl(logo);

  if (!resolved || error) {
    return (
      <div
        className="rounded-md bg-white/10 flex items-center justify-center text-[10px] font-bold text-white/60"
        style={{ width: size, height: size }}
      >
        {name.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolved}
      alt={name}
      width={size}
      height={size}
      className="rounded-md object-contain"
      onError={() => setError(true)}
      loading="lazy"
    />
  );
}

export function SearchBar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({ teams: [], games: [] });
  const [loading, setLoading] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const debouncedQuery = useDebounce(query, 300);

  // Fetch search results
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults({ teams: [], games: [] });
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setResults(data);
          setFocusedIndex(-1);
        }
      })
      .catch(() => {
        if (!cancelled) setResults({ teams: [], games: [] });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [debouncedQuery]);

  // Focus input when opening
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults({ teams: [], games: [] });
      setFocusedIndex(-1);
    }
  }, [open]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Build flat list of navigable results
  const allItems = [...results.teams.map((t) => t.href), ...results.games.map((g) => g.href)];

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((i) => Math.min(i + 1, allItems.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter" && focusedIndex >= 0 && allItems[focusedIndex]) {
        e.preventDefault();
        router.push(allItems[focusedIndex]);
        setOpen(false);
      } else if (e.key === "Enter" && allItems.length > 0 && focusedIndex < 0) {
        e.preventDefault();
        router.push(allItems[0]);
        setOpen(false);
      }
    },
    [allItems, focusedIndex, router]
  );

  const navigate = useCallback(
    (href: string) => {
      router.push(href);
      setOpen(false);
    },
    [router]
  );

  const hasResults = results.teams.length > 0 || results.games.length > 0;
  const showDropdown = open && (query.length >= 2 || hasResults);

  return (
    <div ref={containerRef} className="relative">
      {/* Search trigger / inline input */}
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-full bg-black/20 hover:bg-black/30 border border-white/10 px-3 py-1.5 text-sm text-white/60 hover:text-white transition"
        >
          <Search className="h-4 w-4" />
          <span className="hidden md:inline">Trade on anything</span>
        </button>
      ) : (
        <div className="flex items-center gap-2 rounded-full bg-black/30 border border-white/20 px-3 py-1.5 min-w-[240px] md:min-w-[320px]">
          <Search className="h-4 w-4 text-white/50 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search teams, games..."
            className="bg-transparent text-sm text-white placeholder:text-white/40 outline-none flex-1 min-w-0"
          />
          {loading ? (
            <Loader2 className="h-4 w-4 text-white/50 animate-spin flex-shrink-0" />
          ) : query.length > 0 ? (
            <button onClick={() => setQuery("")} className="text-white/40 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      )}

      {/* Dropdown results */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 w-[340px] md:w-[420px] max-h-[70vh] overflow-y-auto rounded-xl border border-white/10 bg-[#1a1a1a] shadow-2xl shadow-black/60 z-[100]">
          {/* No results */}
          {query.length >= 2 && !loading && !hasResults && (
            <div className="px-4 py-8 text-center text-sm text-white/40">
              No results for &ldquo;{query}&rdquo;
            </div>
          )}

          {/* Loading skeleton */}
          {loading && !hasResults && (
            <div className="px-4 py-6 flex items-center justify-center gap-2 text-sm text-white/40">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </div>
          )}

          {/* Teams section */}
          {results.teams.length > 0 && (
            <div>
              <div className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-white/30">
                Teams
              </div>
              {results.teams.map((team, idx) => (
                <button
                  key={`t-${team.id}-${team.league}`}
                  onClick={() => navigate(team.href)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/5 transition ${
                    focusedIndex === idx ? "bg-white/10" : ""
                  }`}
                >
                  <TeamLogo logo={team.logo} name={team.name} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{team.name}</div>
                    <div className="text-[11px] text-white/40">{team.league.toUpperCase()}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Games section */}
          {results.games.length > 0 && (
            <div>
              {results.teams.length > 0 && <div className="border-t border-white/5 mx-3" />}
              <div className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-white/30">
                Upcoming Games
              </div>
              {results.games.map((game, idx) => {
                const itemIdx = results.teams.length + idx;
                return (
                  <button
                    key={`g-${game.id}`}
                    onClick={() => navigate(game.href)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/5 transition ${
                      focusedIndex === itemIdx ? "bg-white/10" : ""
                    }`}
                  >
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <TeamLogo logo={game.awayLogo} name={game.awayTeam} size={22} />
                      <span className="text-[10px] text-white/30">@</span>
                      <TeamLogo logo={game.homeLogo} name={game.homeTeam} size={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {game.awayTeam} @ {game.homeTeam}
                      </div>
                      <div className="text-[11px] text-white/40 flex items-center gap-1.5">
                        <span>{game.league.toUpperCase()}</span>
                        <span>·</span>
                        <Calendar className="h-3 w-3" />
                        <span>{formatGameTime(game.startsAt)}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
