import { NextResponse } from "next/server";
import { z } from "zod";
import { authLiff } from "@/lib/line/liff-auth";
import { getProfile, seedDefaultReminders, setOnboardingState, upsertProfile } from "@/lib/domain/repo";
import { computeTargets } from "@/lib/domain/nutrition";
import { push } from "@/lib/line/client";
import { onboardingCompleteMessages } from "@/lib/line/flex";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await authLiff(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const profile = await getProfile(user.id);
  return NextResponse.json({ profile, onboardingState: user.onboarding_state, displayName: user.display_name });
}

const onboardingSchema = z.object({
  sex: z.enum(["male", "female"]),
  age: z.number().int().min(10).max(100),
  height_cm: z.number().min(120).max(230),
  weight_kg: z.number().min(30).max(300),
  target_weight_kg: z.number().min(30).max(300),
  activity_level: z.enum(["sedentary", "light", "moderate", "active", "very_active"]),
  goal: z.enum(["lose", "maintain", "gain", "recomp"]),
  rate_kg_per_week: z.number().min(0).max(1).optional(),
});

export async function POST(req: Request) {
  const user = await authLiff(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = onboardingSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", details: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;
  const targets = computeTargets(input);

  await upsertProfile(user.id, {
    sex: input.sex,
    age: input.age,
    height_cm: input.height_cm,
    weight_kg: input.weight_kg,
    target_weight_kg: input.target_weight_kg,
    activity_level: input.activity_level,
    goal: input.goal,
    rate_kg_per_week: input.rate_kg_per_week ?? 0.5,
    tdee: targets.tdee,
    target_kcal: targets.target_kcal,
    target_protein_g: targets.target_protein_g,
    target_carb_g: targets.target_carb_g,
    target_fat_g: targets.target_fat_g,
    target_sodium_mg: targets.target_sodium_mg,
    target_sugar_g: targets.target_sugar_g,
  });
  await setOnboardingState(user.id, "done");
  await seedDefaultReminders(user.id).catch(() => {});

  // Push the celebratory summary + "how to start" sequence into the chat (best-effort).
  push(
    user.line_user_id,
    onboardingCompleteMessages({
      name: user.display_name,
      targets,
      fromKg: input.weight_kg,
      toKg: input.target_weight_kg,
    }),
  ).catch(() => {});

  return NextResponse.json({ ok: true, targets });
}
