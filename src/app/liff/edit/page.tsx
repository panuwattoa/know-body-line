"use client";

import { useEffect, useState } from "react";
import { useLiff, apiFetch, closeLiff } from "@/lib/liff/useLiff";

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID_PROFILE || "";

interface EditItem {
  name: string;
  amount_g: number;
  kcal: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  sodium_mg: number;
  sugar_g: number;
}

const EMPTY: EditItem = { name: "", amount_g: 0, kcal: 0, protein_g: 0, carb_g: 0, fat_g: 0, sodium_mg: 0, sugar_g: 0 };

export default function EditMeal() {
  const liff = useLiff(LIFF_ID);
  const [mealId, setMealId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [items, setItems] = useState<EditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads URL once on mount
    setMealId(id);
  }, []);

  useEffect(() => {
    if (!liff.idToken) return;
    (async () => {
      setLoading(true);
      try {
        if (mealId) {
          const { meal } = await apiFetch<{ meal: { name: string; meal_items?: unknown; items?: EditItem[] } }>(`/api/liff/meal?id=${mealId}`, liff.idToken!);
          const m = meal as unknown as { name: string; items: EditItem[] };
          setName(m.name);
          setItems((m.items ?? []).map((it) => ({ ...EMPTY, ...it })));
        } else {
          const { pending } = await apiFetch<{ pending: { analysis: { name: string; items: EditItem[] } } | null }>(`/api/liff/meal?pending=1`, liff.idToken!);
          if (pending) {
            setName(pending.analysis.name);
            setItems(pending.analysis.items.map((it) => ({ ...EMPTY, ...it })));
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [liff.idToken, mealId]);

  function patch(i: number, key: keyof EditItem, value: string) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [key]: key === "name" ? value : Number(value) || 0 } : it)));
  }
  const total = items.reduce((a, it) => ({ kcal: a.kcal + it.kcal, p: a.p + it.protein_g, c: a.c + it.carb_g, f: a.f + it.fat_g }), { kcal: 0, p: 0, c: 0, f: 0 });

  async function save() {
    if (!liff.idToken) return;
    setSaving(true);
    try {
      if (mealId) {
        await apiFetch(`/api/liff/meal`, liff.idToken, { method: "PUT", body: JSON.stringify({ id: mealId, items }) });
      } else {
        await apiFetch(`/api/liff/meal`, liff.idToken, { method: "POST", body: JSON.stringify({ name, items }) });
      }
      setDone(true);
    } finally {
      setSaving(false);
    }
  }

  if (!liff.ready) return <Center>กำลังเชื่อมต่อ LINE…</Center>;
  if (liff.error) return <Center>⚠️ {liff.error}</Center>;
  if (loading) return <Center>กำลังโหลด…</Center>;
  if (done)
    return (
      <Center>
        <div>
          <p className="text-4xl">✅</p>
          <p className="mt-2 font-bold">บันทึกเรียบร้อย!</p>
          <button onClick={closeLiff} className="mt-4 rounded-full bg-brand px-6 py-2 font-bold text-white">กลับไปแชท</button>
        </div>
      </Center>
    );

  return (
    <main className="mx-auto max-w-md px-4 py-6 pb-28">
      <h1 className="text-xl font-bold">✏️ แก้ไขมื้ออาหาร</h1>

      <label className="mt-4 block text-sm font-semibold text-gray-700">ชื่อเมนู</label>
      <input value={name} onChange={(e) => setName(e.target.value)} disabled={!!mealId} className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 font-semibold disabled:bg-gray-50" />

      <div className="mt-4 space-y-3">
        {items.map((it, i) => (
          <div key={i} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center gap-2">
              <input value={it.name} onChange={(e) => patch(i, "name", e.target.value)} placeholder="ส่วนประกอบ" className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium" />
              <button onClick={() => setItems((p) => p.filter((_, idx) => idx !== i))} className="shrink-0 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500">ลบ</button>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <Num label="กรัม" v={it.amount_g} onChange={(v) => patch(i, "amount_g", v)} />
              <Num label="kcal" v={it.kcal} onChange={(v) => patch(i, "kcal", v)} />
              <Num label="โปรตีน" v={it.protein_g} onChange={(v) => patch(i, "protein_g", v)} />
              <Num label="คาร์บ" v={it.carb_g} onChange={(v) => patch(i, "carb_g", v)} />
              <Num label="ไขมัน" v={it.fat_g} onChange={(v) => patch(i, "fat_g", v)} />
              <Num label="น้ำตาล" v={it.sugar_g} onChange={(v) => patch(i, "sugar_g", v)} />
            </div>
          </div>
        ))}
      </div>

      <button onClick={() => setItems((p) => [...p, { ...EMPTY }])} className="mt-3 w-full rounded-xl border-2 border-dashed border-gray-300 py-3 text-sm font-semibold text-gray-500">
        ＋ เพิ่มส่วนประกอบ
      </button>

      <div className="fixed inset-x-0 bottom-0 border-t bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <div className="text-sm">
            <p className="font-bold">{Math.round(total.kcal)} kcal</p>
            <p className="text-xs text-gray-500">P {Math.round(total.p)} · C {Math.round(total.c)} · F {Math.round(total.f)}</p>
          </div>
          <button onClick={save} disabled={saving} className="ml-auto rounded-full bg-brand px-8 py-3 font-bold text-white disabled:opacity-50">
            {saving ? "กำลังบันทึก…" : mealId ? "บันทึกการแก้ไข" : "จดมื้อนี้"}
          </button>
        </div>
      </div>
    </main>
  );
}

function Num({ label, v, onChange }: { label: string; v: number; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[11px] text-gray-400">{label}</span>
      <input inputMode="decimal" value={v} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm" />
    </label>
  );
}
function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-[60vh] items-center justify-center px-6 text-center text-gray-500">{children}</div>;
}
