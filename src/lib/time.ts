/**
 * Time utilities for user timezone handling
 * No external dependencies - uses built-in Intl API
 */

/**
 * Get the user's timezone (e.g., "America/Chicago")
 */
export function getUserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "America/New_York"; // Fallback
  }
}

/**
 * Format date as long string (e.g., "Saturday, February 14, 2026")
 */
export function formatDateLong(date: Date | string, tz?: string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const timeZone = tz || getUserTimeZone();
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone,
  }).format(d);
}

/**
 * Format time as short string (e.g., "7:30 PM")
 */
export function formatTimeShort(date: Date | string, tz?: string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const timeZone = tz || getUserTimeZone();
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone,
  }).format(d);
}

/**
 * Get start of local day in ISO format (UTC)
 * Returns the UTC timestamp for midnight in the user's timezone
 */
export function startOfLocalDayISO(tz?: string): string {
  const timeZone = tz || getUserTimeZone();
  const now = new Date();
  
  // Get local date string in user's timezone
  const localDateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now); // Returns YYYY-MM-DD
  
  // Create date at midnight in user's timezone
  const parts = localDateStr.split("-");
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-indexed
  const day = parseInt(parts[2], 10);
  
  // Build ISO string for midnight in user's timezone
  const midnightLocal = new Date(
    Date.UTC(year, month, day) - getTimezoneOffsetMs(timeZone)
  );
  
  return midnightLocal.toISOString();
}

/**
 * Get end of local day in ISO format (UTC)
 * Returns the UTC timestamp for 23:59:59.999 in the user's timezone
 */
export function endOfLocalDayISO(tz?: string): string {
  const timeZone = tz || getUserTimeZone();
  const start = new Date(startOfLocalDayISO(timeZone));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return end.toISOString();
}

/**
 * Helper: get timezone offset in milliseconds
 */
function getTimezoneOffsetMs(tz: string): number {
  const now = new Date();
  const utcDate = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
  const tzDate = new Date(now.toLocaleString("en-US", { timeZone: tz }));
  return utcDate.getTime() - tzDate.getTime();
}

/**
 * Check if a date (ISO string or Date) falls within today in user's local timezone
 */
export function isToday(date: Date | string, tz?: string): boolean {
  const d = typeof date === "string" ? new Date(date) : date;
  const timeZone = tz || getUserTimeZone();
  
  const localDateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  
  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  
  return localDateStr === todayStr;
}
