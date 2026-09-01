import { NextResponse } from "next/server";
import { authLiff } from "@/lib/line/liff-auth";
import { getDailyTotalsRange, getProfile, getTargets, getWeightSeries } from "@/lib/domain/repo";
import { bkkToday } from "@/lib/domain/time";
import { coachReply } from "@/lib/ai/gemini";
import { GOAL_LABELS_TH } from "@/lib/domain/nutrition";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await authLiff(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const range = url.searchParams.get("range") === "30" ? 30 : 7;

  const since = new Date(Date.now() - (range - 1) * 86_400_000).toISOString().slice(0, 10);

  const [meals, weights, targets, profile] = await Promise.all([
    getDailyTotalsRange(user.id, since),
    getWeightSeries(user.id, since),
    getTargets(user.id),
    getProfile(user.id),
  ]);

  // Group nutrition by Bangkok local date.
  const byDate = new Map<string, { kcal: number; protein: number; carb: number; fat: number; sodium: number; sugar: number }>();
  for (const m of meals) {
    const d = bkkToday(new Date(m.eaten_at as string));
    const cur = byDate.get(d) ?? { kcal: 0, protein: 0, carb: 0, fat: 0, sodium: 0, sugar: 0 };
    cur.kcal += m.kcal ?? 0;
    cur.protein += m.protein_g ?? 0;
    cur.carb += m.carb_g ?? 0;
    cur.fat += m.fat_g ?? 0;
    cur.sodium += m.sodium_mg ?? 0;
    cur.sugar += m.sugar_g ?? 0;
    byDate.set(d, cur);
  }

  const days: { date: string; kcal: number; protein: number; carb: number; fat: number; sodium: number; sugar: number }[] = [];
  for (let i = range - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    const v = byDate.get(date) ?? { kcal: 0, protein: 0, carb: 0, fat: 0, sodium: 0, sugar: 0 };
    days.push({ date, ...v });
  }

  const logged = days.filter((d) => d.kcal > 0);
  const avgKcal = logged.length ? Math.round(logged.reduce((a, d) => a + d.kcal, 0) / logged.length) : 0;
  const bestDay = logged.slice().sort((a, b) => Math.abs(a.kcal - targets.kcal) - Math.abs(b.kcal - targets.kcal))[0] ?? null;
  const watchDay = logged.slice().sort((a, b) => b.sodium - a.sodium)[0] ?? null;

  // Coach's written analysis over the period.
  let analysis = "";
  if (logged.length) {
    const summary = logged
      .map((d) => `${d.date}: ${Math.round(d.kcal)} kcal, โปรตีน ${Math.round(d.protein)}g, โซเดียม ${Math.round(d.sodium)}mg, น้ำตาล ${Math.round(d.sugar)}g`)
      .join("\n");
    analysis = await coachReply({
      message: `สรุปวิเคราะห์การกิน ${logged.length} วันที่ผ่านมาให้หน่อย ชี้จุดเด่น จุดที่ควรระวัง และคำแนะนำ 3 หัวข้อสั้นๆ`,
      context: `เป้าหมาย: ${profile?.goal ? GOAL_LABELS_TH[profile.goal] : "-"}\nเป้าแคล/วัน: ${targets.kcal} kcal, โปรตีน ${targets.protein}g\nข้อมูลรายวัน:\n${summary}`,
      task: "general",
    });
  }

  return NextResponse.json({
    range,
    today: bkkToday(),
    targets,
    days,
    weights,
    avgKcal,
    bestDay,
    watchDay,
    analysis,
    goalWeight: profile?.target_weight_kg ?? null,
  });
}
