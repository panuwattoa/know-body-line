import { NextResponse } from "next/server";
import { authLiff } from "@/lib/line/liff-auth";
import { buildReport } from "@/lib/domain/report";
import { coachReply } from "@/lib/ai/gemini";
import { GOAL_LABELS_TH } from "@/lib/domain/nutrition";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Slow part: the coach's written analysis. Fetched lazily by the report page. */
export async function GET(req: Request) {
  const user = await authLiff(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const range = new URL(req.url).searchParams.get("range") === "30" ? 30 : 7;
  const r = await buildReport(user.id, range);

  if (!r.logged.length) {
    return NextResponse.json({ analysis: "" });
  }

  const summary = r.logged
    .map(
      (d) =>
        `${d.date}: ${Math.round(d.kcal)} kcal, โปรตีน ${Math.round(d.protein)}g, โซเดียม ${Math.round(d.sodium)}mg, น้ำตาล ${Math.round(d.sugar)}g`,
    )
    .join("\n");

  const analysis = await coachReply({
    message: `สรุปวิเคราะห์การกิน ${r.logged.length} วันที่ผ่านมาให้หน่อย ชี้จุดเด่น จุดที่ควรระวัง และคำแนะนำ 3 หัวข้อสั้นๆ`,
    context: `เป้าหมาย: ${r.profile?.goal ? GOAL_LABELS_TH[r.profile.goal] : "-"}\nเป้าแคล/วัน: ${r.targets.kcal} kcal, โปรตีน ${r.targets.protein}g\nข้อมูลรายวัน:\n${summary}`,
    task: "general",
  });

  return NextResponse.json({ analysis });
}
