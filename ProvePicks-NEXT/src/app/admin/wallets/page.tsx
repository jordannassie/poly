"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, CheckCircle, XCircle, ExternalLink, AlertTriangle, Loader2 } from "lucide-react";
import Link from "next/link";

interface WalletConnection {
  id: string;
  user_id: string;
  username: string;
  chain: string;
  wallet_address: string;
  verified: boolean;
  primary: boolean;
  created_at: string;
  last_seen_at: string | null;
}

export default function AdminWalletsPage() {
  const [wallets, setWallets] = useState<WalletConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "verified" | "primary">("all");

  useEffect(() => {
    async function fetchWallets() {
      try {
        const res = await fetch("/api/admin/wallets");
        const data = await res.json();
        
        if (data.error === "Admin service key not configured") {
          setError(data.error);
        } else if (data.error) {
          setError(data.error);
        } else {
          setWallets(data.wallets || []);
        }
      } catch (err) {
        setError("Failed to load wallets");
      } finally {
        setLoading(false);
      }
    }

    fetchWallets();
  }, []);

  const filteredWallets = wallets.filter(w => {
    const matchesSearch = 
      w.wallet_address.toLowerCase().includes(search.toLowerCase()) ||
      (w.username?.toLowerCase() || "").includes(search.toLowerCase());
    
    if (filter === "verified") return matchesSearch && w.verified;
    if (filter === "primary") return matchesSearch && w.primary;
    return matchesSearch;
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  const formatTimeSince = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error === "Admin service key not configured") {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Wallet Connections</h1>
          <p className="text-gray-400">View all connected wallets across the platform</p>
        </div>
        <Card className="bg-yellow-500/10 border-yellow-500/30">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-6 w-6 text-yellow-500" />
              <div>
                <h3 className="text-yellow-400 font-semibold">Admin Service Key Not Configured</h3>
                <p className="text-yellow-400/80 text-sm mt-1">
                  Add <code className="bg-yellow-500/20 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> to your environment variables to view wallets.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Wallet Connections</h1>
          <p className="text-gray-400">View all connected wallets across the platform</p>
        </div>
        <div className="text-sm text-gray-400">
          {wallets.length} total wallets
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search by address or username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-[#0d1117] border-[#30363d] text-white"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "verified", "primary"] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
              className={filter === f ? "bg-blue-600" : "border-[#30363d] text-gray-400"}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Wallets Table */}
      <Card className="bg-[#161b22] border-[#30363d]">
        <CardContent className="p-0">
          {filteredWallets.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#30363d] text-gray-400 text-sm">
                  <th className="text-left p-4">Wallet Address</th>
                  <th className="text-left p-4">User</th>
                  <th className="text-left p-4">Chain</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-left p-4">Connected</th>
                  <th className="text-left p-4">Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {filteredWallets.map((wallet) => (
                  <tr key={wallet.id} className="border-b border-[#30363d]/50 hover:bg-[#0d1117]/50">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <code className="text-blue-400 text-sm">
                          {wallet.wallet_address.slice(0, 8)}...{wallet.wallet_address.slice(-4)}
                        </code>
                        <a 
                          href={`https://solscan.io/account/${wallet.wallet_address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-white"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </td>
                    <td className="p-4">
                      <Link href={`/admin/users/${wallet.user_id}`} className="text-gray-300 hover:text-white">
                        @{wallet.username}
                      </Link>
                    </td>
                    <td className="p-4 text-gray-400 uppercase text-sm">{wallet.chain}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {wallet.verified ? (
                          <span className="flex items-center gap-1 text-green-400 text-sm">
                            <CheckCircle className="h-3 w-3" />
                            Verified
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-gray-400 text-sm">
                            <XCircle className="h-3 w-3" />
                            Unverified
                          </span>
                        )}
                        {wallet.primary && (
                          <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">
                            Primary
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-gray-400">{formatDate(wallet.created_at)}</td>
                    <td className="p-4 text-gray-400">{formatTimeSince(wallet.last_seen_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-gray-400">
              {search ? "No wallets found matching your criteria." : "No wallets connected yet."}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
