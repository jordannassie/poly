"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Download, 
  Mail, 
  Calendar, 
  RefreshCw,
  Users,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface WaitlistEntry {
  id: string;
  email: string;
  source: string;
  created_at: string;
}

export default function AdminWaitlistPage() {
  const [emails, setEmails] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/waitlist");
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = "/admin/login";
          return;
        }
        throw new Error("Failed to fetch waitlist");
      }
      const data = await res.json();
      setEmails(data.emails || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load waitlist");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  const handleDownloadCSV = () => {
    window.open("/api/admin/waitlist?format=csv", "_blank");
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Waitlist</h1>
              <p className="text-gray-400 text-sm">
                {emails.length} email{emails.length !== 1 ? "s" : ""} collected
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={fetchEmails}
              disabled={loading}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              onClick={handleDownloadCSV}
              disabled={emails.length === 0}
              className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Download CSV
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-[#111111] border border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <Users className="h-5 w-5 text-orange-400" />
              </div>
              <span className="text-gray-400 text-sm">Total Signups</span>
            </div>
            <p className="text-3xl font-bold">{emails.length}</p>
          </div>
          <div className="bg-[#111111] border border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Clock className="h-5 w-5 text-green-400" />
              </div>
              <span className="text-gray-400 text-sm">Today</span>
            </div>
            <p className="text-3xl font-bold">
              {emails.filter((e) => {
                const date = new Date(e.created_at);
                const today = new Date();
                return date.toDateString() === today.toDateString();
              }).length}
            </p>
          </div>
          <div className="bg-[#111111] border border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-blue-400" />
              </div>
              <span className="text-gray-400 text-sm">This Week</span>
            </div>
            <p className="text-3xl font-bold">
              {emails.filter((e) => {
                const date = new Date(e.created_at);
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return date >= weekAgo;
              }).length}
            </p>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Email List */}
        <div className="bg-[#111111] border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h2 className="font-semibold flex items-center gap-2">
              <Mail className="h-4 w-4 text-orange-400" />
              All Emails
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              Loading waitlist...
            </div>
          ) : emails.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No emails collected yet</p>
              <p className="text-sm mt-1">Share your waitlist page to start collecting signups</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {emails.map((entry) => (
                <div
                  key={entry.id}
                  className="px-4 py-3 hover:bg-white/5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-500/30 to-amber-500/30 flex items-center justify-center text-xs font-bold">
                      {entry.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{entry.email}</p>
                      <p className="text-xs text-gray-500">{entry.source || "gate_page"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">{getTimeAgo(entry.created_at)}</p>
                    <p className="text-xs text-gray-600">{formatDate(entry.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Copy All */}
        {emails.length > 0 && (
          <div className="mt-6 p-4 bg-[#111111] border border-gray-800 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Quick Copy</p>
                <p className="text-sm text-gray-500">Copy all emails for easy pasting</p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  const allEmails = emails.map((e) => e.email).join(", ");
                  navigator.clipboard.writeText(allEmails);
                }}
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                Copy All Emails
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
