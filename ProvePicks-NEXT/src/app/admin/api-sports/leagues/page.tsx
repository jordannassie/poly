"use client";

import Link from "next/link";
import { ArrowLeft, Globe } from "lucide-react";
import { LeagueSyncPanel } from "@/components/admin/LeagueSyncPanel";

export default function AdminLeagueSyncPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin" className="text-gray-400 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Globe className="h-6 w-6 text-blue-400" />
            League Sync
          </h1>
          <p className="text-gray-400 text-sm">
            Unified sync management for all sports leagues
          </p>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-[#21262d] border border-[#30363d] rounded-xl p-4">
        <h4 className="text-white font-medium mb-2">How to Use</h4>
        <ol className="text-sm text-gray-400 space-y-1 list-decimal list-inside">
          <li>Select a league from the tabs above</li>
          <li>Click <strong className="text-blue-400">Test Connection</strong> to verify API access</li>
          <li>Click <strong className="text-purple-400">Sync Teams</strong> to download team data and logos</li>
          <li>Set a date range and click <strong className="text-orange-400">Sync Games</strong> for specific dates</li>
          <li>Or click <strong className="text-green-400">Sync Next 365 Days</strong> to cache a full year</li>
          <li>Click <strong className="text-red-400">Update Live Scores</strong> during active games</li>
        </ol>
      </div>

      {/* Main Sync Panel */}
      <LeagueSyncPanel />
    </div>
  );
}
