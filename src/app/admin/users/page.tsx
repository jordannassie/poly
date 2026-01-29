"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ChevronRight, User, Wallet, Calendar } from "lucide-react";
import Link from "next/link";

// Demo users data
const demoUsers = [
  { id: "1", username: "demo", displayName: "Demo Trader", email: "demo@provepicks.com", createdAt: "2025-01-15", wallets: 1, totalVolume: "$892,340" },
  { id: "2", username: "bossoskil1", displayName: "Boss Trader", email: "boss@example.com", createdAt: "2025-01-10", wallets: 2, totalVolume: "$1,234,567" },
  { id: "3", username: "kch123", displayName: "KC Hunter", email: "kc@example.com", createdAt: "2025-01-08", wallets: 1, totalVolume: "$987,654" },
  { id: "4", username: "gopatriots", displayName: "Patriots Fan", email: "pats@example.com", createdAt: "2025-01-05", wallets: 3, totalVolume: "$567,890" },
  { id: "5", username: "DrPufferfish", displayName: "Dr. Puffer", email: "puffer@example.com", createdAt: "2025-01-03", wallets: 1, totalVolume: "$345,678" },
];

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  
  const filteredUsers = demoUsers.filter(u => 
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.displayName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-gray-400">Manage platform users and their profiles</p>
        </div>
        <div className="text-sm text-gray-400">
          {demoUsers.length} total users
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <Input
          placeholder="Search by username, name, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-[#0d1117] border-[#30363d] text-white"
        />
      </div>

      {/* Users Table */}
      <Card className="bg-[#161b22] border-[#30363d]">
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#30363d] text-gray-400 text-sm">
                <th className="text-left p-4">User</th>
                <th className="text-left p-4">Email</th>
                <th className="text-left p-4">Wallets</th>
                <th className="text-left p-4">Volume</th>
                <th className="text-left p-4">Joined</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-[#30363d]/50 hover:bg-[#0d1117]/50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {user.displayName.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-white">{user.displayName}</p>
                        <p className="text-sm text-gray-400">@{user.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-gray-300">{user.email}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-1 text-gray-300">
                      <Wallet className="h-4 w-4" />
                      {user.wallets}
                    </div>
                  </td>
                  <td className="p-4 text-green-400 font-medium">{user.totalVolume}</td>
                  <td className="p-4 text-gray-400">{user.createdAt}</td>
                  <td className="p-4">
                    <Link href={`/admin/users/${user.id}`}>
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredUsers.length === 0 && (
            <div className="p-8 text-center text-gray-400">
              No users found matching your search.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
