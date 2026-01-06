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

/**
 * Extract the local date string from an ISO timestamp
 *
 * IMPORTANT: Use this instead of `isoString.split('T')[0]` when you need
 * the date in the user's local timezone. The split method gives you the
 * UTC date, which can be off by a day depending on timezone.
 *
 * Example:
 * - UTC timestamp: "2026-01-02T01:00:00Z" (Jan 2, 1 AM UTC)
 * - In EST (UTC-5): This is actually Jan 1, 8 PM local
 * - split('T')[0] returns "2026-01-02" ❌ (UTC date)
 * - This function returns "2026-01-01" ✅ (local date)
 */
export function getLocalDateFromISO(isoString: string): string {
  const date = new Date(isoString);
  return toLocalDateString(date);
}

/**
 * Get the local date string from an ISO timestamp in a specific timezone.
 * Use this on the SERVER when you know the user's timezone.
 *
 * @param isoString - ISO timestamp from database (e.g., "2026-01-02T05:00:00.000Z")
 * @param timezone - IANA timezone string (e.g., "America/New_York")
 * @returns Date string in YYYY-MM-DD format in the specified timezone
 */
export function getLocalDateFromISOWithTimezone(isoString: string, timezone: string): string {
  const date = new Date(isoString);
  // en-CA locale gives YYYY-MM-DD format
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Get today's date string in a specific timezone.
 * Use this on the SERVER when you know the user's timezone.
 *
 * @param timezone - IANA timezone string (e.g., "America/New_York")
 * @returns Today's date in YYYY-MM-DD format in the specified timezone
 */
export function getTodayDateStringWithTimezone(timezone: string): string {
  return getLocalDateFromISOWithTimezone(new Date().toISOString(), timezone);
}

/**
 * Get the user's timezone from the browser.
 * Use this in CLIENT components to pass to server actions.
 *
 * @returns IANA timezone string (e.g., "America/New_York")
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Calculate the current streak at display time.
 *
 * IMPORTANT: The stored `current_streak` in the database is only updated when
 * saving an entry. If a user doesn't log for several days, the stored value
 * becomes stale. Use this function to calculate the accurate streak for display.
 *
 * A streak is the count of consecutive completed days ending with today.
 * If today is not completed, the streak is 0.
 *
 * @param entries - Array of entries with entry_date (YYYY-MM-DD) and is_completed
 * @param todayDate - Today's date in YYYY-MM-DD format (should be computed client-side)
 * @returns The current streak count
 */
export function calculateDisplayStreak(
  entries: { entry_date: string; is_completed: boolean }[],
  todayDate: string
): number {
  // Filter to only completed entries
  const completedEntries = entries.filter(e => e.is_completed);

  if (completedEntries.length === 0) {
    return 0;
  }

  // Create a Set of completed dates for fast lookup
  const completedDates = new Set(completedEntries.map(e => e.entry_date));

  // Start from today and count backwards
  let streak = 0;
  const today = parseLocalDate(todayDate);

  for (let i = 0; i < 1000; i++) { // Safety limit
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - i);
    const dateStr = toLocalDateString(checkDate);

    if (completedDates.has(dateStr)) {
      streak++;
    } else {
      // Gap found - streak ends
      break;
    }
  }

  return streak;
}
