/**
 * Get today's date in YYYY-MM-DD format, always using local timezone
 * This ensures consistency regardless of server timezone settings
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a YYYY-MM-DD date string as local midnight (not UTC)
 *
 * IMPORTANT: Do NOT use `new Date("YYYY-MM-DD")` as it parses as UTC midnight,
 * which causes timezone-related bugs when compared with local dates.
 * This function correctly creates a Date at midnight in the local timezone.
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed in JS Date
}

/**
 * Convert a date to YYYY-MM-DD format in local timezone
 */
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
