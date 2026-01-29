"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

// Demo payouts data
const demoPayouts = [
  { id: "1", userId: "1", username: "demo", amount: "$1,250", currency: "USDC", status: "sent", wallet: "8xK3nR...9fD2", txSignature: "5Yh3...2Kp9", createdAt: "2025-01-28 14:30" },
  { id: "2", userId: "2", username: "bossoskil1", amount: "$3,500", currency: "USDC", status: "sent", wallet: "5pM2kL...7dE1", txSignature: "8Jk2...9Lm4", createdAt: "2025-01-28 12:15" },
  { id: "3", userId: "1", username: "demo", amount: "$890", currency: "USDC", status: "queued", wallet: "8xK3nR...9fD2", txSignature: null, createdAt: "2025-01-29 09:00" },
  { id: "4", userId: "3", username: "kch123", amount: "$2,100", currency: "USDC", status: "queued", wallet: "7rP6nU...5fG3", txSignature: null, createdAt: "2025-01-29 08:45" },
  { id: "5", userId: "4", username: "gopatriots", amount: "$450", currency: "USDC", status: "failed", wallet: "3sQ8pV...7gH5", error: "Insufficient SOL for fees", createdAt: "2025-01-27 16:20" },
];

export default function AdminPayoutsPage() {
  const [statusFilter, setStatusFilter] = useState<"all" | "queued" | "sent" | "failed">("all");
  
  const filteredPayouts = demoPayouts.filter(p => 
    statusFilter === "all" || p.status === statusFilter
  );

  const counts = {
    queued: demoPayouts.filter(p => p.status === "queued").length,
    sent: demoPayouts.filter(p => p.status === "sent").length,
    failed: demoPayouts.filter(p => p.status === "failed").length,
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "queued": return <Clock className="h-4 w-4 text-yellow-500" />;
      case "failed": return <XCircle className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Payouts</h1>
          <p className="text-gray-400">Manage user payout queue and history</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-[#161b22] border-[#30363d]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{counts.queued}</p>
                <p className="text-sm text-gray-400">Queued</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#161b22] border-[#30363d]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{counts.sent}</p>
                <p className="text-sm text-gray-400">Sent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#161b22] border-[#30363d]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{counts.failed}</p>
                <p className="text-sm text-gray-400">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {["all", "queued", "sent", "failed"].map((status) => (
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

      {/* Payouts Table */}
      <Card className="bg-[#161b22] border-[#30363d]">
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#30363d] text-gray-400 text-sm">
                <th className="text-left p-4">User</th>
                <th className="text-left p-4">Amount</th>
                <th className="text-left p-4">Wallet</th>
                <th className="text-left p-4">Status</th>
                <th className="text-left p-4">TX / Error</th>
                <th className="text-left p-4">Created</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayouts.map((payout) => (
                <tr key={payout.id} className="border-b border-[#30363d]/50 hover:bg-[#0d1117]/50">
                  <td className="p-4">
                    <p className="text-white">@{payout.username}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-white font-semibold">{payout.amount}</p>
                    <p className="text-gray-400 text-xs">{payout.currency}</p>
                  </td>
                  <td className="p-4">
                    <code className="text-gray-400 text-sm">{payout.wallet}</code>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(payout.status)}
                      <span className={`text-sm ${
                        payout.status === "sent" ? "text-green-400" :
                        payout.status === "queued" ? "text-yellow-400" :
                        "text-red-400"
                      }`}>
                        {payout.status}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    {payout.txSignature ? (
                      <code className="text-blue-400 text-sm">{payout.txSignature}</code>
                    ) : payout.error ? (
                      <span className="text-red-400 text-sm">{payout.error}</span>
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </td>
                  <td className="p-4 text-gray-400">{payout.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Warning Banner */}
      <Card className="bg-yellow-500/10 border-yellow-500/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <p className="text-yellow-400 text-sm">
              Payout processing is currently in read-only mode. Enable SUPABASE_SERVICE_ROLE_KEY to process payouts.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
