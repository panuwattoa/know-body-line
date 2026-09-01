import crypto from "node:crypto";
import { getDailyTotalsRange, getProfile, getTargets, getWeightSeries } from "@/lib/domain/repo";
import { bkkToday } from "@/lib/domain/time";
import type { Meal, Profile } from "@/lib/supabase/types";

export interface ReportDay {
  date: string;
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  sodium: number;
  sugar: number;
}

export interface ReportData {
  range: number;
  today: string;
  targets: Awaited<ReturnType<typeof getTargets>>;
  days: ReportDay[];
  weights: { weight_kg: number; logged_on: string }[];
  avgKcal: number;
  bestDay: ReportDay | null;
  watchDay: ReportDay | null;
  goalWeight: number | null;
  /** Days that actually have logged meals (used for the AI prompt). */
  logged: ReportDay[];
  profile: Profile | null;
}

/** Aggregate the non-AI portion of a report (fast: DB only, no model calls). */
export async function buildReport(userId: string, range: 7 | 30): Promise<ReportData> {
  const since = new Date(Date.now() - (range - 1) * 86_400_000).toISOString().slice(0, 10);

  const [meals, weights, targets, profile] = await Promise.all([
    getDailyTotalsRange(userId, since),
    getWeightSeries(userId, since),
    getTargets(userId),
    getProfile(userId),
  ]);

  // Group nutrition by Bangkok local date.
  const byDate = new Map<string, ReportDay>();
  for (const m of meals as Partial<Meal>[]) {
    const d = bkkToday(new Date(m.eaten_at as string));
    const cur = byDate.get(d) ?? { date: d, kcal: 0, protein: 0, carb: 0, fat: 0, sodium: 0, sugar: 0 };
    cur.kcal += m.kcal ?? 0;
    cur.protein += m.protein_g ?? 0;
    cur.carb += m.carb_g ?? 0;
    cur.fat += m.fat_g ?? 0;
    cur.sodium += m.sodium_mg ?? 0;
    cur.sugar += m.sugar_g ?? 0;
    byDate.set(d, cur);
  }

  const days: ReportDay[] = [];
  for (let i = range - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    days.push(byDate.get(date) ?? { date, kcal: 0, protein: 0, carb: 0, fat: 0, sodium: 0, sugar: 0 });
  }

  const logged = days.filter((d) => d.kcal > 0);
  const avgKcal = logged.length ? Math.round(logged.reduce((a, d) => a + d.kcal, 0) / logged.length) : 0;
  const bestDay =
    logged.slice().sort((a, b) => Math.abs(a.kcal - targets.kcal) - Math.abs(b.kcal - targets.kcal))[0] ?? null;
  const watchDay = logged.slice().sort((a, b) => b.sodium - a.sodium)[0] ?? null;

  return {
    range,
    today: bkkToday(),
    targets,
    days,
    weights,
    avgKcal,
    bestDay,
    watchDay,
    goalWeight: profile?.target_weight_kg ?? null,
    logged,
    profile,
  };
}

/**
 * Stable fingerprint of the data that feeds the AI analysis. Same intake +
 * targets + goal → same signature → cached analysis is reused (no model call).
 */
export function reportSignature(r: ReportData): string {
  const basis =
    r.logged
      .map(
        (d) =>
          `${d.date}:${Math.round(d.kcal)}:${Math.round(d.protein)}:${Math.round(d.carb)}:${Math.round(d.fat)}:${Math.round(d.sodium)}:${Math.round(d.sugar)}`,
      )
      .join("|") +
    `#t:${r.targets.kcal}:${r.targets.protein}#g:${r.profile?.goal ?? ""}`;
  return crypto.createHash("sha1").update(basis).digest("hex");
}
