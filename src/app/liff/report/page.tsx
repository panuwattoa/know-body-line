"use client";

import { useCallback, useEffect, useState } from "react";
import { useLiff, apiFetch } from "@/lib/liff/useLiff";
import { LineChart } from "@/components/charts";

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID_REPORT || "";

interface Day { date: string; kcal: number; protein: number; carb: number; fat: number; sodium: number; sugar: number }
interface Res {
  range: number;
  targets: { kcal: number; protein: number; carb: number; fat: number; sodium: number; sugar: number };
  days: Day[];
  weights: { weight_kg: number; logged_on: string }[];
  avgKcal: number;
  bestDay: Day | null;
  watchDay: Day | null;
  goalWeight: number | null;
  hasData: boolean;
}

const METRICS = [
  { k: "kcal", t: "🔥 พลังงาน", unit: "", color: "#7bc043" },
  { k: "protein", t: "💪 โปรตีน", unit: "g", color: "#3a6ea5" },
  { k: "carb", t: "🍚 คาร์บ", unit: "g", color: "#e59b1b" },
  { k: "fat", t: "🥑 ไขมัน", unit: "g", color: "#e74c3c" },
] as const;

export default function Report() {
  const liff = useLiff(LIFF_ID);
  const [range, setRange] = useState<7 | 30>(7);
  const [metric, setMetric] = useState<(typeof METRICS)[number]["k"]>("kcal");
  const [data, setData] = useState<Res | null>(null);
  const [loading, setLoading] = useState(true);
  // AI analysis loads lazily so charts appear instantly.
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const load = useCallback(async (r: number) => {
    if (!liff.idToken) return;
    setLoading(true);
    setAnalysis(null);
    try {
      const res = await apiFetch<Res>(`/api/liff/report?range=${r}`, liff.idToken);
      setData(res);
      // Kick off the slow AI analysis only after the fast payload is in.
      if (res.hasData) {
        setAnalysisLoading(true);
        apiFetch<{ analysis: string }>(`/api/liff/report/analysis?range=${r}`, liff.idToken)
          .then((a) => setAnalysis(a.analysis))
          .catch(() => setAnalysis(""))
          .finally(() => setAnalysisLoading(false));
      }
    } finally {
      setLoading(false);
    }
  }, [liff.idToken]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- data-fetch effect syncs with LINE/LIFF
  useEffect(() => { if (liff.idToken) load(range); }, [liff.idToken, range, load]);

  if (!liff.ready) return <Center>กำลังเชื่อมต่อ LINE…</Center>;
  if (liff.error) return <Center>⚠️ {liff.error}</Center>;

  const mDef = METRICS.find((m) => m.k === metric)!;
  const points = (data?.days ?? []).map((d) => ({ label: d.date.slice(5).replace("-", "/"), value: d[metric] }));
  const targetVal = data?.targets[metric];
  const weightPoints = (data?.weights ?? []).map((w) => ({ label: w.logged_on.slice(5).replace("-", "/"), value: w.weight_kg }));

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1 className="text-xl font-bold">📊 รายงานจากโค้ช</h1>
      <p className="text-sm text-gray-500">ภาพรวมการกินย้อนหลัง</p>

      <div className="mt-4 grid grid-cols-2 gap-2 rounded-full bg-gray-100 p-1">
        {[7, 30].map((r) => (
          <button key={r} onClick={() => setRange(r as 7 | 30)} className={`rounded-full py-2 text-sm font-semibold ${range === r ? "bg-black text-white" : "text-gray-500"}`}>
            {r} วัน
          </button>
        ))}
      </div>

      {loading && <p className="mt-6 text-center text-gray-400">กำลังโหลด…</p>}

      {data && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Card tone="ok" title="🏆 วันที่ดีที่สุด" main={data.bestDay ? `${Math.round(data.bestDay.kcal).toLocaleString()} kcal` : "-"} sub={data.bestDay ? formatThai(data.bestDay.date) : "ยังไม่มีข้อมูล"} />
            <Card tone="warn" title="👀 วันที่ต้องระวัง" main={data.watchDay ? `${Math.round(data.watchDay.sodium).toLocaleString()} mg` : "-"} sub={data.watchDay ? `โซเดียมสูงสุด · ${formatThai(data.watchDay.date)}` : "ยังไม่มีข้อมูล"} />
          </div>

          {/* Nutrition trend */}
          <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center justify-between">
              <span className="font-semibold">แนวโน้มรายวัน</span>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500">เฉลี่ย {data.avgKcal.toLocaleString()} kcal</span>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {METRICS.map((m) => (
                <button key={m.k} onClick={() => setMetric(m.k)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${metric === m.k ? "bg-black text-white" : "bg-gray-100 text-gray-500"}`}>
                  {m.t}
                </button>
              ))}
            </div>
            <div className="mt-2">
              <LineChart points={points} target={targetVal} color={mDef.color} unit={mDef.unit} />
            </div>
          </section>

          {/* Weight trend */}
          <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center justify-between">
              <span className="font-semibold">⚖️ น้ำหนักรายวัน</span>
              {data.goalWeight && <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500">เป้า {data.goalWeight} kg</span>}
            </div>
            {weightPoints.length ? (
              <LineChart points={weightPoints} target={data.goalWeight ?? undefined} color="#7bc043" unit="kg" />
            ) : (
              <p className="py-8 text-center text-sm text-gray-400">ยังไม่มีบันทึกน้ำหนัก — พิมพ์ &ldquo;น้ำหนัก 70&rdquo; ในแชทได้เลย</p>
            )}
          </section>

          {/* Coach analysis — lazy loaded */}
          {data.hasData && (
            <section className="mt-4 rounded-2xl bg-[#eaf6df] p-4">
              <p className="font-bold text-brand-dark">💬 คำวิเคราะห์จากโค้ช</p>
              {analysisLoading || analysis === null ? (
                <div className="mt-3 space-y-2" aria-label="กำลังวิเคราะห์">
                  <div className="h-3 w-3/4 animate-pulse rounded bg-brand/20" />
                  <div className="h-3 w-full animate-pulse rounded bg-brand/20" />
                  <div className="h-3 w-5/6 animate-pulse rounded bg-brand/20" />
                  <p className="pt-1 text-xs text-brand-dark/70">โค้ชกำลังวิเคราะห์ให้… 🧠</p>
                </div>
              ) : (
                <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{analysis}</p>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}

function Card({ tone, title, main, sub }: { tone: "ok" | "warn"; title: string; main: string; sub: string }) {
  const cls = tone === "ok" ? "bg-[#eaf6df]" : "bg-amber-50";
  return (
    <div className={`rounded-2xl ${cls} p-4`}>
      <p className="text-xs font-semibold text-gray-600">{title}</p>
      <p className="mt-1 text-2xl font-extrabold">{main}</p>
      <p className="text-[11px] text-gray-500">{sub}</p>
    </div>
  );
}
function formatThai(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}
function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-[60vh] items-center justify-center px-6 text-center text-gray-500">{children}</div>;
}
