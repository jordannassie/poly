"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Radio,
  ChevronRight,
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
import { sportsMenu } from "@/config/sports";

const topMenu = [
  { id: "live", label: "Live", icon: <Radio className="h-4 w-4" />, href: "/?view=live" },
];

// Games menu - HIDDEN (Plinko code saved but not shown in nav)
// const gamesMenu = [
//   { id: "plinko", label: "Plinko", icon: <CircleDot className="h-4 w-4" />, href: "/crypto/plinko", enabled: true },
// ];

// Sidebar content component (shared between desktop and mobile)
function SidebarContent({ 
  activeSport,
  activeGame,
  onNavigate 
}: { 
  activeSport: string;
  activeGame?: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className="p-4 space-y-1">
        {/* Top Menu - Live */}
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

      {/* Games Section - HIDDEN (Plinko saved but not shown) */}

      <div className="px-4 py-2">
        <div className="text-xs font-semibold text-[color:var(--text-subtle)] uppercase tracking-wider">
          All Sports
        </div>
      </div>

      <div className="px-2 pb-4 space-y-0.5">
        {sportsMenu
          .filter((sport) => sport.enabled)
          .map((sport) => {
            const isActive = activeSport === sport.key;

            return (
              <Link
                key={sport.key}
                href={sport.route || `/sports?league=${sport.key}`}
                onClick={onNavigate}
              >
                <div
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition ${
                    isActive
                      ? "bg-[color:var(--surface-2)] text-[color:var(--text-strong)]"
                      : "text-[color:var(--text-muted)] hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text-strong)]"
                  }`}
                >
                  <span className="text-sm">{sport.icon}</span>
                  <span className="flex-1 font-medium text-sm">{sport.label}</span>
                  {sport.count !== undefined && (
                    <span className="text-xs text-[color:var(--text-subtle)]">{sport.count}</span>
                  )}
                </div>
              </Link>
            );
          })}
      </div>

    </>
  );
}

export function SportsSidebar({ activeSport = "nfl", activeGame }: { activeSport?: string; activeGame?: string }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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
              activeGame={activeGame}
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
            {/* Live icon */}
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
            {/* Crypto games icons - HIDDEN (Plinko saved but not shown) */}
            <div className="h-px bg-[color:var(--border-soft)] mx-2 my-2" />
            {/* Sport icons */}
            {sportsMenu
              .filter((sport) => sport.enabled)
              .map((sport) => {
                const isActive = activeSport === sport.key;

                return (
                  <Link
                    key={sport.key}
                    href={sport.route || `/sports?league=${sport.key}`}
                    className={`flex items-center justify-center h-10 mx-2 rounded-lg cursor-pointer transition ${
                      isActive
                        ? "bg-[color:var(--surface-2)] text-[color:var(--text-strong)]"
                        : "text-[color:var(--text-muted)] hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text-strong)]"
                    }`}
                    title={sport.label}
                  >
                    <span className="text-sm">{sport.icon}</span>
                  </Link>
                );
              })}
          </div>
        ) : (
          /* Expanded state: full content */
          <SidebarContent 
            activeSport={activeSport}
            activeGame={activeGame}
          />
        )}
      </aside>
    </>
  );
}
