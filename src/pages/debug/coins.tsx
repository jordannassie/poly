"use client";

import { useState } from "react";

export default function CoinDebugPage() {
  const [status, setStatus] = useState<string | null>(null);
  const [output, setOutput] = useState<string>("Waiting for action");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runCoinEnsure = async () => {
    setIsLoading(true);
    setStatus("Running /api/coins/ensure...");
    setError(null);

    try {
      const response = await fetch("/api/coins/ensure", { method: "POST" });
      const body = await response.json();

      setStatus(`HTTP ${response.status}`);
      setOutput(JSON.stringify(body, null, 2));

      if (!response.ok) {
        setError(body?.error || "Request failed");
      }
    } catch (fetchError: unknown) {
      setStatus("Request error");
      setOutput("");
      setError(
        fetchError instanceof Error ? fetchError.message : "Unknown error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[color:var(--app-bg)] text-[color:var(--text-strong)] p-6">
      <h1 className="text-2xl font-bold mb-4">Coin Debug</h1>
      <p className="mb-4 text-sm text-[color:var(--text-muted)]">
        Run the onboarding coin check for the current authenticated user.
      </p>
      <button
        className="px-4 py-2 rounded-lg bg-[color:var(--surface)] border border-[color:var(--border-soft)] hover:bg-[color:var(--surface-2)] transition-colors"
        onClick={runCoinEnsure}
        disabled={isLoading}
      >
        {isLoading ? "Running..." : "Run coin ensure"}
      </button>
      <div className="mt-4 text-sm">
        <div className="font-semibold">Status: {status ?? "Not run yet"}</div>
        {error && <div className="text-red-500 mt-1">Error: {error}</div>}
      </div>
      <pre className="mt-4 p-4 rounded-lg bg-[color:var(--surface-2)] border border-[color:var(--border-soft)] text-xs overflow-auto">
        {output}
      </pre>
    </div>
  );
}
