/**
 * Date conversion helper for SportsDataIO NFL API.
 * NFL endpoints expect dates in format: YYYY-MMM-DD (e.g., 2026-JAN-28)
 */

const MONTHS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
] as const;

/**
 * Convert ISO date (YYYY-MM-DD) to SportsDataIO NFL format (YYYY-MMM-DD)
 * @param iso - Date string in YYYY-MM-DD format
 * @returns Date string in YYYY-MMM-DD format (uppercase 3-letter month)
 * @example toSportsDataIONflDate("2026-01-28") => "2026-JAN-28"
 */
export function toSportsDataIONflDate(iso: string): string {
  // Parse the ISO date
  const parts = iso.split("-");
  if (parts.length !== 3) {
    throw new Error(`Invalid ISO date format: ${iso}. Expected YYYY-MM-DD`);
  }

  const [year, monthStr, day] = parts;
  const monthIndex = parseInt(monthStr, 10) - 1; // 0-indexed

  if (monthIndex < 0 || monthIndex > 11) {
    throw new Error(`Invalid month in date: ${iso}`);
  }

  const monthAbbr = MONTHS[monthIndex];
  return `${year}-${monthAbbr}-${day}`;
}

/**
 * Get today's date in SportsDataIO NFL format
 * @returns Today's date in YYYY-MMM-DD format
 */
export function getTodayNflDate(): string {
  const today = new Date();
  const iso = today.toISOString().split("T")[0];
  return toSportsDataIONflDate(iso);
}

/**
 * Get tomorrow's date in SportsDataIO NFL format
 * @returns Tomorrow's date in YYYY-MMM-DD format
 */
export function getTomorrowNflDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const iso = tomorrow.toISOString().split("T")[0];
  return toSportsDataIONflDate(iso);
}

/**
 * Get today's date in ISO format (YYYY-MM-DD)
 */
export function getTodayIso(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Get tomorrow's date in ISO format (YYYY-MM-DD)
 */
export function getTomorrowIso(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split("T")[0];
}
