"use client";

import { useState } from "react";
import { useLiff, apiFetch, closeLiff } from "@/lib/liff/useLiff";

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID_ONBOARDING || "";

const ACTIVITY = [
  { v: "sedentary", t: "นั่งทำงานเป็นหลัก" },
  { v: "light", t: "ออกเบาๆ 1-3 วัน/สัปดาห์" },
  { v: "moderate", t: "ปานกลาง 3-5 วัน/สัปดาห์" },
  { v: "active", t: "หนัก 6-7 วัน/สัปดาห์" },
  { v: "very_active", t: "หนักมาก / ใช้แรงงาน" },
] as const;

const GOALS = [
  { v: "lose", t: "🔥 ลดน้ำหนัก" },
  { v: "maintain", t: "❤️ รักษาหุ่น" },
  { v: "gain", t: "💪 สร้างกล้าม" },
  { v: "recomp", t: "🥗 กินคลีน" },
] as const;

interface Targets {
  target_kcal: number;
  target_protein_g: number;
  target_carb_g: number;
  target_fat_g: number;
  weeks_to_target: number;
}

export default function Onboarding() {
  const liff = useLiff(LIFF_ID);
  const [sex, setSex] = useState<"male" | "female">("male");
  const [age, setAge] = useState("28");
  const [height, setHeight] = useState("170");
  const [weight, setWeight] = useState("70");
  const [target, setTarget] = useState("65");
  const [activity, setActivity] = useState<(typeof ACTIVITY)[number]["v"]>("light");
  const [goal, setGoal] = useState<(typeof GOALS)[number]["v"]>("lose");
  const [rate, setRate] = useState("0.5");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<Targets | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!liff.idToken) return;
    setSaving(true);
    setErr(null);
    try {
      const { targets } = await apiFetch<{ targets: Targets }>("/api/liff/profile", liff.idToken, {
        method: "POST",
        body: JSON.stringify({
          sex,
          age: Number(age),
          height_cm: Number(height),
          weight_kg: Number(weight),
          target_weight_kg: Number(target),
          activity_level: activity,
          goal,
          rate_kg_per_week: Number(rate),
        }),
      });
      setResult(targets);
    } catch {
      setErr("บันทึกไม่สำเร็จ ลองอีกครั้งนะครับ");
    } finally {
      setSaving(false);
    }
  }

  if (!liff.ready) return <Center>กำลังเชื่อมต่อ LINE…</Center>;
  if (liff.error) return <Center>⚠️ {liff.error}</Center>;

  if (result) {
    return (
      <Shell title="🎯 ตั้งเป้าหมายสำเร็จ!">
        <div className="rounded-2xl bg-[#eaf6df] p-5 text-center">
          <p className="text-sm text-brand-dark">แคลอรีต่อวัน</p>
          <p className="text-4xl font-extrabold">{result.target_kcal.toLocaleString()}</p>
          <p className="text-xs text-gray-500">kcal / วัน</p>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <Macro label="โปรตีน" v={`${result.target_protein_g} g`} />
          <Macro label="คาร์บ" v={`${result.target_carb_g} g`} />
          <Macro label="ไขมัน" v={`${result.target_fat_g} g`} />
        </div>
        <p className="mt-4 text-center text-sm text-gray-600">
          คาดถึงเป้าใน ~{result.weeks_to_target} สัปดาห์ · เริ่มมื้อแรกได้เลย! 💪
        </p>
        <button onClick={closeLiff} className="mt-6 w-full rounded-full bg-brand py-3 font-bold text-white">
          กลับไปแชทกับโค้ช
        </button>
      </Shell>
    );
  }

  return (
    <Shell title="🎯 ตั้งเป้าหมายกับโค้ช" sub="ใช้เวลาแค่ 2 นาที">
      <Field label="เพศ">
        <div className="grid grid-cols-2 gap-3">
          <Choice active={sex === "male"} onClick={() => setSex("male")}>👨 ชาย</Choice>
          <Choice active={sex === "female"} onClick={() => setSex("female")}>👩 หญิง</Choice>
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="อายุ (ปี)"><NumInput value={age} onChange={setAge} /></Field>
        <Field label="ส่วนสูง (ซม.)"><NumInput value={height} onChange={setHeight} /></Field>
        <Field label="น้ำหนักตอนนี้ (กก.)"><NumInput value={weight} onChange={setWeight} /></Field>
        <Field label="น้ำหนักเป้าหมาย (กก.)"><NumInput value={target} onChange={setTarget} /></Field>
      </div>

      <Field label="ระดับกิจกรรม">
        <div className="space-y-2">
          {ACTIVITY.map((a) => (
            <Choice key={a.v} active={activity === a.v} onClick={() => setActivity(a.v)} block>
              {a.t}
            </Choice>
          ))}
        </div>
      </Field>

      <Field label="เป้าหมาย">
        <div className="grid grid-cols-2 gap-3">
          {GOALS.map((g) => (
            <Choice key={g.v} active={goal === g.v} onClick={() => setGoal(g.v)}>{g.t}</Choice>
          ))}
        </div>
      </Field>

      {(goal === "lose" || goal === "gain") && (
        <Field label={`อัตราต่อสัปดาห์: ${rate} กก./สัปดาห์`}>
          <input type="range" min="0.25" max="1" step="0.25" value={rate} onChange={(e) => setRate(e.target.value)} className="w-full accent-[#7bc043]" />
        </Field>
      )}

      {err && <p className="text-center text-sm text-red-500">{err}</p>}

      <button onClick={submit} disabled={saving} className="mt-2 w-full rounded-full bg-brand py-3.5 font-bold text-white disabled:opacity-50">
        {saving ? "กำลังคำนวณ…" : "คำนวณเป้าหมายให้ฉัน"}
      </button>
    </Shell>
  );
}

function Shell({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-md px-5 py-8">
      <h1 className="text-2xl font-bold">{title}</h1>
      {sub && <p className="mt-1 text-sm text-gray-500">{sub}</p>}
      <div className="mt-6 space-y-5">{children}</div>
    </main>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-gray-700">{label}</label>
      {children}
    </div>
  );
}
function NumInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-lg font-semibold focus:border-brand focus:outline-none"
    />
  );
}
function Choice({ active, onClick, children, block }: { active: boolean; onClick: () => void; children: React.ReactNode; block?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${block ? "w-full text-left" : "text-center"} ${
        active ? "border-brand bg-[#eaf6df] text-brand-dark" : "border-gray-200 bg-white text-gray-600"
      }`}
    >
      {children}
    </button>
  );
}
function Macro({ label, v }: { label: string; v: string }) {
  return (
    <div className="rounded-xl bg-gray-50 py-3">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="font-bold">{v}</p>
    </div>
  );
}
function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-[60vh] items-center justify-center px-6 text-center text-gray-500">{children}</div>;
}
