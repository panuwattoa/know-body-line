import { db } from "@/lib/supabase/client";
import type {
  AppUser,
  ChatState,
  Meal,
  MealItem,
  Profile,
} from "@/lib/supabase/types";
import type { FoodAnalysis } from "@/lib/ai/gemini";
import { bkkDayRange, bkkToday } from "@/lib/domain/time";

const DEFAULT_TARGETS = {
  kcal: 2000,
  protein: 120,
  carb: 220,
  fat: 60,
  sodium: 2000,
  sugar: 50,
};

/** Find or create the KnowBody user for a LINE userId. */
export async function getOrCreateUser(
  lineUserId: string,
  profileLoader?: () => Promise<{ displayName: string; pictureUrl?: string } | null>,
): Promise<AppUser> {
  const supa = db();
  const { data: existing } = await supa
    .from("app_users")
    .select("*")
    .eq("line_user_id", lineUserId)
    .maybeSingle();
  if (existing) return existing as AppUser;

  const profile = profileLoader ? await profileLoader() : null;
  const { data, error } = await supa
    .from("app_users")
    .insert({
      line_user_id: lineUserId,
      display_name: profile?.displayName ?? null,
      picture_url: profile?.pictureUrl ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as AppUser;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data } = await db().from("profiles").select("*").eq("user_id", userId).maybeSingle();
  return (data as Profile) ?? null;
}

export async function upsertProfile(userId: string, patch: Partial<Profile>): Promise<Profile> {
  const { data, error } = await db()
    .from("profiles")
    .upsert({ user_id: userId, ...patch, updated_at: new Date().toISOString() })
    .select("*")
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function setOnboardingState(userId: string, state: AppUser["onboarding_state"]) {
  await db().from("app_users").update({ onboarding_state: state, updated_at: new Date().toISOString() }).eq("id", userId);
}

/** Daily targets, falling back to sensible defaults before onboarding. */
export async function getTargets(userId: string) {
  const p = await getProfile(userId);
  return {
    kcal: p?.target_kcal ?? DEFAULT_TARGETS.kcal,
    protein: p?.target_protein_g ?? DEFAULT_TARGETS.protein,
    carb: p?.target_carb_g ?? DEFAULT_TARGETS.carb,
    fat: p?.target_fat_g ?? DEFAULT_TARGETS.fat,
    sodium: p?.target_sodium_mg ?? DEFAULT_TARGETS.sodium,
    sugar: p?.target_sugar_g ?? DEFAULT_TARGETS.sugar,
  };
}

// ---- chat state (onboarding steps, pending meal drafts) ----

export async function getChatState(userId: string): Promise<ChatState | null> {
  const { data } = await db().from("chat_states").select("*").eq("user_id", userId).maybeSingle();
  return (data as ChatState) ?? null;
}

export async function setChatState(userId: string, state: string | null, context: Record<string, unknown> | null) {
  await db()
    .from("chat_states")
    .upsert({ user_id: userId, state, context, updated_at: new Date().toISOString() });
}

export async function setPendingMeal(userId: string, analysis: FoodAnalysis, imageUrl?: string) {
  await setChatState(userId, "pending_meal", { analysis, imageUrl: imageUrl ?? null });
}

export async function getPendingMeal(
  userId: string,
): Promise<{ analysis: FoodAnalysis; imageUrl: string | null } | null> {
  const s = await getChatState(userId);
  if (s?.state !== "pending_meal" || !s.context) return null;
  return s.context as { analysis: FoodAnalysis; imageUrl: string | null };
}

// ---- meals ----

export interface SaveMealInput {
  analysis: FoodAnalysis;
  imageUrl?: string | null;
  source: "photo" | "text" | "label";
  eatenAt?: string;
}

export async function saveMeal(userId: string, input: SaveMealInput): Promise<Meal> {
  const supa = db();
  const a = input.analysis;
  const { data: meal, error } = await supa
    .from("meals")
    .insert({
      user_id: userId,
      name: a.name,
      meal_type: a.meal_type,
      eaten_at: input.eatenAt ?? new Date().toISOString(),
      portion_g: a.portion_g,
      kcal: a.total.kcal,
      protein_g: a.total.protein_g,
      carb_g: a.total.carb_g,
      fat_g: a.total.fat_g,
      sodium_mg: a.total.sodium_mg,
      sugar_g: a.total.sugar_g,
      image_url: input.imageUrl ?? null,
      source: input.source,
      note: a.coach_note,
    })
    .select("*")
    .single();
  if (error) throw error;

  if (a.items?.length) {
    await supa.from("meal_items").insert(
      a.items.map((it, i) => ({
        meal_id: (meal as Meal).id,
        name: it.name,
        amount_g: it.amount_g,
        kcal: it.kcal,
        protein_g: it.protein_g,
        carb_g: it.carb_g,
        fat_g: it.fat_g,
        sodium_mg: it.sodium_mg,
        sugar_g: it.sugar_g,
        sort_order: i,
      })),
    );
  }
  return meal as Meal;
}

export interface Totals {
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  sodium: number;
  sugar: number;
}
const ZERO: Totals = { kcal: 0, protein: 0, carb: 0, fat: 0, sodium: 0, sugar: 0 };

export async function getDailyTotals(userId: string, date = bkkToday()): Promise<Totals> {
  const { startUtc, endUtc } = bkkDayRange(date);
  const { data } = await db()
    .from("meals")
    .select("kcal,protein_g,carb_g,fat_g,sodium_mg,sugar_g")
    .eq("user_id", userId)
    .gte("eaten_at", startUtc)
    .lt("eaten_at", endUtc);
  const rows = (data ?? []) as Partial<Meal>[];
  return rows.reduce<Totals>(
    (acc, m) => ({
      kcal: acc.kcal + (m.kcal ?? 0),
      protein: acc.protein + (m.protein_g ?? 0),
      carb: acc.carb + (m.carb_g ?? 0),
      fat: acc.fat + (m.fat_g ?? 0),
      sodium: acc.sodium + (m.sodium_mg ?? 0),
      sugar: acc.sugar + (m.sugar_g ?? 0),
    }),
    { ...ZERO },
  );
}

export async function getMealsForDate(userId: string, date: string): Promise<(Meal & { items?: MealItem[] })[]> {
  const { startUtc, endUtc } = bkkDayRange(date);
  const { data } = await db()
    .from("meals")
    .select("*, meal_items(*)")
    .eq("user_id", userId)
    .gte("eaten_at", startUtc)
    .lt("eaten_at", endUtc)
    .order("eaten_at", { ascending: true });
  return (data ?? []).map((m: Record<string, unknown>) => ({ ...(m as unknown as Meal), items: (m.meal_items as MealItem[]) ?? [] }));
}

export async function getMealById(userId: string, mealId: string): Promise<(Meal & { items: MealItem[] }) | null> {
  const { data } = await db()
    .from("meals")
    .select("*, meal_items(*)")
    .eq("user_id", userId)
    .eq("id", mealId)
    .maybeSingle();
  if (!data) return null;
  const m = data as Record<string, unknown>;
  return { ...(m as unknown as Meal), items: ((m.meal_items as MealItem[]) ?? []).sort((a, b) => a.sort_order - b.sort_order) };
}

/** Recompute meal totals from its items (used after LIFF edits). */
export async function updateMealItems(
  userId: string,
  mealId: string,
  items: Array<Pick<MealItem, "name" | "amount_g" | "kcal" | "protein_g" | "carb_g" | "fat_g" | "sodium_mg" | "sugar_g">>,
): Promise<Meal | null> {
  const supa = db();
  const { data: owned } = await supa.from("meals").select("id").eq("id", mealId).eq("user_id", userId).maybeSingle();
  if (!owned) return null;

  await supa.from("meal_items").delete().eq("meal_id", mealId);
  if (items.length) {
    await supa.from("meal_items").insert(items.map((it, i) => ({ meal_id: mealId, ...it, sort_order: i })));
  }
  const total = items.reduce(
    (a, it) => ({
      kcal: a.kcal + (it.kcal ?? 0),
      protein: a.protein + (it.protein_g ?? 0),
      carb: a.carb + (it.carb_g ?? 0),
      fat: a.fat + (it.fat_g ?? 0),
      sodium: a.sodium + (it.sodium_mg ?? 0),
      sugar: a.sugar + (it.sugar_g ?? 0),
      g: a.g + (it.amount_g ?? 0),
    }),
    { kcal: 0, protein: 0, carb: 0, fat: 0, sodium: 0, sugar: 0, g: 0 },
  );
  const { data } = await supa
    .from("meals")
    .update({
      kcal: total.kcal,
      protein_g: total.protein,
      carb_g: total.carb,
      fat_g: total.fat,
      sodium_mg: total.sodium,
      sugar_g: total.sugar,
      portion_g: total.g,
      edited: true,
    })
    .eq("id", mealId)
    .select("*")
    .single();
  return (data as Meal) ?? null;
}

export async function deleteMeal(userId: string, mealId: string) {
  await db().from("meals").delete().eq("id", mealId).eq("user_id", userId);
}

// ---- weight ----

export async function logWeight(userId: string, weightKg: number, date = bkkToday()) {
  await db().from("weight_logs").upsert(
    { user_id: userId, weight_kg: weightKg, logged_on: date },
    { onConflict: "user_id,logged_on" },
  );
  await db().from("profiles").update({ weight_kg: weightKg, updated_at: new Date().toISOString() }).eq("user_id", userId);
}

export async function getWeightSeries(userId: string, sinceDate: string) {
  const { data } = await db()
    .from("weight_logs")
    .select("weight_kg,logged_on")
    .eq("user_id", userId)
    .gte("logged_on", sinceDate)
    .order("logged_on", { ascending: true });
  return (data ?? []) as { weight_kg: number; logged_on: string }[];
}

// ---- usage / rate limiting ----

/** Max food-photo analyses per user per day (Gemini vision cost guard). */
export const DAILY_IMAGE_LIMIT = 20;

/**
 * Atomically increment today's image count and return the new value.
 * Fails open (returns 0 = "allow") if the RPC errors, so a counter hiccup never
 * blocks a paying user.
 */
export async function bumpImageUsage(userId: string, date = bkkToday()): Promise<number> {
  const { data, error } = await db().rpc("increment_image_usage", { p_user: userId, p_day: date });
  if (error) {
    console.error("bumpImageUsage failed", error.message);
    return 0;
  }
  return (data as number) ?? 0;
}

// ---- report analysis cache ----

export async function getReportCache(
  userId: string,
  range: number,
): Promise<{ signature: string; analysis: string } | null> {
  const { data } = await db()
    .from("report_cache")
    .select("signature,analysis")
    .eq("user_id", userId)
    .eq("range", range)
    .maybeSingle();
  return (data as { signature: string; analysis: string }) ?? null;
}

export async function saveReportCache(userId: string, range: number, signature: string, analysis: string) {
  await db()
    .from("report_cache")
    .upsert({ user_id: userId, range, signature, analysis, updated_at: new Date().toISOString() });
}

// ---- reminders ----

export async function seedDefaultReminders(userId: string) {
  const supa = db();
  const { data: existing } = await supa.from("reminders").select("id").eq("user_id", userId).limit(1);
  if (existing && existing.length) return; // don't duplicate
  const everyday = [0, 1, 2, 3, 4, 5, 6];
  await supa.from("reminders").insert([
    { user_id: userId, kind: "weigh_in", time_local: "08:00", days: everyday, enabled: true },
    { user_id: userId, kind: "meal_log", time_local: "12:30", days: everyday, enabled: true },
    { user_id: userId, kind: "meal_log", time_local: "19:00", days: everyday, enabled: true },
    { user_id: userId, kind: "workout", time_local: "18:00", days: [1, 3, 5], enabled: true },
  ]);
}

interface DueReminder {
  id: string;
  kind: "meal_log" | "workout" | "weigh_in";
  user_id: string;
  time_local: string;
  last_sent_on: string | null;
  app_users: { line_user_id: string };
}

/**
 * Return reminders due "now" for a given weekday. Instead of matching the exact
 * minute (fragile when a free scheduler fires late), we fire any reminder whose
 * scheduled time has passed within the last `windowMin` minutes and hasn't been
 * sent today. `last_sent_on` guarantees at-most-once per day.
 */
export async function getDueReminders(
  nowMinutes: number,
  weekday: number,
  date: string,
  windowMin = 90,
): Promise<DueReminder[]> {
  const { data } = await db()
    .from("reminders")
    .select("*, app_users!inner(line_user_id)")
    .eq("enabled", true)
    .contains("days", [weekday]);
  const rows = (data ?? []) as unknown as DueReminder[];
  return rows.filter((r) => {
    if (r.last_sent_on === date) return false;
    const [h, m] = r.time_local.split(":").map(Number);
    const sched = h * 60 + m;
    const delta = nowMinutes - sched;
    return delta >= 0 && delta < windowMin;
  });
}

export async function markReminderSent(id: string, date: string) {
  await db().from("reminders").update({ last_sent_on: date }).eq("id", id);
}

/** Aggregate daily nutrition totals across a date range (for reports). */
export async function getDailyTotalsRange(userId: string, sinceDate: string) {
  const { startUtc } = bkkDayRange(sinceDate);
  const { data } = await db()
    .from("meals")
    .select("eaten_at,kcal,protein_g,carb_g,fat_g,sodium_mg,sugar_g")
    .eq("user_id", userId)
    .gte("eaten_at", startUtc)
    .order("eaten_at", { ascending: true });
  return (data ?? []) as Partial<Meal>[];
}
