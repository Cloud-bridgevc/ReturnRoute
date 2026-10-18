import Link from "next/link";
import { FlaskConical, ShieldCheck, Sparkles } from "lucide-react";
import { GRADE_LABELS, ROUTE_LABELS, STAGE_LABELS } from "@/lib/domain/catalog";
import type { ConditionGrade, RecoveryRoute, ReturnStage } from "@/lib/domain/types";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function Logo({ dark = false, href = "/" }: { dark?: boolean; href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-semibold tracking-tight">
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="8" fill="#14b8a6" />
        <path d="M9 21V11h7a4 4 0 0 1 0 8h-7" stroke="#0a1a2f" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 19l5 4" stroke="#f97316" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
      <span className={dark ? "text-white" : "text-navy-900"}>
        Return<span className="text-teal-500">Route</span>
      </span>
    </Link>
  );
}

export function Card({ children, className, title, action }: { children: React.ReactNode; className?: string; title?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className={cx("rounded-xl border border-slate-200 bg-white shadow-sm", className)}>
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-navy-900">{title}</h2>
          {action}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

type Tone = "teal" | "orange" | "navy" | "slate" | "red" | "green";
const TONES: Record<Tone, string> = {
  teal: "bg-teal-50 text-teal-700 ring-teal-600/20",
  orange: "bg-signal-100 text-signal-700 ring-signal-500/25",
  navy: "bg-navy-900 text-white ring-navy-900",
  slate: "bg-slate-100 text-slate-700 ring-slate-500/15",
  red: "bg-red-50 text-red-700 ring-red-600/20",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
};

export function Badge({ tone = "slate", children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return <span className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", TONES[tone], className)}>{children}</span>;
}

const STAGE_TONE: Record<ReturnStage, Tone> = { intake: "slate", inspection: "orange", verification: "orange", approval: "orange", tasked: "teal", closed: "green" };
export const StageBadge = ({ stage }: { stage: ReturnStage }) => <Badge tone={STAGE_TONE[stage]}>{STAGE_LABELS[stage]}</Badge>;

const ROUTE_TONE: Record<RecoveryRoute, Tone> = { RESTOCK: "green", REPAIR: "teal", RESALE: "teal", RECYCLE: "slate", FURTHER_INSPECTION: "orange" };
export const RouteBadge = ({ route }: { route: RecoveryRoute }) => <Badge tone={ROUTE_TONE[route]}>{ROUTE_LABELS[route]}</Badge>;

const GRADE_TONE: Record<ConditionGrade, Tone> = { A_NEW: "green", B_OPEN_BOX: "green", C_USED_GOOD: "teal", D_DAMAGED_REPAIRABLE: "orange", E_NOT_REPAIRABLE: "red", X_UNCERTAIN: "orange" };
export const GradeBadge = ({ grade }: { grade: ConditionGrade }) => <Badge tone={GRADE_TONE[grade]}>{GRADE_LABELS[grade]}</Badge>;

export function AiBadge({ source }: { source: "simulated" | "bedrock" }) {
  return (
    <Badge tone="navy" className="!bg-navy-800">
      <Sparkles className="h-3 w-3 text-teal-300" /> AI suggestion{source === "simulated" ? " · simulated" : " · Bedrock"}
    </Badge>
  );
}

export function SimulatedTag({ label = "Simulated integration" }: { label?: string }) {
  return (
    <Badge tone="orange">
      <FlaskConical className="h-3 w-3" /> {label}
    </Badge>
  );
}

export function HumanGate({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-teal-200 bg-teal-50/60 px-3 py-2 text-xs text-teal-900">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
      <div>{children}</div>
    </div>
  );
}

export function Confidence({ value, threshold }: { value: number; threshold?: number }) {
  const pct = Math.round(value * 100);
  const low = threshold !== undefined && value < threshold;
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1.5 w-24 overflow-hidden rounded-full bg-slate-200">
        <div className={cx("h-full rounded-full", low ? "bg-signal-500" : "bg-teal-500")} style={{ width: `${pct}%` }} />
        {threshold !== undefined && <div className="absolute top-0 h-full w-px bg-navy-900" style={{ left: `${threshold * 100}%` }} />}
      </div>
      <span className={cx("font-mono text-xs tabular-nums", low ? "text-signal-700" : "text-slate-600")}>{pct}%</span>
    </div>
  );
}

export function Button({ variant = "primary", className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "accent" }) {
  const v = {
    primary: "bg-navy-900 text-white hover:bg-navy-800 disabled:bg-slate-300",
    accent: "bg-teal-500 text-navy-950 hover:bg-teal-400 disabled:bg-slate-300",
    secondary: "bg-white text-navy-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:text-slate-400",
    ghost: "text-slate-600 hover:bg-slate-100",
  }[variant];
  return <button {...props} className={cx("inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:cursor-not-allowed", v, className)} />;
}

export const inputCls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-navy-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20";
export const labelCls = "mb-1 block text-xs font-medium text-slate-600";

export function timeAgo(isoStr: string, now = Date.now()) {
  const m = Math.max(0, Math.round((now - new Date(isoStr).getTime()) / 60000));
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
