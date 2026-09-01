import { NextResponse } from "next/server";
import { authLiff } from "@/lib/line/liff-auth";
import { getDailyTotals, getMealsForDate, getTargets } from "@/lib/domain/repo";
import { bkkToday } from "@/lib/domain/time";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await authLiff(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const date = url.searchParams.get("date") || bkkToday();

  const [meals, totals, targets] = await Promise.all([
    getMealsForDate(user.id, date),
    getDailyTotals(user.id, date),
    getTargets(user.id),
  ]);

  return NextResponse.json({
    date,
    displayName: user.display_name,
    meals,
    totals,
    targets,
  });
}
