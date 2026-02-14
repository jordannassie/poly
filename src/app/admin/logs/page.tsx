"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, AlertTriangle, AlertCircle, Info, Loader2 } from "lucide-react";

interface SystemEvent {
  id: string;
  event_type: string;
  severity: string;
  actor_user_id: string | null;
  actor_wallet: string | null;
  entity_type: string | null;
  entity_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<SystemEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<"all" | "info" | "warn" | "error">("all");

  useEffect(() => {
    async function fetchLogs() {
      try {
        const url = severityFilter === "all" 
          ? "/api/admin/logs" 
          : `/api/admin/logs?severity=${severityFilter}`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.error === "Admin service key not configured") {
          setError(data.error);
        } else if (data.error) {
          setError(data.error);
        } else {
          setLogs(data.logs || []);
        }
      } catch (err) {
        setError("Failed to load logs");
      } finally {
        setLoading(false);
      }
    }

    fetchLogs();
  }, [severityFilter]);

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

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
      default: return "bg-[#141414] border-[#2a2a2a]/50";
    }
  };

  const formatPayload = (payload: Record<string, unknown>) => {
    if (!payload || Object.keys(payload).length === 0) return null;
    return Object.entries(payload)
      .filter(([_, v]) => v !== null && v !== undefined)
      .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
      .join(', ');
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
          <h1 className="text-2xl font-bold text-white">System Logs</h1>
          <p className="text-gray-400">View system events and activity logs</p>
        </div>
        <Card className="bg-yellow-500/10 border-yellow-500/30">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-6 w-6 text-yellow-500" />
              <div>
                <h3 className="text-yellow-400 font-semibold">Admin Service Key Not Configured</h3>
                <p className="text-yellow-400/80 text-sm mt-1">
                  Add <code className="bg-yellow-500/20 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> to your environment variables to view logs.
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
          <h1 className="text-2xl font-bold text-white">System Logs</h1>
          <p className="text-gray-400">View system events and activity logs</p>
        </div>
        <div className="text-sm text-gray-400">
          {logs.length} events
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(["all", "info", "warn", "error"] as const).map((severity) => (
          <Button
            key={severity}
            variant={severityFilter === severity ? "default" : "outline"}
            size="sm"
            onClick={() => setSeverityFilter(severity)}
            className={
              severityFilter === severity 
                ? severity === "error" ? "bg-red-600" 
                  : severity === "warn" ? "bg-yellow-600" 
                  : "bg-orange-500"
                : "border-[#2a2a2a] text-gray-400"
            }
          >
            {severity.charAt(0).toUpperCase() + severity.slice(1)}
          </Button>
        ))}
      </div>

      {/* Logs List */}
      <div className="space-y-2">
        {logs.length > 0 ? (
          logs.map((log) => (
            <Card key={log.id} className={`${getSeverityClass(log.severity)} border`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {getSeverityIcon(log.severity)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-gray-400 bg-[#1a1a1a] px-2 py-0.5 rounded">
                        {log.event_type}
                      </span>
                      {log.entity_type && (
                        <span className="text-xs text-gray-500">
                          {log.entity_type}{log.entity_id ? `: ${log.entity_id}` : ""}
                        </span>
                      )}
                    </div>
                    {formatPayload(log.payload) && (
                      <p className="text-sm text-gray-300 break-all">{formatPayload(log.payload)}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">{formatDateTime(log.created_at)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
            <CardContent className="p-8 text-center text-gray-400">
              No logs found. Events will appear here as they occur.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
