"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ChevronRight, Wallet, AlertTriangle, Loader2 } from "lucide-react";
import Link from "next/link";

interface User {
  id: string;
  username: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  wallet_count: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch("/api/admin/users");
        const data = await res.json();
        
        if (data.error === "Admin service key not configured") {
          setError(data.error);
        } else if (data.error) {
          setError(data.error);
        } else {
          setUsers(data.users || []);
        }
      } catch (err) {
        setError("Failed to load users");
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, []);

  const filteredUsers = users.filter(u => 
    (u.username?.toLowerCase() || "").includes(search.toLowerCase()) ||
    (u.display_name?.toLowerCase() || "").includes(search.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
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
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-gray-400">Manage platform users and their profiles</p>
        </div>
        <Card className="bg-yellow-500/10 border-yellow-500/30">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-6 w-6 text-yellow-500" />
              <div>
                <h3 className="text-yellow-400 font-semibold">Admin Service Key Not Configured</h3>
                <p className="text-yellow-400/80 text-sm mt-1">
                  Add <code className="bg-yellow-500/20 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> to your environment variables to view users.
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
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-gray-400">Manage platform users and their profiles</p>
        </div>
        <div className="text-sm text-gray-400">
          {users.length} total users
        </div>
      </div>

      {error && (
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="p-4 text-red-400">{error}</CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <Input
          placeholder="Search by username or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-[#141414] border-[#2a2a2a] text-white"
        />
      </div>

      {/* Users Table */}
      <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
        <CardContent className="p-0">
          {filteredUsers.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2a2a2a] text-gray-400 text-sm">
                  <th className="text-left p-4">User</th>
                  <th className="text-left p-4">Wallets</th>
                  <th className="text-left p-4">Joined</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-[#2a2a2a]/50 hover:bg-[#141414]/50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {user.avatar_url ? (
                          <img 
                            src={user.avatar_url} 
                            alt="" 
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">
                              {(user.display_name || user.username || "?").charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-white">{user.display_name || user.username || "Unknown"}</p>
                          <p className="text-sm text-gray-400">@{user.username || "no-username"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 text-gray-300">
                        <Wallet className="h-4 w-4" />
                        {user.wallet_count}
                      </div>
                    </td>
                    <td className="p-4 text-gray-400">{formatDate(user.created_at)}</td>
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
          ) : (
            <div className="p-8 text-center text-gray-400">
              {search ? "No users found matching your search." : "No users found."}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
