"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Radio,
  BarChart3,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Swords,
  Target,
  Flag,
  Crown,
  Dumbbell,
  Circle,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";

type SportItem = {
  id: string;
  label: string;
  count?: number;
  icon: React.ReactNode;
  color?: string;
  subItems?: { id: string; label: string; count?: number }[];
};

const topMenu = [
  { id: "live", label: "Live", icon: <Radio className="h-4 w-4" />, href: "/sports/live" },
  { id: "futures", label: "Futures", icon: <BarChart3 className="h-4 w-4" />, href: "/sports/futures" },
];

const allSports: SportItem[] = [
  { id: "nfl", label: "NFL", count: 1, icon: <span className="text-sm">🏈</span>, color: "text-orange-500" },
  { id: "nba", label: "NBA", count: 65, icon: <span className="text-sm">🏀</span>, color: "text-orange-400" },
  { id: "ncaa-cbb", label: "NCAA CBB", count: 464, icon: <span className="text-sm">🏀</span>, color: "text-blue-500" },
  { id: "nhl", label: "NHL", count: 71, icon: <span className="text-sm">🏒</span>, color: "text-blue-400" },
  { 
    id: "ufc", 
    label: "UFC", 
    icon: <Swords className="h-4 w-4 text-red-500" />,
    subItems: [
      { id: "ufc-main", label: "Main Events", count: 3 },
      { id: "ufc-prelim", label: "Prelims", count: 4 },
    ]
  },
  { 
    id: "football", 
    label: "Football", 
    icon: <span className="text-sm">⚽</span>,
    subItems: [
      { id: "epl", label: "Premier League", count: 20 },
      { id: "laliga", label: "La Liga", count: 18 },
      { id: "bundesliga", label: "Bundesliga", count: 15 },
    ]
  },
  { 
    id: "basketball", 
    label: "Basketball", 
    icon: <span className="text-sm">🏀</span>,
    subItems: [
      { id: "euroleague", label: "EuroLeague", count: 12 },
      { id: "wnba", label: "WNBA", count: 8 },
    ]
  },
  { 
    id: "soccer", 
    label: "Soccer", 
    icon: <span className="text-sm">⚽</span>,
    subItems: [
      { id: "mls", label: "MLS", count: 14 },
      { id: "champions", label: "Champions League", count: 16 },
    ]
  },
  { 
    id: "tennis", 
    label: "Tennis", 
    icon: <span className="text-sm">🎾</span>,
    subItems: [
      { id: "atp", label: "ATP", count: 24 },
      { id: "wta", label: "WTA", count: 18 },
    ]
  },
  { 
    id: "esports", 
    label: "Esports", 
    icon: <Target className="h-4 w-4 text-purple-500" />,
    subItems: [
      { id: "lol", label: "League of Legends", count: 8 },
      { id: "csgo", label: "CS2", count: 12 },
      { id: "valorant", label: "Valorant", count: 6 },
    ]
  },
  { id: "baseball", label: "Baseball", icon: <span className="text-sm">⚾</span> },
  { id: "hockey", label: "Hockey", icon: <span className="text-sm">🏒</span> },
  { id: "cricket", label: "Cricket", icon: <span className="text-sm">🏏</span> },
  { id: "rugby", label: "Rugby", icon: <span className="text-sm">🏉</span> },
  { id: "golf", label: "Golf", icon: <span className="text-sm">⛳</span> },
  { id: "formula1", label: "Formula 1", icon: <Flag className="h-4 w-4 text-red-500" /> },
  { id: "chess", label: "Chess", icon: <Crown className="h-4 w-4 text-amber-500" /> },
  { id: "boxing", label: "Boxing", icon: <Dumbbell className="h-4 w-4 text-red-600" /> },
  { id: "pickleball", label: "Pickleball", icon: <Circle className="h-4 w-4 text-green-500" /> },
];

// Sidebar content component (shared between desktop and mobile)
function SidebarContent({ 
  activeSport, 
  expandedItems, 
  toggleExpand,
  onNavigate 
}: { 
  activeSport: string;
  expandedItems: Set<string>;
  toggleExpand: (id: string) => void;
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className="p-4 space-y-1">
        {/* Top Menu - Live & Futures */}
        {topMenu.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            onClick={onNavigate}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[color:var(--text-muted)] hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text-strong)] transition"
          >
            {item.icon}
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </div>

      <div className="px-4 py-2">
        <div className="text-xs font-semibold text-[color:var(--text-subtle)] uppercase tracking-wider">
          All Sports
        </div>
      </div>

      <div className="px-2 pb-4 space-y-0.5 max-h-[calc(100vh-200px)] overflow-y-auto">
        {allSports.map((sport) => (
          <div key={sport.id}>
            <div
              className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition ${
                activeSport === sport.id
                  ? "bg-[color:var(--surface-2)] text-[color:var(--text-strong)]"
                  : "text-[color:var(--text-muted)] hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text-strong)]"
              }`}
              onClick={() => sport.subItems && toggleExpand(sport.id)}
            >
              <span className={sport.color}>{sport.icon}</span>
              <span className="flex-1 font-medium text-sm">{sport.label}</span>
              {sport.count !== undefined && (
                <span className="text-xs text-[color:var(--text-subtle)]">{sport.count}</span>
              )}
              {sport.subItems && (
                <span className="text-[color:var(--text-subtle)]">
                  {expandedItems.has(sport.id) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </span>
              )}
            </div>
            {/* Sub-items */}
            {sport.subItems && expandedItems.has(sport.id) && (
              <div className="ml-8 mt-1 space-y-0.5">
                {sport.subItems.map((sub) => (
                  <Link
                    key={sub.id}
                    href={`/sports/${sub.id}`}
                    onClick={onNavigate}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-[color:var(--text-muted)] hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text-strong)] transition"
                  >
                    <span className="flex-1">{sub.label}</span>
                    {sub.count && (
                      <span className="text-xs text-[color:var(--text-subtle)]">{sub.count}</span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

export function SportsSidebar({ activeSport = "nfl" }: { activeSport?: string }) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  return (
    <>
      {/* Mobile: Floating button to open sidebar sheet */}
      <div className="lg:hidden fixed bottom-4 left-4 z-40">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              size="lg"
              className="rounded-full h-12 w-12 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 shadow-lg"
            >
              <PanelLeft className="h-5 w-5 text-white" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0">
            <SheetHeader className="p-4 border-b border-[color:var(--border-soft)]">
              <SheetTitle className="text-[color:var(--text-strong)]">Sports</SheetTitle>
            </SheetHeader>
            <SidebarContent 
              activeSport={activeSport}
              expandedItems={expandedItems}
              toggleExpand={toggleExpand}
              onNavigate={() => setMobileOpen(false)}
            />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop: Collapsible sidebar */}
      <aside 
        className={`hidden lg:flex flex-col flex-shrink-0 border-r border-[color:var(--border-soft)] bg-[color:var(--surface)] min-h-screen transition-all duration-300 ${
          isCollapsed ? "w-16" : "w-56"
        }`}
      >
        {/* Collapse toggle button */}
        <div className="p-2 border-b border-[color:var(--border-soft)]">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full justify-center h-8"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4 mr-2" />
                <span className="text-xs">Collapse</span>
              </>
            )}
          </Button>
        </div>

        {/* Collapsed state: just icons */}
        {isCollapsed ? (
          <div className="flex-1 py-4 space-y-2">
            {/* Live & Futures icons */}
            {topMenu.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="flex items-center justify-center h-10 mx-2 rounded-lg text-[color:var(--text-muted)] hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text-strong)] transition"
                title={item.label}
              >
                {item.icon}
              </Link>
            ))}
            <div className="h-px bg-[color:var(--border-soft)] mx-2 my-2" />
            {/* Sport icons */}
            {allSports.slice(0, 8).map((sport) => (
              <div
                key={sport.id}
                className={`flex items-center justify-center h-10 mx-2 rounded-lg cursor-pointer transition ${
                  activeSport === sport.id
                    ? "bg-[color:var(--surface-2)] text-[color:var(--text-strong)]"
                    : "text-[color:var(--text-muted)] hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text-strong)]"
                }`}
                title={sport.label}
              >
                <span className={sport.color}>{sport.icon}</span>
              </div>
            ))}
          </div>
        ) : (
          /* Expanded state: full content */
          <SidebarContent 
            activeSport={activeSport}
            expandedItems={expandedItems}
            toggleExpand={toggleExpand}
          />
        )}
      </aside>
    </>
  );
}
