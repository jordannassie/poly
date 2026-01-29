"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Activity, Clock, CheckCircle } from "lucide-react";

// Demo markets data
const demoMarkets = [
  { id: "1", league: "NFL", homeTeam: "Chiefs", awayTeam: "Eagles", slug: "chiefs-vs-eagles-sb", startTime: "2025-02-09 18:30", gameStatus: "scheduled", marketStatus: "open", sportsdataId: 12345 },
  { id: "2", league: "NBA", homeTeam: "Lakers", awayTeam: "Celtics", slug: "lakers-vs-celtics", startTime: "2025-01-30 20:00", gameStatus: "live", marketStatus: "open", sportsdataId: 23456 },
  { id: "3", league: "NFL", homeTeam: "Bills", awayTeam: "Ravens", slug: "bills-vs-ravens-afc", startTime: "2025-01-26 15:00", gameStatus: "final", marketStatus: "settled", sportsdataId: 34567, finalOutcome: "HOME" },
  { id: "4", league: "NBA", homeTeam: "Warriors", awayTeam: "Nuggets", slug: "warriors-vs-nuggets", startTime: "2025-01-28 22:00", gameStatus: "final", marketStatus: "settled", sportsdataId: 45678, finalOutcome: "AWAY" },
  { id: "5", league: "NBA", homeTeam: "Heat", awayTeam: "Bucks", slug: "heat-vs-bucks", startTime: "2025-01-31 19:30", gameStatus: "scheduled", marketStatus: "open", sportsdataId: 56789 },
];

export default function AdminMarketsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "live" | "settled">("all");
  
  const filteredMarkets = demoMarkets.filter(m => {
    const matchesSearch = 
      m.homeTeam.toLowerCase().includes(search.toLowerCase()) ||
      m.awayTeam.toLowerCase().includes(search.toLowerCase()) ||
      m.slug.toLowerCase().includes(search.toLowerCase());
    
    if (statusFilter === "open") return matchesSearch && m.marketStatus === "open" && m.gameStatus === "scheduled";
    if (statusFilter === "live") return matchesSearch && m.gameStatus === "live";
    if (statusFilter === "settled") return matchesSearch && m.marketStatus === "settled";
    return matchesSearch;
  });

  const getStatusBadge = (gameStatus: string, marketStatus: string) => {
    if (gameStatus === "live") {
      return <span className="flex items-center gap-1 text-purple-400 text-sm"><Activity className="h-3 w-3 animate-pulse" />Live</span>;
    }
    if (marketStatus === "settled") {
      return <span className="flex items-center gap-1 text-gray-400 text-sm"><CheckCircle className="h-3 w-3" />Settled</span>;
    }
    return <span className="flex items-center gap-1 text-green-400 text-sm"><Clock className="h-3 w-3" />Open</span>;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Markets</h1>
          <p className="text-gray-400">View all prediction markets from SportsDataIO</p>
        </div>
        <div className="text-sm text-gray-400">
          {demoMarkets.length} total markets
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search by team or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-[#0d1117] border-[#30363d] text-white"
          />
        </div>
        <div className="flex gap-2">
          {["all", "open", "live", "settled"].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(status as any)}
              className={statusFilter === status ? "bg-blue-600" : "border-[#30363d] text-gray-400"}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Markets Table */}
      <Card className="bg-[#161b22] border-[#30363d]">
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#30363d] text-gray-400 text-sm">
                <th className="text-left p-4">League</th>
                <th className="text-left p-4">Matchup</th>
                <th className="text-left p-4">Start Time</th>
                <th className="text-left p-4">Status</th>
                <th className="text-left p-4">Outcome</th>
                <th className="text-left p-4">SportsData ID</th>
              </tr>
            </thead>
            <tbody>
              {filteredMarkets.map((market) => (
                <tr key={market.id} className="border-b border-[#30363d]/50 hover:bg-[#0d1117]/50">
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      market.league === "NFL" ? "bg-blue-500/20 text-blue-400" : "bg-orange-500/20 text-orange-400"
                    }`}>
                      {market.league}
                    </span>
                  </td>
                  <td className="p-4">
                    <div>
                      <p className="text-white font-medium">{market.awayTeam} @ {market.homeTeam}</p>
                      <p className="text-gray-400 text-sm">{market.slug}</p>
                    </div>
                  </td>
                  <td className="p-4 text-gray-300">{market.startTime}</td>
                  <td className="p-4">{getStatusBadge(market.gameStatus, market.marketStatus)}</td>
                  <td className="p-4">
                    {market.finalOutcome ? (
                      <span className={`text-sm font-medium ${
                        market.finalOutcome === "HOME" ? "text-green-400" : "text-blue-400"
                      }`}>
                        {market.finalOutcome === "HOME" ? market.homeTeam : market.awayTeam} Win
                      </span>
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </td>
                  <td className="p-4">
                    <code className="text-gray-400 text-sm">{market.sportsdataId}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredMarkets.length === 0 && (
            <div className="p-8 text-center text-gray-400">
              No markets found matching your criteria.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
