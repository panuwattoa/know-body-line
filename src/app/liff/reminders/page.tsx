"use client";

import { useCallback, useEffect, useState } from "react";
import { useLiff, apiFetch } from "@/lib/liff/useLiff";

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID_REMINDERS || "";

type Kind = "meal_log" | "workout" | "weigh_in";
interface Reminder {
  id: string;
  kind: Kind;
  time_local: string;
  days: number[];
  enabled: boolean;
}

const KIND_META: Record<Kind, { emoji: string; label: string }> = {
  meal_log: { emoji: "🍽️", label: "จดมื้ออาหาร" },
  workout: { emoji: "🏋️", label: "ออกกำลังกาย" },
  weigh_in: { emoji: "⚖️", label: "ชั่งน้ำหนัก" },
};
const KINDS: Kind[] = ["meal_log", "workout", "weigh_in"];
const DAY_LABELS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const EVERYDAY = [0, 1, 2, 3, 4, 5, 6];

export default function Reminders() {
  const liff = useLiff(LIFF_ID);
  const [items, setItems] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!liff.idToken) return;
    setLoading(true);
    try {
      const { reminders } = await apiFetch<{ reminders: Reminder[] }>("/api/liff/reminders", liff.idToken);
      setItems(reminders);
    } finally {
      setLoading(false);
    }
  }, [liff.idToken]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- data-fetch effect syncs with LINE/LIFF
  useEffect(() => { if (liff.idToken) load(); }, [liff.idToken, load]);

  async function patch(id: string, p: Partial<Reminder>) {
    if (!liff.idToken) return;
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, ...p } : r)));
    setBusy(id);
    try {
      await apiFetch("/api/liff/reminders", liff.idToken, { method: "PUT", body: JSON.stringify({ id, ...p }) });
    } finally {
      setBusy(null);
    }
  }

  async function add() {
    if (!liff.idToken) return;
    setBusy("new");
    try {
      const { reminder } = await apiFetch<{ reminder: Reminder }>("/api/liff/reminders", liff.idToken, {
        method: "POST",
        body: JSON.stringify({ kind: "meal_log", time_local: "08:00", days: EVERYDAY, enabled: true }),
      });
      setItems((prev) => [...prev, reminder]);
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string) {
    if (!liff.idToken) return;
    setItems((prev) => prev.filter((r) => r.id !== id));
    await apiFetch(`/api/liff/reminders?id=${id}`, liff.idToken, { method: "DELETE" }).catch(() => {});
  }

  if (!liff.ready) return <Center>กำลังเชื่อมต่อ LINE…</Center>;
  if (liff.error) return <Center>⚠️ {liff.error}</Center>;

  return (
    <main className="mx-auto max-w-md px-4 py-6 pb-28">
      <h1 className="text-xl font-bold">⏰ ตั้งเตือน</h1>
      <p className="mt-1 text-sm text-gray-500">เตือนจดมื้อ ออกกำลังกาย และชั่งน้ำหนัก (เวลาไทย)</p>

      {loading ? (
        <p className="mt-8 text-center text-gray-400">กำลังโหลด…</p>
      ) : items.length === 0 ? (
        <p className="mt-8 rounded-2xl bg-gray-50 py-10 text-center text-gray-400">ยังไม่มีการเตือน — กดปุ่มด้านล่างเพื่อเพิ่ม</p>
      ) : (
        <div className="mt-5 space-y-4">
          {items.map((r) => (
            <div key={r.id} className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 ${r.enabled ? "" : "opacity-60"}`}>
              <div className="flex items-center gap-3">
                <select
                  value={r.kind}
                  onChange={(e) => patch(r.id, { kind: e.target.value as Kind })}
                  className="rounded-lg border border-gray-200 px-2 py-2 text-sm font-medium"
                >
                  {KINDS.map((k) => (
                    <option key={k} value={k}>{KIND_META[k].emoji} {KIND_META[k].label}</option>
                  ))}
                </select>
                <input
                  type="time"
                  value={r.time_local}
                  onChange={(e) => patch(r.id, { time_local: e.target.value })}
                  className="rounded-lg border border-gray-200 px-2 py-2 text-lg font-bold"
                />
                <div className="ml-auto flex items-center gap-2">
                  <Toggle on={r.enabled} onClick={() => patch(r.id, { enabled: !r.enabled })} />
                </div>
              </div>

              {/* Day picker */}
              <div className="mt-3 flex gap-1.5">
                {DAY_LABELS.map((d, i) => {
                  const on = r.days.includes(i);
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        const next = on ? r.days.filter((x) => x !== i) : [...r.days, i].sort((a, b) => a - b);
                        if (next.length) patch(r.id, { days: next });
                      }}
                      className={`h-8 w-8 rounded-full text-xs font-bold ${on ? "bg-brand text-white" : "bg-gray-100 text-gray-400"}`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="flex gap-2">
                  <Quick label="ทุกวัน" onClick={() => patch(r.id, { days: EVERYDAY })} />
                  <Quick label="จ-ศ" onClick={() => patch(r.id, { days: [1, 2, 3, 4, 5] })} />
                </div>
                <button onClick={() => remove(r.id)} className="text-sm font-semibold text-red-500">🗑️ ลบ</button>
              </div>
              {busy === r.id && <p className="mt-2 text-right text-[11px] text-gray-400">กำลังบันทึก…</p>}
            </div>
          ))}
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 border-t bg-white/95 px-4 py-3 backdrop-blur">
        <button
          onClick={add}
          disabled={busy === "new"}
          className="mx-auto block w-full max-w-md rounded-full bg-brand py-3.5 font-bold text-white disabled:opacity-50"
        >
          {busy === "new" ? "กำลังเพิ่ม…" : "＋ เพิ่มการเตือน"}
        </button>
      </div>
    </main>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative h-7 w-12 rounded-full transition ${on ? "bg-brand" : "bg-gray-300"}`}
      aria-pressed={on}
    >
      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}
function Quick({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
      {label}
    </button>
  );
}
function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-[60vh] items-center justify-center px-6 text-center text-gray-500">{children}</div>;
}
