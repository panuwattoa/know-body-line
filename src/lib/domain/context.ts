import { getDailyTotals, getProfile, getTargets } from "@/lib/domain/repo";
import { userContextBlock } from "@/lib/ai/prompts";
import { GOAL_LABELS_TH } from "@/lib/domain/nutrition";
import type { AppUser } from "@/lib/supabase/types";

/** Build the personalized context string + targets used across AI calls. */
export async function buildUserContext(user: AppUser) {
  const [profile, targets, consumed] = await Promise.all([
    getProfile(user.id),
    getTargets(user.id),
    getDailyTotals(user.id),
  ]);

  const context = userContextBlock({
    displayName: user.display_name,
    goalLabel: profile?.goal ? GOAL_LABELS_TH[profile.goal] : undefined,
    targets: { kcal: targets.kcal, protein: targets.protein, carb: targets.carb, fat: targets.fat },
    consumedToday: consumed,
    weightKg: profile?.weight_kg,
    targetWeightKg: profile?.target_weight_kg,
  });

  return { profile, targets, consumed, context };
}
