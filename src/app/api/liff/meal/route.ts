import { NextResponse } from "next/server";
import { z } from "zod";
import { authLiff } from "@/lib/line/liff-auth";
import {
  deleteMeal,
  getMealById,
  getPendingMeal,
  saveMeal,
  setChatState,
  updateMealItems,
} from "@/lib/domain/repo";

export const runtime = "nodejs";

const itemSchema = z.object({
  name: z.string().min(1),
  amount_g: z.number().min(0),
  kcal: z.number().min(0),
  protein_g: z.number().min(0),
  carb_g: z.number().min(0),
  fat_g: z.number().min(0),
  sodium_mg: z.number().min(0),
  sugar_g: z.number().min(0),
});

/** GET ?id=<mealId> (saved meal) or ?pending=1 (the un-logged draft). */
export async function GET(req: Request) {
  const user = await authLiff(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  if (url.searchParams.get("pending")) {
    const pending = await getPendingMeal(user.id);
    return NextResponse.json({ pending });
  }
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  const meal = await getMealById(user.id, id);
  if (!meal) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ meal });
}

/** Update the items of a saved meal (recomputes totals). */
export async function PUT(req: Request) {
  const user = await authLiff(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = z.object({ id: z.string(), items: z.array(itemSchema) }).safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const meal = await updateMealItems(user.id, parsed.data.id, parsed.data.items);
  if (!meal) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true, meal });
}

/** Save the pending draft as a meal (optionally with edited items). */
export async function POST(req: Request) {
  const user = await authLiff(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const pending = await getPendingMeal(user.id);
  if (!pending) return NextResponse.json({ error: "no pending" }, { status: 404 });

  const body = z
    .object({ name: z.string().optional(), items: z.array(itemSchema).optional() })
    .parse(await req.json().catch(() => ({})));

  const analysis = { ...pending.analysis };
  if (body.name) analysis.name = body.name;
  if (body.items) {
    analysis.items = body.items;
    analysis.total = body.items.reduce(
      (a, it) => ({
        kcal: a.kcal + it.kcal,
        protein_g: a.protein_g + it.protein_g,
        carb_g: a.carb_g + it.carb_g,
        fat_g: a.fat_g + it.fat_g,
        sodium_mg: a.sodium_mg + it.sodium_mg,
        sugar_g: a.sugar_g + it.sugar_g,
      }),
      { kcal: 0, protein_g: 0, carb_g: 0, fat_g: 0, sodium_mg: 0, sugar_g: 0 },
    );
    analysis.portion_g = body.items.reduce((a, it) => a + it.amount_g, 0);
  }

  const meal = await saveMeal(user.id, {
    analysis,
    imageUrl: pending.imageUrl,
    source: pending.imageUrl ? "photo" : "text",
  });
  await setChatState(user.id, null, null);
  return NextResponse.json({ ok: true, meal });
}

export async function DELETE(req: Request) {
  const user = await authLiff(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  await deleteMeal(user.id, id);
  return NextResponse.json({ ok: true });
}
