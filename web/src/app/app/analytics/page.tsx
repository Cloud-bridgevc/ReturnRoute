"use client";
import { AlertTriangle } from "lucide-react";
import { BarList, Stat } from "@/components/app/charts";
import { PageHeader, useApp } from "@/components/app/shell";
import { Card, cx } from "@/components/ui";
import { aiAgreement, damageByCarrier, damageByCategory, reasonBreakdown, skuIssues, stageDwell } from "@/lib/analytics";

export default function Analytics() {
  const { state } = useApp();
  const rs = state.returns;
  const reasons = reasonBreakdown(rs);
  const skus = skuIssues(rs);
  const carriers = damageByCarrier(rs);
  const dwell = stageDwell(rs);
  const worstStage = [...dwell].sort((a, b) => b.avgHours / b.sla - a.avgHours / a.sla)[0];
  const agree = aiAgreement(rs);
  const hotSku = skus.find((s) => s.value >= 4 && s.damageShare >= 0.5);

  return (
    <>
      <PageHeader title="Returns analytics" sub={`${rs.length} returns · fictional data`} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Damage & defect share" value={`${Math.round((rs.filter((r) => r.reason && ["damaged_in_transit", "defective", "missing_parts"].includes(r.reason.category)).length / rs.length) * 100)}%`} sub="of all returns" />
        <Stat label="Top carrier for transit damage" value={carriers[0]?.label.replace(" (fictional)", "") ?? "—"} sub={carriers[0]?.detail} />
        <Stat label="Slowest stage vs target" value={worstStage.label} sub={`avg ${worstStage.avgHours.toFixed(1)}h · target ${worstStage.sla}h`} tone={worstStage.avgHours > worstStage.sla ? "warn" : undefined} />
        <Stat label="AI / inspector agreement" value={`${Math.round(agree.rate * 100)}%`} sub={`${agree.verified} verified grades`} />
      </div>

      {hotSku && (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-signal-500/40 bg-signal-100/50 p-4 text-sm">
          <AlertTriangle className="h-5 w-5 shrink-0 text-signal-500" />
          <div><b className="text-navy-900">Recurring issue:</b> {hotSku.label} has {hotSku.value} returns, {Math.round(hotSku.damageShare * 100)}% for damage or defects (top reason: {hotSku.topReason}). Consider a packaging review or a supplier quality query.</div>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Return reasons (AI-classified)"><BarList rows={reasons} /></Card>
        <Card title="Damage & defects by product category"><BarList rows={damageByCategory(rs)} /></Card>
        <Card title="Transit damage by carrier (fictional carriers)"><BarList rows={carriers} /></Card>
        <Card title="Processing bottlenecks: average hours in stage">
          <BarList rows={dwell.map((d) => ({ key: d.stage, label: `${d.label} (${d.count} open)`, value: Number(d.avgHours.toFixed(1)), detail: `target ${d.sla}h${d.breaching ? ` · ${d.breaching} over target` : ""}` }))}
            format={(n) => `${n}h`} highlight={(k) => { const d = dwell.find((x) => x.stage === k)!; return d.avgHours > d.sla; }} />
          <p className="mt-3 text-xs text-slate-500">Orange bars are over their stage target.</p>
        </Card>
      </div>

      <Card title="Returns by SKU" className="mt-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-left text-xs text-slate-500"><tr><th className="pb-2">Product</th><th className="pb-2 text-right">Returns</th><th className="pb-2 text-right">Damage / defect</th><th className="pb-2">Top reason</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {skus.map((s) => (
                <tr key={s.key}>
                  <td className="py-2"><div className="text-navy-900">{s.label}</div><div className="font-mono text-[11px] text-slate-400">{s.key}</div></td>
                  <td className="py-2 text-right tabular-nums">{s.value}</td>
                  <td className={cx("py-2 text-right tabular-nums", s.damageShare >= 0.5 && "font-semibold text-signal-700")}>{Math.round(s.damageShare * 100)}%</td>
                  <td className="py-2 text-slate-600">{s.topReason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
