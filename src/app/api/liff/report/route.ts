import { NextResponse } from "next/server";
import { authLiff } from "@/lib/line/liff-auth";
import { buildReport } from "@/lib/domain/report";

export const runtime = "nodejs";

/** Fast report payload (charts + stats). AI analysis is fetched separately. */
export async function GET(req: Request) {
  const user = await authLiff(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const range = new URL(req.url).searchParams.get("range") === "30" ? 30 : 7;
  const r = await buildReport(user.id, range);

  return NextResponse.json({
    range: r.range,
    today: r.today,
    targets: r.targets,
    days: r.days,
    weights: r.weights,
    avgKcal: r.avgKcal,
    bestDay: r.bestDay,
    watchDay: r.watchDay,
    goalWeight: r.goalWeight,
    hasData: r.logged.length > 0,
  });
}
