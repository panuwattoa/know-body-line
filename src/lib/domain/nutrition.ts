import type { ActivityLevel, Goal, Sex } from "@/lib/supabase/types";

/** Energy density of body mass, kcal per kg (used for goal timeline math). */
const KCAL_PER_KG = 7700;

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export interface OnboardingInput {
  sex: Sex;
  age: number;
  height_cm: number;
  weight_kg: number;
  target_weight_kg: number;
  activity_level: ActivityLevel;
  goal: Goal;
  /** kg/week toward target (magnitude). Defaults to 0.5. */
  rate_kg_per_week?: number;
}

export interface DailyTargets {
  tdee: number;
  target_kcal: number;
  target_protein_g: number;
  target_carb_g: number;
  target_fat_g: number;
  target_sodium_mg: number;
  target_sugar_g: number;
  /** Estimated weeks to reach target weight at the chosen rate. */
  weeks_to_target: number;
}

/** Mifflin–St Jeor basal metabolic rate. */
export function bmr(input: Pick<OnboardingInput, "sex" | "age" | "height_cm" | "weight_kg">): number {
  const base = 10 * input.weight_kg + 6.25 * input.height_cm - 5 * input.age;
  return input.sex === "male" ? base + 5 : base - 161;
}

/**
 * Compute daily calorie + macro targets from onboarding data.
 * Deficit/surplus derives directly from the chosen kg/week rate.
 */
export function computeTargets(input: OnboardingInput): DailyTargets {
  const rate = Math.min(Math.max(input.rate_kg_per_week ?? 0.5, 0), 1);
  const tdee = bmr(input) * ACTIVITY_FACTOR[input.activity_level];

  const dailyDelta = (rate * KCAL_PER_KG) / 7; // kcal/day
  let target_kcal = tdee;
  if (input.goal === "lose") target_kcal = tdee - dailyDelta;
  else if (input.goal === "gain") target_kcal = tdee + dailyDelta;
  // maintain / recomp -> maintenance calories

  // Never prescribe below a safe floor.
  const floor = input.sex === "male" ? 1500 : 1200;
  target_kcal = Math.max(target_kcal, floor);

  // Protein anchored to a reference weight (target weight for cut/bulk).
  const refWeight =
    input.goal === "lose" || input.goal === "gain"
      ? input.target_weight_kg
      : input.weight_kg;
  const proteinPerKg = input.goal === "maintain" ? 1.6 : 2.0;
  const target_protein_g = Math.round(refWeight * proteinPerKg);

  // Fat = 25% of calories.
  const target_fat_g = Math.round((target_kcal * 0.25) / 9);

  // Carbs = remaining calories.
  const remaining = target_kcal - target_protein_g * 4 - target_fat_g * 9;
  const target_carb_g = Math.max(Math.round(remaining / 4), 0);

  const kgToChange = Math.abs(input.weight_kg - input.target_weight_kg);
  const weeks_to_target = rate > 0 ? Math.ceil(kgToChange / rate) : 0;

  return {
    tdee: Math.round(tdee),
    target_kcal: Math.round(target_kcal),
    target_protein_g,
    target_carb_g,
    target_fat_g,
    target_sodium_mg: 2000,
    target_sugar_g: 50,
    weeks_to_target,
  };
}

export const ACTIVITY_LABELS_TH: Record<ActivityLevel, string> = {
  sedentary: "นั่งทำงานเป็นหลัก ไม่ค่อยขยับ",
  light: "ออกกำลังเบาๆ 1-3 วัน/สัปดาห์",
  moderate: "ออกกำลังปานกลาง 3-5 วัน/สัปดาห์",
  active: "ออกกำลังหนัก 6-7 วัน/สัปดาห์",
  very_active: "ออกหนักมาก / ใช้แรงงาน",
};

export const GOAL_LABELS_TH: Record<Goal, string> = {
  lose: "ลดน้ำหนัก / ลดไขมัน",
  maintain: "รักษาหุ่น สุขภาพดี",
  gain: "เพิ่มน้ำหนัก / สร้างกล้าม",
  recomp: "กินคลีน ปรับสัดส่วน",
};
