"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, AlertTriangle, AlertCircle, Info } from "lucide-react";

// Demo logs data
const demoLogs = [
  { id: "1", eventType: "ADMIN_LOGIN", severity: "info", message: "Admin logged in from 192.168.1.1", actor: null, entityType: null, entityId: null, createdAt: "2025-01-29 10:30:00" },
  { id: "2", eventType: "CACHE_WARM", severity: "info", message: "SportsDataIO cache warmed for NFL, NBA", actor: null, entityType: "cache", entityId: null, createdAt: "2025-01-29 08:00:00" },
  { id: "3", eventType: "MARKET_SETTLED", severity: "info", message: "Market settled: Chiefs vs Eagles - HOME win", actor: null, entityType: "market", entityId: "m-123", createdAt: "2025-01-28 21:45:00" },
  { id: "4", eventType: "PAYOUT_QUEUED", severity: "info", message: "Payout queued for user demo: $1,250 USDC", actor: "user-1", entityType: "payout", entityId: "p-456", createdAt: "2025-01-28 14:30:00" },
  { id: "5", eventType: "PAYOUT_FAILED", severity: "error", message: "Payout failed for user gopatriots: Insufficient SOL for fees", actor: "user-4", entityType: "payout", entityId: "p-789", createdAt: "2025-01-27 16:20:00" },
  { id: "6", eventType: "WALLET_CONNECTED", severity: "info", message: "Wallet connected for user bossoskil1: 5pM2kL...7dE1", actor: "user-2", entityType: "wallet", entityId: "w-101", createdAt: "2025-01-27 12:00:00" },
  { id: "7", eventType: "CACHE_ERROR", severity: "warn", message: "SportsDataIO rate limit approaching (80%)", actor: null, entityType: "cache", entityId: null, createdAt: "2025-01-26 15:30:00" },
  { id: "8", eventType: "MARKET_IMPORTED", severity: "info", message: "12 new NFL markets imported from SportsDataIO", actor: null, entityType: "market", entityId: null, createdAt: "2025-01-26 08:00:00" },
];

export default function AdminLogsPage() {
  const [severityFilter, setSeverityFilter] = useState<"all" | "info" | "warn" | "error">("all");
  
  const filteredLogs = demoLogs.filter(log => 
    severityFilter === "all" || log.severity === severityFilter
  );

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "error": return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "warn": return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityClass = (severity: string) => {
    switch (severity) {
      case "error": return "bg-red-500/10 border-red-500/30";
      case "warn": return "bg-yellow-500/10 border-yellow-500/30";
      default: return "bg-[#0d1117] border-[#30363d]/50";
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">System Logs</h1>
          <p className="text-gray-400">View system events and activity logs</p>
        </div>
        <div className="text-sm text-gray-400">
          {demoLogs.length} total events
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {["all", "info", "warn", "error"].map((severity) => (
          <Button
            key={severity}
            variant={severityFilter === severity ? "default" : "outline"}
            size="sm"
            onClick={() => setSeverityFilter(severity as any)}
            className={
              severityFilter === severity 
                ? severity === "error" ? "bg-red-600" 
                  : severity === "warn" ? "bg-yellow-600" 
                  : "bg-blue-600"
                : "border-[#30363d] text-gray-400"
            }
          >
            {severity.charAt(0).toUpperCase() + severity.slice(1)}
          </Button>
        ))}
      </div>

      {/* Logs List */}
      <div className="space-y-2">
        {filteredLogs.map((log) => (
          <Card key={log.id} className={`${getSeverityClass(log.severity)} border`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {getSeverityIcon(log.severity)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-gray-400 bg-[#161b22] px-2 py-0.5 rounded">
                      {log.eventType}
                    </span>
                    {log.entityType && (
                      <span className="text-xs text-gray-500">
                        {log.entityType}{log.entityId ? `: ${log.entityId}` : ""}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-300">{log.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{log.createdAt}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredLogs.length === 0 && (
        <Card className="bg-[#161b22] border-[#30363d]">
          <CardContent className="p-8 text-center text-gray-400">
            No logs found matching your criteria.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
