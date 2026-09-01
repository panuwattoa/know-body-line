/**
 * KnowBody — central configuration.
 *
 * The AI coach persona name is intentionally configurable. The "พี่ชาด" account
 * you saw is only a reference/example — KnowBody ships with a neutral coach name
 * that you can rebrand from a single env var without touching prompts or UI.
 */

export const BRAND = "KnowBody";

/** Coach persona name shown in chat + LIFF. Override with COACH_NAME. */
export const COACH_NAME = process.env.COACH_NAME?.trim() || "โค้ช";

/** Public origin of the deployment (used to build LIFF + image URLs). */
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

/** LIFF ids for each mini-app view (create these in the LINE Developers console). */
export const LIFF_IDS = {
  onboarding: process.env.NEXT_PUBLIC_LIFF_ID_ONBOARDING || "",
  history: process.env.NEXT_PUBLIC_LIFF_ID_HISTORY || "",
  report: process.env.NEXT_PUBLIC_LIFF_ID_REPORT || "",
  profile: process.env.NEXT_PUBLIC_LIFF_ID_PROFILE || "",
} as const;

/**
 * Deep links opened from Flex buttons / rich menu.
 * When a LIFF id exists we return the canonical `liff.line.me/<id>` link — the id
 * already resolves to its own endpoint, so we must NOT append the app path (doing
 * so double-appends and 404s). `path` is only the dev fallback when no id is set.
 */
export const liffUrl = (liffId: string, path = "") =>
  liffId ? `https://liff.line.me/${liffId}` : `${APP_URL}${path}`;

export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

/** Brand palette (kept in one place so Flex + web stay in sync). */
export const COLORS = {
  brand: "#7BC043", // KnowBody green
  brandDark: "#5a9e2e",
  text: "#1a1a1a",
  subtle: "#8a8a8a",
  danger: "#e74c3c",
  warn: "#e59b1b",
  ok: "#2ecc71",
  cardBg: "#f5f5f5",
} as const;
