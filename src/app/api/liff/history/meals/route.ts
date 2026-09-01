import { NextResponse } from "next/server";
import { authLiff } from "@/lib/line/liff-auth";
import { getMealsForDate } from "@/lib/domain/repo";
import { bkkToday } from "@/lib/domain/time";

export const runtime = "nodejs";

/** Meal list for a date (loaded lazily after the summary rings render). */
export async function GET(req: Request) {
  const user = await authLiff(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const date = new URL(req.url).searchParams.get("date") || bkkToday();
  const meals = await getMealsForDate(user.id, date);
  return NextResponse.json({ date, meals });
}
