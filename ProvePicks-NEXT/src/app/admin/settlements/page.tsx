"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Scale, CheckCircle, User } from "lucide-react";

// Demo settlements data
const demoSettlements = [
  { id: "1", marketId: "3", market: "Bills vs Ravens - AFC Championship", outcome: "HOME", settledBy: "system", settledAt: "2025-01-26 18:45" },
  { id: "2", marketId: "4", market: "Warriors vs Nuggets", outcome: "AWAY", settledBy: "system", settledAt: "2025-01-28 00:30" },
  { id: "3", marketId: "10", market: "Lakers vs Celtics (Jan 25)", outcome: "AWAY", settledBy: "admin", settledAt: "2025-01-25 23:15" },
  { id: "4", marketId: "11", market: "Chiefs vs Dolphins", outcome: "HOME", settledBy: "system", settledAt: "2025-01-20 19:00" },
];

export default function AdminSettlementsPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Settlements</h1>
          <p className="text-gray-400">View all market settlement history</p>
        </div>
        <div className="text-sm text-gray-400">
          {demoSettlements.length} total settlements
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-[#161b22] border-[#30363d]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{demoSettlements.length}</p>
                <p className="text-sm text-gray-400">Total Settled</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#161b22] border-[#30363d]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Scale className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {demoSettlements.filter(s => s.settledBy === "system").length}
                </p>
                <p className="text-sm text-gray-400">Auto-Settled</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#161b22] border-[#30363d]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <User className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {demoSettlements.filter(s => s.settledBy === "admin").length}
                </p>
                <p className="text-sm text-gray-400">Manual Override</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settlements Table */}
      <Card className="bg-[#161b22] border-[#30363d]">
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#30363d] text-gray-400 text-sm">
                <th className="text-left p-4">Market</th>
                <th className="text-left p-4">Outcome</th>
                <th className="text-left p-4">Settled By</th>
                <th className="text-left p-4">Settled At</th>
              </tr>
            </thead>
            <tbody>
              {demoSettlements.map((settlement) => (
                <tr key={settlement.id} className="border-b border-[#30363d]/50 hover:bg-[#0d1117]/50">
                  <td className="p-4">
                    <p className="text-white font-medium">{settlement.market}</p>
                    <p className="text-gray-400 text-sm">Market ID: {settlement.marketId}</p>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-sm font-medium ${
                      settlement.outcome === "HOME" ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400"
                    }`}>
                      {settlement.outcome}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`flex items-center gap-1 text-sm ${
                      settlement.settledBy === "system" ? "text-gray-400" : "text-purple-400"
                    }`}>
                      {settlement.settledBy === "system" ? (
                        <><Scale className="h-3 w-3" />System</>
                      ) : (
                        <><User className="h-3 w-3" />Admin</>
                      )}
                    </span>
                  </td>
                  <td className="p-4 text-gray-300">{settlement.settledAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
