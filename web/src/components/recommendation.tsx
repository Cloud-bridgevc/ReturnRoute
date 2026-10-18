import { Ban, CheckCircle2, Flag, Info, ShieldAlert } from "lucide-react";
import { ROUTE_DESCRIPTIONS, ROUTE_LABELS, gbp } from "@/lib/domain/catalog";
import type { Recommendation, RouteOption, RuleTraceEntry } from "@/lib/domain/types";
import { Badge, cx } from "./ui";

export function ValueComparison({ options, chosen, compact = false }: { options: RouteOption[]; chosen?: string; compact?: boolean }) {
  const rows = options.filter((o) => o.route !== "FURTHER_INSPECTION");
  // Scale bars to permitted routes only; blocked routes show their hypothetical value without a bar.
  const max = Math.max(1, ...rows.filter((o) => o.eligible).map((o) => Math.abs(o.netValue)));
  return (
    <div className="space-y-2.5">
      {rows.map((o) => {
        const pct = (Math.abs(o.netValue) / max) * 100;
        const isChosen = o.route === chosen;
        return (
          <div key={o.route} className={cx("rounded-lg px-3 py-2", isChosen ? "bg-teal-50 ring-1 ring-teal-500/40" : o.eligible ? "" : "opacity-60")}>
            <div className="mb-1 flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-1.5 font-medium text-navy-900">
                {o.eligible ? <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" /> : <Ban className="h-3.5 w-3.5 text-slate-400" />}
                {ROUTE_LABELS[o.route]}
                {isChosen && <Badge tone="teal">Recommended</Badge>}
              </span>
              {o.eligible ? (
                <span className={cx("font-mono text-sm tabular-nums", o.netValue < 0 ? "text-red-600" : "text-navy-900")}>{gbp(o.netValue, 2)}</span>
              ) : (
                <span className="text-xs text-slate-500">Not permitted <span className="font-mono line-through">{gbp(o.netValue, 2)}</span></span>
              )}
            </div>
            {o.eligible && (
              <div className="h-2 w-full rounded-full bg-slate-100">
                <div className={cx("h-2 rounded-full", o.netValue < 0 ? "bg-red-400" : isChosen ? "bg-teal-500" : "bg-navy-600")} style={{ width: `${Math.max(2, Math.min(100, pct))}%` }} />
              </div>
            )}
            {!compact && (
              <div className="mt-1 flex flex-wrap justify-between gap-x-3 text-xs text-slate-500">
                <span>Recovery {gbp(o.expectedRecovery, 2)} − handling {gbp(o.handlingCost, 2)}</span>
                {!o.eligible && <span className="text-slate-500">{o.blockedBy[0]}</span>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const TRACE_ICON: Record<RuleTraceEntry["outcome"], React.ReactNode> = {
  pass: <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" />,
  block: <Ban className="h-3.5 w-3.5 text-red-500" />,
  flag: <Flag className="h-3.5 w-3.5 text-signal-500" />,
  info: <Info className="h-3.5 w-3.5 text-slate-400" />,
};

export function RuleTrace({ trace }: { trace: RuleTraceEntry[] }) {
  return (
    <ul className="space-y-1.5 text-xs">
      {trace.map((t, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="mt-0.5">{TRACE_ICON[t.outcome]}</span>
          <span className="w-14 shrink-0 font-mono text-slate-400">{t.ruleId}</span>
          <span className="text-slate-700">{t.description}</span>
        </li>
      ))}
    </ul>
  );
}

export function Explanation({ rec }: { rec: Recommendation }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-lg font-semibold text-navy-900">{ROUTE_LABELS[rec.route]}</span>
        <Badge tone={rec.approvalLevel === "supervisor" ? "orange" : "slate"}>Needs {rec.approvalLevel} approval</Badge>
        {!rec.gradeVerified && (
          <Badge tone="red"><ShieldAlert className="h-3 w-3" /> Grade not verified</Badge>
        )}
      </div>
      <p className="text-sm text-slate-600">{ROUTE_DESCRIPTIONS[rec.route]}</p>
      <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
        {rec.rationale.map((r, i) => <li key={i}>{r}</li>)}
      </ul>
    </div>
  );
}
