"use client";

import { useCallback, useEffect, useState } from "react";
import { useLiff, apiFetch } from "@/lib/liff/useLiff";
import { Ring } from "@/components/charts";

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID_HISTORY || "";

interface Item { id: string; name: string; amount_g: number | null }
interface Meal {
  id: string; name: string; meal_type: string | null; eaten_at: string; portion_g: number | null;
  kcal: number | null; protein_g: number | null; carb_g: number | null; fat_g: number | null;
  sodium_mg: number | null; sugar_g: number | null; image_url: string | null; edited: boolean; items?: Item[];
}
interface Totals { kcal: number; protein: number; carb: number; fat: number; sodium: number; sugar: number }
interface Targets { kcal: number; protein: number; carb: number; fat: number; sodium: number; sugar: number }
interface Summary { date: string; totals: Totals; targets: Targets }

const MEAL_TH: Record<string, string> = { breakfast: "มื้อเช้า", lunch: "มื้อกลางวัน", dinner: "มื้อเย็น", snack: "มื้อว่าง" };

function shiftDate(d: string, days: number) {
  const dt = new Date(d + "T00:00:00");
  dt.setDate(dt.getDate() + days);
  return dt.toISOString().slice(0, 10);
}

export default function History() {
  const liff = useLiff(LIFF_ID);
  const [date, setDate] = useState<string>(() => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10));
  const [summary, setSummary] = useState<Summary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [meals, setMeals] = useState<Meal[] | null>(null);
  const [mealsLoading, setMealsLoading] = useState(true);

  const load = useCallback(async (d: string) => {
    if (!liff.idToken) return;
    // Summary (rings) loads first and fast.
    setSummaryLoading(true);
    setMeals(null);
    setMealsLoading(true);
    try {
      setSummary(await apiFetch<Summary>(`/api/liff/history?date=${d}`, liff.idToken));
    } finally {
      setSummaryLoading(false);
    }
    // Meal list streams in separately.
    apiFetch<{ meals: Meal[] }>(`/api/liff/history/meals?date=${d}`, liff.idToken)
      .then((r) => setMeals(r.meals))
      .catch(() => setMeals([]))
      .finally(() => setMealsLoading(false));
  }, [liff.idToken]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- data-fetch effect syncs with LINE/LIFF
  useEffect(() => { if (liff.idToken) load(date); }, [liff.idToken, date, load]);

  if (!liff.ready) return <Center>กำลังเชื่อมต่อ LINE…</Center>;
  if (liff.error) return <Center>⚠️ {liff.error}</Center>;

  const t = summary?.totals ?? { kcal: 0, protein: 0, carb: 0, fat: 0, sodium: 0, sugar: 0 };
  const g = summary?.targets ?? { kcal: 2000, protein: 120, carb: 220, fat: 60, sodium: 2000, sugar: 50 };
  const pct = (a: number, b: number) => (b > 0 ? (a / b) * 100 : 0);

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1 className="text-xl font-bold">📋 ประวัติอาหาร</h1>

      {/* Date nav */}
      <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#eaf6df] px-3 py-2">
        <button onClick={() => setDate((d) => shiftDate(d, -1))} className="rounded-full bg-brand px-3 py-1 font-bold text-white">‹</button>
        <span className="font-semibold">{formatThai(date)}</span>
        <button onClick={() => setDate((d) => shiftDate(d, 1))} className="rounded-full bg-brand px-3 py-1 font-bold text-white">›</button>
      </div>

      {/* Overview */}
      <section className="mt-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-gray-700">ภาพรวมวันนี้</span>
          <span className="text-xs text-gray-400">{meals ? `${meals.length} รายการ` : ""}</span>
        </div>
        {summaryLoading ? (
          <div className="flex flex-col items-center py-6">
            <div className="h-28 w-28 animate-pulse rounded-full bg-gray-100" />
          </div>
        ) : (
          <>
            <div className="mt-4 flex justify-center">
              <Ring pct={pct(t.kcal, g.kcal)} label={`${Math.round(t.kcal).toLocaleString()} / ${g.kcal.toLocaleString()} kcal`} size={120} stroke={12} />
            </div>
            <div className="mt-4 grid grid-cols-5 gap-1">
              <Ring pct={pct(t.protein, g.protein)} label="โปรตีน" sub={`${Math.round(t.protein)}g`} size={56} stroke={6} />
              <Ring pct={pct(t.carb, g.carb)} label="คาร์บ" sub={`${Math.round(t.carb)}g`} size={56} stroke={6} />
              <Ring pct={pct(t.fat, g.fat)} label="ไขมัน" sub={`${Math.round(t.fat)}g`} size={56} stroke={6} />
              <Ring pct={pct(t.sodium, g.sodium)} label="โซเดียม" sub={`${Math.round(t.sodium)}mg`} size={56} stroke={6} />
              <Ring pct={pct(t.sugar, g.sugar)} label="น้ำตาล" sub={`${Math.round(t.sugar)}g`} size={56} stroke={6} />
            </div>
          </>
        )}
      </section>

      {/* Meals */}
      <section className="mt-4 space-y-3">
        {mealsLoading && (
          <>
            <MealSkeleton />
            <MealSkeleton />
          </>
        )}
        {!mealsLoading && (meals?.length ?? 0) === 0 && (
          <p className="rounded-2xl bg-gray-50 py-10 text-center text-gray-400">ยังไม่มีมื้ออาหารในวันนี้</p>
        )}
        {meals?.map((m) => (
          <article key={m.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <div className="flex gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-bold">{m.name}</h3>
                  {m.edited && <span className="rounded bg-amber-100 px-1.5 text-[10px] text-amber-700">แก้ไขแล้ว</span>}
                </div>
                <p className="text-xs text-gray-400">
                  {m.meal_type ? MEAL_TH[m.meal_type] : ""} • {new Date(m.eaten_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                  {m.portion_g ? ` • ${Math.round(m.portion_g)} g` : ""}
                </p>
                <p className="mt-1 text-2xl font-extrabold">{Math.round(m.kcal ?? 0)} <span className="text-sm font-normal text-gray-400">kcal</span></p>
                <p className="text-xs text-gray-500">P {Math.round(m.protein_g ?? 0)} · C {Math.round(m.carb_g ?? 0)} · F {Math.round(m.fat_g ?? 0)} g</p>
              </div>
              {m.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.image_url} alt={m.name} loading="lazy" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
              )}
            </div>
            <a href={`/liff/edit?id=${m.id}`} className="mt-3 inline-block text-sm font-semibold text-brand-dark">✏️ แก้ไขรายการ</a>
          </article>
        ))}
      </section>
    </main>
  );
}

function MealSkeleton() {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
      <div className="flex gap-3">
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/2 animate-pulse rounded bg-gray-100" />
          <div className="h-3 w-1/3 animate-pulse rounded bg-gray-100" />
          <div className="h-6 w-24 animate-pulse rounded bg-gray-100" />
        </div>
        <div className="h-20 w-20 shrink-0 animate-pulse rounded-xl bg-gray-100" />
      </div>
    </div>
  );
}
function formatThai(d: string) {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", weekday: "long" });
}
function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-[60vh] items-center justify-center px-6 text-center text-gray-500">{children}</div>;
}
