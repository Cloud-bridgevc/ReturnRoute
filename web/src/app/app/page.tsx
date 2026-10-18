"use client";
import Link from "next/link";
import { ArrowRight, Sparkles, User, Cog } from "lucide-react";
import { BarList, Stat } from "@/components/app/charts";
import { PageHeader, useApp } from "@/components/app/shell";
import { Card, cx, timeAgo } from "@/components/ui";
import { aiAgreement, reasonBreakdown, stageDwell, upliftVsLiquidation } from "@/lib/analytics";
import { gbp } from "@/lib/domain/catalog";

export default function Overview() {
  const { state } = useApp();
  const rs = state.returns;
  const open = rs.filter((r) => r.stage !== "closed");
  const dwell = stageDwell(rs);
  const agree = aiAgreement(rs);
  const uplift = upliftVsLiquidation(rs);
  const recovered = rs.reduce((s, r) => s + (r.realisedValue ?? 0), 0);
  const activity = rs.flatMap((r) => r.audit.map((a) => ({ ...a, id: r.id }))).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 9);
  const showcase = rs.find((r) => r.id === "RR-24017");

  return (
    <>
      <PageHeader title="Operations overview" sub={`${state.user.name} · ${state.user.role} · Leeds DC & Daventry Hub (fictional sites)`} />

      {showcase && showcase.stage !== "closed" && (
        <Link href="/app/returns/RR-24017" className="mb-6 flex items-center gap-4 rounded-xl bg-navy-900 p-4 text-white hover:bg-navy-800">
          <Sparkles className="h-6 w-6 shrink-0 text-teal-400" />
          <div className="flex-1 text-sm">
            <div className="font-semibold">Guided walkthrough: dented kettle RR-24017</div>
            <div className="text-navy-300">Verify the AI condition suggestion, review the recommended route and its explanation, then approve and assign a warehouse task.</div>
          </div>
          <ArrowRight className="h-5 w-5 text-teal-400" />
        </Link>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="Open returns" value={open.length} sub={`${rs.length} in the last 30 days`} />
        <Stat label="Awaiting verification" value={rs.filter((r) => r.stage === "verification").length} sub="AI grade needs a person" tone="warn" />
        <Stat label="Awaiting approval" value={rs.filter((r) => r.stage === "approval").length} sub="Route recommended" tone="warn" />
        <Stat label="Recovered value" value={gbp(recovered)} sub="Closed returns, net" />
        <Stat label="Uplift vs liquidation" value={gbp(uplift.uplift)} sub="vs 25% MSRP baseline" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title="Pipeline & bottlenecks" className="lg:col-span-2" action={<Link href="/app/analytics" className="text-xs font-medium text-teal-600">Analytics →</Link>}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-5">
            {dwell.map((d) => (
              <div key={d.stage} className={cx("rounded-lg border p-3", d.breaching ? "border-signal-500/40 bg-signal-100/40" : "border-slate-200")}>
                <div className="text-xs text-slate-500">{d.label}</div>
                <div className="mt-1 text-xl font-semibold text-navy-900">{d.count}</div>
                <div className="text-[11px] text-slate-500">avg {d.avgHours.toFixed(1)}h · target {d.sla}h</div>
                {d.breaching > 0 && <div className="mt-1 text-[11px] font-medium text-signal-700">{d.breaching} over target</div>}
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Top return reasons</div>
              <BarList rows={reasonBreakdown(rs).slice(0, 5)} />
            </div>
            <div>
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">AI suggestion quality</div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-slate-600">Grades verified by inspectors</span><b className="tabular-nums">{agree.verified}</b></div>
                <div className="flex justify-between"><span className="text-slate-600">Inspector agreed with AI</span><b className="tabular-nums">{Math.round(agree.rate * 100)}%</b></div>
                <div className="flex justify-between"><span className="text-slate-600">Route overrides at approval</span><b className="tabular-nums">{agree.overrides}</b></div>
                <p className="rounded-md bg-slate-50 p-2 text-xs text-slate-500">Every AI grade is checked by a person, so these numbers show how reliable the suggestions are without any risk to stock or refunds.</p>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Recent activity">
          <ul className="space-y-3">
            {activity.map((a, i) => (
              <li key={i} className="flex gap-2.5 text-sm">
                <span className={cx("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full", a.kind === "ai" ? "bg-navy-900" : a.kind === "human" ? "bg-teal-50" : "bg-slate-100")}>
                  {a.kind === "ai" ? <Sparkles className="h-3 w-3 text-teal-300" /> : a.kind === "human" ? <User className="h-3 w-3 text-teal-700" /> : <Cog className="h-3 w-3 text-slate-500" />}
                </span>
                <div className="min-w-0">
                  <div className="text-navy-900"><Link href={`/app/returns/${a.id}`} className="font-mono text-xs font-semibold hover:text-teal-600">{a.id}</Link> · {a.action}</div>
                  <div className="truncate text-xs text-slate-500">{a.actor} · {timeAgo(a.at)}</div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
