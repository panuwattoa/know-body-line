"use client";

/** Circular progress ring. */
export function Ring({
  pct,
  label,
  sub,
  size = 72,
  stroke = 8,
  color,
}: {
  pct: number;
  label: string;
  sub?: string;
  size?: number;
  stroke?: number;
  color?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  const dash = (clamped / 100) * c;
  const ringColor = color ?? (pct >= 100 ? "#e74c3c" : pct >= 90 ? "#2ecc71" : pct >= 50 ? "#7bc043" : "#e59b1b");
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eee" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={ringColor}
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${c - dash}`}
            strokeLinecap="round"
          />
        </svg>
        <span
          className="absolute inset-0 flex items-center justify-center text-sm font-bold"
          style={{ color: ringColor }}
        >
          {Math.round(pct)}%
        </span>
      </div>
      <span className="mt-1 text-xs font-medium text-gray-700">{label}</span>
      {sub && <span className="text-[10px] text-gray-400">{sub}</span>}
    </div>
  );
}

export function ProgressBar({ pct, color = "#7bc043" }: { pct: number; color?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
      <div className="h-full rounded-full" style={{ width: `${Math.max(2, Math.min(100, pct))}%`, background: color }} />
    </div>
  );
}

/** Simple responsive line chart with an optional target line. */
export function LineChart({
  points,
  target,
  color = "#7bc043",
  height = 160,
  unit = "",
}: {
  points: { label: string; value: number }[];
  target?: number;
  color?: string;
  height?: number;
  unit?: string;
}) {
  const w = 320;
  const pad = 28;
  const vals = points.map((p) => p.value).filter((v) => v > 0);
  const maxV = Math.max(target ?? 0, ...(vals.length ? vals : [1])) * 1.15;
  const minV = 0;
  const x = (i: number) => pad + (i * (w - pad * 2)) / Math.max(1, points.length - 1);
  const y = (v: number) => height - pad - ((v - minV) / (maxV - minV || 1)) * (height - pad * 2);

  const drawn = points.map((p, i) => ({ ...p, i })).filter((p) => p.value > 0);
  const path = drawn.map((p, idx) => `${idx === 0 ? "M" : "L"} ${x(p.i)} ${y(p.value)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" role="img">
      {target ? (
        <>
          <line x1={pad} x2={w - pad} y1={y(target)} y2={y(target)} stroke="#e59b1b" strokeWidth={1.5} strokeDasharray="4 4" />
          <text x={w - pad} y={y(target) - 4} textAnchor="end" fontSize="9" fill="#e59b1b">{Math.round(target)}{unit}</text>
        </>
      ) : null}
      <path d={path} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {drawn.map((p) => (
        <circle key={p.i} cx={x(p.i)} cy={y(p.value)} r={3} fill={color} />
      ))}
      {points.map((p, i) => (
        <text key={i} x={x(i)} y={height - 8} textAnchor="middle" fontSize="8" fill="#999">{p.label}</text>
      ))}
    </svg>
  );
}
