"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, CheckCircle, XCircle, ExternalLink } from "lucide-react";
import Link from "next/link";

// Demo wallets data
const demoWallets = [
  { id: "1", userId: "1", username: "demo", address: "8xK3nRvP2mQfYh7sLw4bNcDe6tUjXa9fD2", chain: "solana", verified: true, primary: true, createdAt: "2025-01-15", lastSeen: "2 min ago" },
  { id: "2", userId: "2", username: "bossoskil1", address: "5pM2kLqR8nVfGh3sWx6bYcZe4tPjUa7dE1", chain: "solana", verified: true, primary: true, createdAt: "2025-01-10", lastSeen: "1 hour ago" },
  { id: "3", userId: "2", username: "bossoskil1", address: "9qN4mTsS6pXgJi5uRy8cZdAf2vQkWb3eF0", chain: "solana", verified: false, primary: false, createdAt: "2025-01-12", lastSeen: "3 days ago" },
  { id: "4", userId: "3", username: "kch123", address: "7rP6nUsT4qYhKj2vSz9dAbCg8wRmXc5fG3", chain: "solana", verified: true, primary: true, createdAt: "2025-01-08", lastSeen: "5 hours ago" },
  { id: "5", userId: "4", username: "gopatriots", address: "3sQ8pVtU2rZiLk4wTa0eBcDh6xSmYd7gH5", chain: "solana", verified: true, primary: true, createdAt: "2025-01-05", lastSeen: "12 hours ago" },
];

export default function AdminWalletsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "verified" | "primary">("all");
  
  const filteredWallets = demoWallets.filter(w => {
    const matchesSearch = w.address.toLowerCase().includes(search.toLowerCase()) ||
      w.username.toLowerCase().includes(search.toLowerCase());
    
    if (filter === "verified") return matchesSearch && w.verified;
    if (filter === "primary") return matchesSearch && w.primary;
    return matchesSearch;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Wallet Connections</h1>
          <p className="text-gray-400">View all connected wallets across the platform</p>
        </div>
        <div className="text-sm text-gray-400">
          {demoWallets.length} total wallets
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
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
            className={filter === "all" ? "bg-blue-600" : "border-[#30363d] text-gray-400"}
          >
            All
          </Button>
          <Button
            variant={filter === "verified" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("verified")}
            className={filter === "verified" ? "bg-green-600" : "border-[#30363d] text-gray-400"}
          >
            Verified
          </Button>
          <Button
            variant={filter === "primary" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("primary")}
            className={filter === "primary" ? "bg-purple-600" : "border-[#30363d] text-gray-400"}
          >
            Primary
          </Button>
        </div>
      </div>

      {/* Wallets Table */}
      <Card className="bg-[#161b22] border-[#30363d]">
        <CardContent className="p-0">
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
                      <code className="text-blue-400 text-sm">{wallet.address.slice(0, 8)}...{wallet.address.slice(-4)}</code>
                      <a 
                        href={`https://solscan.io/account/${wallet.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-white"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </td>
                  <td className="p-4">
                    <Link href={`/admin/users/${wallet.userId}`} className="text-gray-300 hover:text-white">
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
                  <td className="p-4 text-gray-400">{wallet.createdAt}</td>
                  <td className="p-4 text-gray-400">{wallet.lastSeen}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredWallets.length === 0 && (
            <div className="p-8 text-center text-gray-400">
              No wallets found matching your criteria.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
