import { NextResponse } from "next/server";
import { z } from "zod";
import { authLiff } from "@/lib/line/liff-auth";
import { createReminder, deleteReminder, listReminders, updateReminder } from "@/lib/domain/repo";

export const runtime = "nodejs";

const kind = z.enum(["meal_log", "workout", "weigh_in"]);
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "HH:MM");
const days = z.array(z.number().int().min(0).max(6)).min(1).max(7);

export async function GET(req: Request) {
  const user = await authLiff(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ reminders: await listReminders(user.id) });
}

export async function POST(req: Request) {
  const user = await authLiff(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = z
    .object({ kind, time_local: time, days, enabled: z.boolean().optional() })
    .safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const reminder = await createReminder(user.id, parsed.data);
  return NextResponse.json({ reminder });
}

export async function PUT(req: Request) {
  const user = await authLiff(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = z
    .object({
      id: z.string(),
      kind: kind.optional(),
      time_local: time.optional(),
      days: days.optional(),
      enabled: z.boolean().optional(),
    })
    .safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const { id, ...patch } = parsed.data;
  const reminder = await updateReminder(user.id, id, patch);
  if (!reminder) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ reminder });
}

export async function DELETE(req: Request) {
  const user = await authLiff(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  await deleteReminder(user.id, id);
  return NextResponse.json({ ok: true });
}
