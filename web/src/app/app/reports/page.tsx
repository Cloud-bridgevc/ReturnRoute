"use client";
import { BarList, Stat } from "@/components/app/charts";
import { PageHeader, useApp } from "@/components/app/shell";
import { Button, Card, RouteBadge } from "@/components/ui";
import { byRetailer, routeValue, upliftVsLiquidation } from "@/lib/analytics";
import { gbp } from "@/lib/domain/catalog";

export default function Reports() {
  const { state } = useApp();
  const rows = routeValue(state.returns);
  const totals = rows.reduce((a, r) => ({ count: a.count + r.count, expected: a.expected + r.expected, realised: a.realised + r.realised, msrp: a.msrp + r.msrp }), { count: 0, expected: 0, realised: 0, msrp: 0 });
  const uplift = upliftVsLiquidation(state.returns);

  function exportCsv() {
    const lines = [["route", "returns", "msrp_total", "expected_net", "realised_net"], ...rows.map((r) => [r.route, r.count, r.msrp.toFixed(2), r.expected.toFixed(2), r.realised.toFixed(2)])];
    const blob = new Blob([lines.map((l) => l.join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "returnroute-recovery-value.csv"; a.click();
  }

  return (
    <>
      <PageHeader title="Recovery value reports" sub="Approved decisions only. Values are net of handling, parts, channel fees and logistics." action={<Button variant="secondary" onClick={exportCsv}>Export CSV</Button>} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Decisions approved" value={totals.count} />
        <Stat label="Expected net recovery" value={gbp(totals.expected)} sub={`${totals.msrp ? Math.round((totals.expected / totals.msrp) * 100) : 0}% of MSRP`} />
        <Stat label="Realised (closed)" value={gbp(totals.realised)} />
        <Stat label="Uplift vs liquidation" value={gbp(uplift.uplift)} sub={`Baseline ${gbp(uplift.baseline)}`} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card title="Value by recovery route">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="text-left text-xs text-slate-500"><tr><th className="pb-2">Route</th><th className="pb-2 text-right">Returns</th><th className="pb-2 text-right">MSRP</th><th className="pb-2 text-right">Expected net</th><th className="pb-2 text-right">Realised</th><th className="pb-2 text-right">Net / unit</th></tr></thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {rows.map((r) => (
                  <tr key={r.route}>
                    <td className="py-2"><RouteBadge route={r.route} /></td>
                    <td className="py-2 text-right">{r.count}</td>
                    <td className="py-2 text-right">{gbp(r.msrp)}</td>
                    <td className={`py-2 text-right ${r.expected < 0 ? "text-red-600" : ""}`}>{gbp(r.expected)}</td>
                    <td className="py-2 text-right">{gbp(r.realised)}</td>
                    <td className="py-2 text-right">{r.count ? gbp(r.expected / r.count) : "—"}</td>
                  </tr>
                ))}
                <tr className="font-semibold"><td className="py-2">Total</td><td className="py-2 text-right">{totals.count}</td><td className="py-2 text-right">{gbp(totals.msrp)}</td><td className="py-2 text-right">{gbp(totals.expected)}</td><td className="py-2 text-right">{gbp(totals.realised)}</td><td /></tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-500">Liquidation baseline assumes every return is sold as-is at 25% of MSRP, less £6 handling. Illustrative only.</p>
        </Card>
        <Card title="Realised recovery by retailer">
          <BarList rows={byRetailer(state.returns)} format={(n) => gbp(n)} />
        </Card>
      </div>
    </>
  );
}
