"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
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
  Mail,
  Globe,
  Trophy,
  Layers,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Bug
} from "lucide-react";

// Logo URL from Supabase storage
const LOGO_URL = "https://qiodxdkcvewvappuzuud.supabase.co/storage/v1/object/public/SPORTS/logos/ICON%20P.jpg";

// Operations tabs - always visible
const operationsNavItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/waitlist", label: "Waitlist", icon: Mail },
  { href: "/admin/wallets", label: "Wallets", icon: Wallet },
  { href: "/admin/markets", label: "Markets", icon: TrendingUp },
  { href: "/admin/settlements", label: "Settlements", icon: Scale },
  { href: "/admin/payouts", label: "Payouts", icon: CreditCard },
  { href: "/admin/lifecycle", label: "Game Lifecycle", icon: RefreshCw },
  { href: "/admin/logs", label: "System Logs", icon: FileText },
];

// Debug/Data tabs - hidden by default, shown via feature flag
const debugNavItems = [
  { href: "/admin/sports", label: "SportsDataIO", icon: Database },
  { href: "/admin/soccer-leagues", label: "Soccer Leagues", icon: Globe },
  { href: "/admin/api-sports/leagues", label: "League Sync", icon: Layers },
  { href: "/admin/api-sports", label: "API Sports Sandbox", icon: Globe },
  { href: "/admin/api-sports-nfl", label: "API Sports (NFL)", icon: Trophy },
];

// Feature flag to show debug section
const SHOW_DEBUG_ADMIN = process.env.NEXT_PUBLIC_SHOW_DEBUG_ADMIN === "true";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [debugExpanded, setDebugExpanded] = useState(false);
  
  // Don't show layout on login page
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  // Helper to check if a nav item is active
  const isActiveItem = (href: string) => {
    return pathname === href || (href !== "/admin" && pathname?.startsWith(href));
  };

  // Render a nav item
  const renderNavItem = (item: typeof operationsNavItems[0]) => {
    const isActive = isActiveItem(item.href);
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
  };

  return (
    <div className="min-h-screen bg-[#0d1117] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#161b22] border-r border-[#30363d] flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-[#30363d]">
          <Link href="/admin" className="flex items-center gap-2 text-white">
            <Image
              src={LOGO_URL}
              alt="ProvePicks Logo"
              width={32}
              height={32}
              className="h-8 w-8 rounded-lg object-cover"
              unoptimized
            />
            <div>
              <span className="font-bold">ProvePicks</span>
              <span className="text-xs text-gray-400 block">Admin Console</span>
            </div>
          </Link>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {/* Operations Section */}
          {operationsNavItems.map(renderNavItem)}
          
          {/* Debug Section - only shown if feature flag is enabled */}
          {SHOW_DEBUG_ADMIN && (
            <div className="pt-4">
              <button
                onClick={() => setDebugExpanded(!debugExpanded)}
                className="flex items-center gap-2 px-3 py-2 w-full text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-300 transition"
              >
                {debugExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                <Bug className="h-3 w-3" />
                Data & Debug
              </button>
              
              {debugExpanded && (
                <div className="mt-1 space-y-1">
                  {debugNavItems.map(renderNavItem)}
                </div>
              )}
            </div>
          )}
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
