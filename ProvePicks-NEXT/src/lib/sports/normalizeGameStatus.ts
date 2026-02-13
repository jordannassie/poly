"use client";

export type NormalizedGameStatus = "UPCOMING" | "LIVE" | "FINAL" | "CANCELLED" | "UNKNOWN";

export function normalizeGameStatus(raw?: string | null): NormalizedGameStatus {
  if (!raw) return "UNKNOWN";
  const value = String(raw).trim().toLowerCase();

  if (["1h", "2h", "ht", "second half"].includes(value) || value.includes("half")) {
    return "LIVE";
  }

  if (["ns", "not started"].includes(value)) {
    return "UPCOMING";
  }

  if (value === "ft") {
    return "FINAL";
  }

  if (value === "cancelled" || value === "canceled") {
    return "CANCELLED";
  }

  return "UNKNOWN";
}

export function isLiveStatus(raw?: string | null): boolean {
  return normalizeGameStatus(raw) === "LIVE";
}

export function isUpcomingStatus(raw?: string | null): boolean {
  return normalizeGameStatus(raw) === "UPCOMING";
}

export function isFinalStatus(raw?: string | null): boolean {
  return normalizeGameStatus(raw) === "FINAL";
}
