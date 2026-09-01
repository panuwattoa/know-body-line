/** Hand-written row types for the KnowBody schema (see supabase/migrations). */

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type Sex = "male" | "female";
export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";
export type Goal = "lose" | "maintain" | "gain" | "recomp";

export interface AppUser {
  id: string;
  line_user_id: string;
  display_name: string | null;
  picture_url: string | null;
  status: string;
  onboarding_state: "new" | "in_progress" | "done";
  created_at: string;
  updated_at: string;
}

export interface Profile {
  user_id: string;
  sex: Sex | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  target_weight_kg: number | null;
  activity_level: ActivityLevel | null;
  goal: Goal | null;
  rate_kg_per_week: number | null;
  tdee: number | null;
  target_kcal: number | null;
  target_protein_g: number | null;
  target_carb_g: number | null;
  target_fat_g: number | null;
  target_sodium_mg: number | null;
  target_sugar_g: number | null;
  updated_at: string;
}

export interface MealItem {
  id: string;
  meal_id: string;
  name: string;
  amount_g: number | null;
  kcal: number | null;
  protein_g: number | null;
  carb_g: number | null;
  fat_g: number | null;
  sodium_mg: number | null;
  sugar_g: number | null;
  sort_order: number;
}

export interface Meal {
  id: string;
  user_id: string;
  name: string;
  meal_type: MealType | null;
  eaten_at: string;
  portion_g: number | null;
  kcal: number | null;
  protein_g: number | null;
  carb_g: number | null;
  fat_g: number | null;
  sodium_mg: number | null;
  sugar_g: number | null;
  image_url: string | null;
  source: "photo" | "text" | "label" | null;
  note: string | null;
  edited: boolean;
  created_at: string;
}

export interface WeightLog {
  id: string;
  user_id: string;
  weight_kg: number;
  logged_on: string;
  created_at: string;
}

export interface Reminder {
  id: string;
  user_id: string;
  kind: "meal_log" | "workout" | "weigh_in";
  time_local: string;
  days: number[];
  enabled: boolean;
  last_sent_on: string | null;
  created_at: string;
}

export interface ChatState {
  user_id: string;
  state: string | null;
  context: Record<string, unknown> | null;
  updated_at: string;
}
