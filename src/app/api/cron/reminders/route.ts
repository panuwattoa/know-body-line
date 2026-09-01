import { NextResponse } from "next/server";
import { getDueReminders, markReminderSent } from "@/lib/domain/repo";
import { push } from "@/lib/line/client";
import { mainQuickReply } from "@/lib/line/flex";
import { bkkParts } from "@/lib/domain/time";
import { COACH_NAME } from "@/lib/config";

export const runtime = "nodejs";

const MESSAGES: Record<string, string> = {
  meal_log: `หิวยัง? 🍽️ อย่าลืมถ่ายรูปมื้อนี้ให้${COACH_NAME}จดแคลให้นะครับ`,
  workout: `ได้เวลาขยับแล้ว! 🏋️ วันนี้ ${COACH_NAME} จัดโปรแกรมให้ พิมพ์ "ออกกำลังกายอะไรดี" ได้เลย`,
  weigh_in: `อรุณสวัสดิ์ครับ ☀️ ชั่งน้ำหนักตอนเช้าแล้วพิมพ์บอก${COACH_NAME}ได้เลย เช่น "น้ำหนัก 74"`,
};

/**
 * Vercel Cron target. Runs every 15 min; fires reminders whose local time matches.
 * Secured with CRON_SECRET (Vercel sends it as `Authorization: Bearer`).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const { hour, minute, weekday, date } = bkkParts();
  const due = await getDueReminders(hour * 60 + minute, weekday, date);

  let sent = 0;
  for (const r of due) {
    const lineUserId = r.app_users?.line_user_id;
    if (!lineUserId) continue;
    await push(lineUserId, [
      { type: "text", text: MESSAGES[r.kind] ?? "อย่าลืมดูแลตัวเองนะครับ 💪", quickReply: mainQuickReply() },
    ]);
    await markReminderSent(r.id, date);
    sent++;
  }

  return NextResponse.json({ ok: true, time: `${hour}:${minute}`, weekday, checked: due.length, sent });
}
