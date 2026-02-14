"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Clock, CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react";

interface Payout {
  id: string;
  user_id: string;
  username: string;
  amount: number;
  currency: string;
  destination_wallet: string | null;
  status: string;
  tx_signature: string | null;
  error: string | null;
  created_at: string;
  processed_at: string | null;
}

interface PayoutCounts {
  queued: number;
  sent: number;
  failed: number;
  total: number;
}

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [counts, setCounts] = useState<PayoutCounts>({ queued: 0, sent: 0, failed: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "queued" | "sent" | "failed">("all");

  useEffect(() => {
    async function fetchPayouts() {
      try {
        const url = statusFilter === "all" 
          ? "/api/admin/payouts" 
          : `/api/admin/payouts?status=${statusFilter}`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.error === "Admin service key not configured") {
          setError(data.error);
        } else if (data.error) {
          setError(data.error);
        } else {
          setPayouts(data.payouts || []);
          setCounts(data.counts || { queued: 0, sent: 0, failed: 0, total: 0 });
        }
      } catch (err) {
        setError("Failed to load payouts");
      } finally {
        setLoading(false);
      }
    }

    fetchPayouts();
  }, [statusFilter]);

  const formatAmount = (amount: number, currency: string) => {
    return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "queued": return <Clock className="h-4 w-4 text-yellow-500" />;
      case "failed": return <XCircle className="h-4 w-4 text-red-500" />;
      default: return null;
    }
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
          <h1 className="text-2xl font-bold text-white">Payouts</h1>
          <p className="text-gray-400">Manage user payout queue and history</p>
        </div>
        <Card className="bg-yellow-500/10 border-yellow-500/30">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-6 w-6 text-yellow-500" />
              <div>
                <h3 className="text-yellow-400 font-semibold">Admin Service Key Not Configured</h3>
                <p className="text-yellow-400/80 text-sm mt-1">
                  Add <code className="bg-yellow-500/20 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> to your environment variables to view payouts.
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
          <h1 className="text-2xl font-bold text-white">Payouts</h1>
          <p className="text-gray-400">Manage user payout queue and history</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
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
        <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
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
        <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
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
        {(["all", "queued", "sent", "failed"] as const).map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(status)}
            className={statusFilter === status ? "bg-orange-500" : "border-[#2a2a2a] text-gray-400"}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Button>
        ))}
      </div>

      {/* Payouts Table */}
      <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
        <CardContent className="p-0">
          {payouts.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2a2a2a] text-gray-400 text-sm">
                  <th className="text-left p-4">User</th>
                  <th className="text-left p-4">Amount</th>
                  <th className="text-left p-4">Wallet</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-left p-4">TX / Error</th>
                  <th className="text-left p-4">Created</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((payout) => (
                  <tr key={payout.id} className="border-b border-[#2a2a2a]/50 hover:bg-[#141414]/50">
                    <td className="p-4">
                      <p className="text-white">@{payout.username}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-white font-semibold">{formatAmount(payout.amount, payout.currency)}</p>
                    </td>
                    <td className="p-4">
                      {payout.destination_wallet ? (
                        <code className="text-gray-400 text-sm">
                          {payout.destination_wallet.slice(0, 6)}...{payout.destination_wallet.slice(-4)}
                        </code>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
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
                      {payout.tx_signature ? (
                        <code className="text-blue-400 text-sm">
                          {payout.tx_signature.slice(0, 8)}...
                        </code>
                      ) : payout.error ? (
                        <span className="text-red-400 text-sm">{payout.error}</span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="p-4 text-gray-400">{formatDateTime(payout.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-gray-400">
              No payouts found.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
