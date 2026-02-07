"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  Wallet, 
  TrendingUp, 
  Scale, 
  CreditCard, 
  FileText, 
  Database,
  LogOut,
  Zap,
  Mail,
  Globe,
  Trophy,
  Layers,
  RefreshCw
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/waitlist", label: "Waitlist", icon: Mail },
  { href: "/admin/wallets", label: "Wallets", icon: Wallet },
  { href: "/admin/markets", label: "Markets", icon: TrendingUp },
  { href: "/admin/settlements", label: "Settlements", icon: Scale },
  { href: "/admin/payouts", label: "Payouts", icon: CreditCard },
  { href: "/admin/lifecycle", label: "Game Lifecycle", icon: RefreshCw },
  { href: "/admin/logs", label: "System Logs", icon: FileText },
  { href: "/admin/sports", label: "SportsDataIO", icon: Database },
  { href: "/admin/soccer-leagues", label: "Soccer Leagues", icon: Globe },
  { href: "/admin/api-sports/leagues", label: "League Sync", icon: Layers },
  { href: "/admin/api-sports", label: "API Sports Sandbox", icon: Globe },
  { href: "/admin/api-sports-nfl", label: "API Sports (NFL)", icon: Trophy },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  // Don't show layout on login page
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#0d1117] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#161b22] border-r border-[#30363d] flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-[#30363d]">
          <Link href="/admin" className="flex items-center gap-2 text-white">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <div>
              <span className="font-bold">ProvePicks</span>
              <span className="text-xs text-gray-400 block">Admin Console</span>
            </div>
          </Link>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== "/admin" && pathname?.startsWith(item.href));
            const Icon = item.icon;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-[#21262d]"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        
        {/* Footer */}
        <div className="p-4 border-t border-[#30363d]">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-[#21262d] transition"
          >
            <LogOut className="h-4 w-4" />
            Back to Site
          </Link>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
