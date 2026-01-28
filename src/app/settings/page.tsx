"use client";

import { useState, useEffect } from "react";
import { TopNav } from "@/components/TopNav";
import { CategoryTabs } from "@/components/CategoryTabs";
import { MainFooter } from "@/components/MainFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDemoUser, DemoUser } from "@/lib/demoAuth";
import { Upload } from "lucide-react";

const sidebarItems = [
  { id: "profile", label: "Profile" },
  { id: "account", label: "Account" },
  { id: "trading", label: "Trading" },
  { id: "notifications", label: "Notifications" },
  { id: "builder-codes", label: "Builder Codes" },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("profile");
  const [user, setUser] = useState<DemoUser | null>(null);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    const demoUser = getDemoUser();
    if (demoUser) {
      setUser(demoUser);
      setEmail(demoUser.email);
      setUsername(demoUser.handle.replace("@", ""));
    }
  }, []);

  return (
    <div className="min-h-screen bg-[color:var(--app-bg)] text-[color:var(--text-strong)]">
      <TopNav />
      <CategoryTabs activeLabel="Trending" />
      <main className="mx-auto w-full max-w-5xl px-4 py-6">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="w-56 shrink-0">
            <nav className="space-y-1">
              {sidebarItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition text-sm ${
                    activeSection === item.id
                      ? "bg-blue-600 text-white font-medium"
                      : "text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)] hover:bg-[color:var(--surface-2)]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            {activeSection === "profile" && (
              <div className="space-y-8">
                <h1 className="text-2xl font-bold">Profile Settings</h1>

                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-yellow-500" />
                  <Button
                    variant="outline"
                    className="gap-2 border-[color:var(--border-soft)]"
                  >
                    <Upload className="h-4 w-4" />
                    Upload
                  </Button>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-[color:var(--surface-2)] border-[color:var(--border-soft)]"
                  />
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[color:var(--text-muted)]">Not verified</span>
                    <button className="text-blue-500 hover:underline">Resend</button>
                  </div>
                </div>

                {/* Username */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Username</label>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-[color:var(--surface-2)] border-[color:var(--border-soft)]"
                  />
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Bio"
                    rows={4}
                    className="w-full rounded-lg bg-[color:var(--surface-2)] border border-[color:var(--border-soft)] p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Social Connections */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">Social Connections</label>
                  <Button
                    variant="outline"
                    className="gap-2 border-[color:var(--border-soft)]"
                  >
                    <span className="font-bold">𝕏</span>
                    Connect X
                  </Button>
                </div>

                {/* Save */}
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  Save changes
                </Button>
              </div>
            )}

            {activeSection === "account" && (
              <div className="space-y-8">
                <h1 className="text-2xl font-bold">Account Settings</h1>
                <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface)] p-6 space-y-4">
                  <h3 className="font-semibold">Wallet</h3>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-[color:var(--surface-2)]">
                    <div>
                      <div className="font-mono text-sm">0x1234...5678</div>
                      <div className="text-xs text-[color:var(--text-muted)]">Connected</div>
                    </div>
                    <Button variant="outline" size="sm" className="border-[color:var(--border-soft)]">
                      Disconnect
                    </Button>
                  </div>
                </div>
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 space-y-4">
                  <h3 className="font-semibold text-red-500">Danger Zone</h3>
                  <p className="text-sm text-[color:var(--text-muted)]">
                    Once you delete your account, there is no going back.
                  </p>
                  <Button variant="outline" className="border-red-500 text-red-500 hover:bg-red-500/10">
                    Delete Account
                  </Button>
                </div>
              </div>
            )}

            {activeSection === "trading" && (
              <div className="space-y-8">
                <h1 className="text-2xl font-bold">Trading Settings</h1>
                <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface)] p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Default Order Type</div>
                      <div className="text-sm text-[color:var(--text-muted)]">
                        Choose your default order type for new trades
                      </div>
                    </div>
                    <select className="rounded-lg bg-[color:var(--surface-2)] border border-[color:var(--border-soft)] px-3 py-2 text-sm">
                      <option>Market</option>
                      <option>Limit</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Slippage Tolerance</div>
                      <div className="text-sm text-[color:var(--text-muted)]">
                        Maximum price change accepted
                      </div>
                    </div>
                    <select className="rounded-lg bg-[color:var(--surface-2)] border border-[color:var(--border-soft)] px-3 py-2 text-sm">
                      <option>0.5%</option>
                      <option>1%</option>
                      <option>2%</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeSection === "notifications" && (
              <div className="space-y-8">
                <h1 className="text-2xl font-bold">Notification Settings</h1>
                <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface)] p-6 space-y-4">
                  {[
                    { label: "Email notifications", desc: "Receive updates via email" },
                    { label: "Push notifications", desc: "Browser push notifications" },
                    { label: "Trade confirmations", desc: "Notify when trades execute" },
                    { label: "Price alerts", desc: "Alert on significant price changes" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between py-2">
                      <div>
                        <div className="font-medium">{item.label}</div>
                        <div className="text-sm text-[color:var(--text-muted)]">{item.desc}</div>
                      </div>
                      <button className="w-12 h-6 rounded-full bg-blue-600 relative">
                        <span className="absolute right-1 top-1 w-4 h-4 rounded-full bg-white" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === "builder-codes" && (
              <div className="space-y-8">
                <h1 className="text-2xl font-bold">Builder Codes</h1>
                <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface)] p-6 space-y-4">
                  <p className="text-[color:var(--text-muted)]">
                    Generate API keys and referral codes for building on ProvePicks.
                  </p>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    Generate API Key
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <MainFooter />
    </div>
  );
}
