"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TopNav } from "@/components/TopNav";
import { CategoryTabs } from "@/components/CategoryTabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatsPanel } from "@/components/StatsPanel";
import { CommentsPanel } from "@/components/CommentsPanel";
import { MainFooter } from "@/components/MainFooter";
import { DemoBet, DemoUser, getDemoBets, getDemoUser } from "@/lib/demoAuth";

export default function AccountPage() {
  const [demoUser, setDemoUser] = useState<DemoUser | null>(null);
  const [bets, setBets] = useState<DemoBet[]>([]);

  useEffect(() => {
    setDemoUser(getDemoUser());
    setBets(getDemoBets());
  }, []);

  return (
    <div className="min-h-screen bg-[color:var(--app-bg)] text-[color:var(--text-strong)]">
      <TopNav />
      <CategoryTabs />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-semibold">Account</div>
            <div className="text-sm text-[color:var(--text-muted)]">
              Demo profile and activity
            </div>
          </div>
          <Button
            asChild
            className="bg-[color:var(--accent)] hover:bg-[color:var(--accent-strong)] text-white"
          >
            <Link href="/">Explore markets</Link>
          </Button>
        </div>

        {!demoUser ? (
          <Card className="bg-[color:var(--surface)] border-[color:var(--border-soft)]">
            <CardContent className="p-6 space-y-4">
              <div className="text-lg font-semibold">
                Sign in to see your demo account
              </div>
              <div className="text-sm text-[color:var(--text-muted)]">
                Use the Log in button in the top navigation to create a demo
                profile and track bets.
              </div>
              <Button
                asChild
                className="bg-[color:var(--accent)] hover:bg-[color:var(--accent-strong)] text-white"
              >
                <Link href="/">Go back</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-6">
              <Card className="bg-[color:var(--surface)] border-[color:var(--border-soft)]">
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-[color:var(--surface-3)] flex items-center justify-center text-sm font-semibold text-[color:var(--text-strong)]">
                      {demoUser.name
                        .split(" ")
                        .map((word) => word[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div>
                      <div className="text-lg font-semibold">
                        {demoUser.name}
                      </div>
                      <div className="text-sm text-[color:var(--text-subtle)]">
                        @{demoUser.handle}
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-[color:var(--surface-2)] border border-[color:var(--border-soft)] p-3">
                      <div className="text-xs text-[color:var(--text-subtle)]">Portfolio</div>
                      <div className="text-xl font-semibold">$0.00</div>
                    </div>
                    <div className="rounded-xl bg-[color:var(--surface-2)] border border-[color:var(--border-soft)] p-3">
                      <div className="text-xs text-[color:var(--text-subtle)]">Cash</div>
                      <div className="text-xl font-semibold">$0.00</div>
                    </div>
                    <div className="rounded-xl bg-[color:var(--surface-2)] border border-[color:var(--border-soft)] p-3">
                      <div className="text-xs text-[color:var(--text-subtle)]">Accuracy</div>
                      <div className="text-xl font-semibold">--</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[color:var(--surface)] border-[color:var(--border-soft)]">
                <CardContent className="p-6 space-y-4">
                  <div className="text-lg font-semibold">Recent trades</div>
                  {bets.length === 0 ? (
                    <div className="text-sm text-[color:var(--text-muted)]">
                      No trades yet. Place a demo trade to see it here.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {bets.map((bet) => (
                        <div
                          key={bet.id}
                          className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] p-4"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-semibold">
                                {bet.marketTitle}
                              </div>
                              <div className="text-xs text-[color:var(--text-subtle)]">
                                {bet.outcomeName}
                              </div>
                            </div>
                            <div className="text-sm text-[color:var(--text-muted)]">
                              ${bet.amount} • {bet.price}¢
                            </div>
                          </div>
                          <div className="mt-2 text-xs text-[color:var(--text-subtle)]">
                            {bet.side.toUpperCase()} {bet.position.toUpperCase()}{" "}
                            • {new Date(bet.placedAt).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            <aside className="space-y-4">
              <Card className="bg-[color:var(--surface)] border-[color:var(--border-soft)]">
                <CardContent className="p-6 space-y-3">
                  <div className="text-sm text-[color:var(--text-muted)]">Watchlist</div>
                  <div className="text-sm">
                    Add markets to your watchlist for quick access.
                  </div>
                  <Button className="w-full bg-[color:var(--surface-2)] hover:bg-[color:var(--surface-3)] text-[color:var(--text-strong)]">
                    Create watchlist
                  </Button>
                </CardContent>
              </Card>
              <Card className="bg-[color:var(--surface)] border-[color:var(--border-soft)]">
                <CardContent className="p-6 space-y-3">
                  <div className="text-sm text-[color:var(--text-muted)]">Notifications</div>
                  <div className="text-sm">
                    You are subscribed to breaking alerts.
                  </div>
                  <Button className="w-full bg-[color:var(--surface-2)] hover:bg-[color:var(--surface-3)] text-[color:var(--text-strong)]">
                    Manage alerts
                  </Button>
                </CardContent>
              </Card>
            </aside>
          </div>
        )}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <StatsPanel title="Account stats" />
          <CommentsPanel title="Community comments" />
        </div>
      </main>
      <MainFooter />
    </div>
  );
}
