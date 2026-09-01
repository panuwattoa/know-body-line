import { NextResponse } from "next/server";
import { z } from "zod";
import { authLiff } from "@/lib/line/liff-auth";
import { getWeightSeries, logWeight } from "@/lib/domain/repo";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await authLiff(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const since = new Date(Date.now() - 89 * 86_400_000).toISOString().slice(0, 10);
  return NextResponse.json({ weights: await getWeightSeries(user.id, since) });
}

const schema = z.object({ weight_kg: z.number().min(30).max(300), date: z.string().optional() });

export async function POST(req: Request) {
  const user = await authLiff(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  await logWeight(user.id, parsed.data.weight_kg, parsed.data.date);
  return NextResponse.json({ ok: true });
}
