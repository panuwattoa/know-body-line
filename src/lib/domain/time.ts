/** Bangkok is a fixed UTC+7 offset (no DST), so we can do TZ math directly. */
export const BKK_OFFSET_MIN = 420;

/** Current local date in Bangkok as YYYY-MM-DD. */
export function bkkToday(now: Date = new Date()): string {
  const local = new Date(now.getTime() + BKK_OFFSET_MIN * 60_000);
  return local.toISOString().slice(0, 10);
}

/** UTC ISO boundaries [start, end) for a Bangkok local date. */
export function bkkDayRange(dateStr: string): { startUtc: string; endUtc: string } {
  const [y, m, d] = dateStr.split("-").map(Number);
  const startMs = Date.UTC(y, m - 1, d, 0, 0, 0) - BKK_OFFSET_MIN * 60_000;
  const endMs = startMs + 24 * 60 * 60_000;
  return { startUtc: new Date(startMs).toISOString(), endUtc: new Date(endMs).toISOString() };
}

/** Local Bangkok clock parts for cron scheduling. */
export function bkkParts(now: Date = new Date()): {
  date: string;
  hour: number;
  minute: number;
  weekday: number; // 0=Sun..6=Sat
  hhmm: string;
} {
  const local = new Date(now.getTime() + BKK_OFFSET_MIN * 60_000);
  const hour = local.getUTCHours();
  const minute = local.getUTCMinutes();
  return {
    date: local.toISOString().slice(0, 10),
    hour,
    minute,
    weekday: local.getUTCDay(),
    hhmm: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
  };
}

/** Guess meal type from the local hour. */
export function guessMealType(now: Date = new Date()): "breakfast" | "lunch" | "dinner" | "snack" {
  const h = new Date(now.getTime() + BKK_OFFSET_MIN * 60_000).getUTCHours();
  if (h >= 5 && h < 11) return "breakfast";
  if (h >= 11 && h < 15) return "lunch";
  if (h >= 17 && h < 21) return "dinner";
  return "snack";
}
