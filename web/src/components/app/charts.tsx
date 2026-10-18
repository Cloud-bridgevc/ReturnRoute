import { cx } from "../ui";

export function Stat({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: "warn" }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className={cx("mt-1 text-2xl font-semibold tabular-nums", tone === "warn" ? "text-signal-700" : "text-navy-900")}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

/** Single-series horizontal bar list: one hue, values in text ink, hover tooltip via title. */
export function BarList({ rows, format = (n) => String(n), highlight, color = "bg-teal-500" }: {
  rows: { key: string; label: string; value: number; detail?: string }[];
  format?: (n: number) => string;
  highlight?: (key: string) => boolean;
  color?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0) return <p className="text-sm text-slate-500">No data yet.</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.key} title={`${r.label}: ${format(r.value)}${r.detail ? ` — ${r.detail}` : ""}`} className="group">
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-slate-700 group-hover:text-navy-900">{r.label}</span>
            <span className="font-mono text-xs tabular-nums text-navy-900">{format(r.value)}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div className={cx("h-2 rounded-full transition-[width]", highlight?.(r.key) ? "bg-signal-500" : color, "group-hover:opacity-80")} style={{ width: `${Math.max(1.5, (r.value / max) * 100)}%` }} />
          </div>
          {r.detail && <div className="mt-0.5 text-[11px] text-slate-500">{r.detail}</div>}
        </li>
      ))}
    </ul>
  );
}
