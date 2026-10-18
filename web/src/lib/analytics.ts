import { PRODUCTS, REASON_LABELS, ROUTE_LABELS, STAGE_LABELS, productBySku } from "./domain/catalog";
import type { RecoveryRoute, ReturnRecord, ReturnStage } from "./domain/types";

const HOUR = 3600_000;
export interface Row { key: string; label: string; value: number; detail?: string }

const countBy = <T,>(items: T[], key: (t: T) => string | undefined) => {
  const m = new Map<string, number>();
  for (const i of items) { const k = key(i); if (k) m.set(k, (m.get(k) ?? 0) + 1); }
  return m;
};

export function reasonBreakdown(rs: ReturnRecord[]): Row[] {
  return [...countBy(rs, (r) => r.reason?.category)].map(([k, v]) => ({ key: k, label: REASON_LABELS[k as keyof typeof REASON_LABELS], value: v }))
    .sort((a, b) => b.value - a.value);
}

const DAMAGE = new Set(["damaged_in_transit", "defective", "missing_parts"]);

export function skuIssues(rs: ReturnRecord[]): (Row & { damageShare: number; topReason: string })[] {
  return PRODUCTS.map((p) => {
    const mine = rs.filter((r) => r.sku === p.sku);
    const dmg = mine.filter((r) => r.reason && DAMAGE.has(r.reason.category)).length;
    const top = reasonBreakdown(mine)[0];
    return { key: p.sku, label: p.name, value: mine.length, damageShare: mine.length ? dmg / mine.length : 0, topReason: top?.label ?? "—" };
  }).filter((x) => x.value > 0).sort((a, b) => b.value - a.value);
}

export function damageByCarrier(rs: ReturnRecord[]): Row[] {
  const transit = rs.filter((r) => r.reason?.category === "damaged_in_transit");
  return [...countBy(transit, (r) => r.carrier)].map(([k, v]) => {
    const total = rs.filter((r) => r.carrier === k).length;
    return { key: k, label: k, value: v, detail: `${Math.round((v / total) * 100)}% of ${total} returns via this carrier` };
  }).sort((a, b) => b.value - a.value);
}

export function damageByCategory(rs: ReturnRecord[]): Row[] {
  const dmg = rs.filter((r) => r.reason && DAMAGE.has(r.reason.category));
  return [...countBy(dmg, (r) => productBySku(r.sku)?.category)].map(([k, v]) => ({ key: k, label: k, value: v })).sort((a, b) => b.value - a.value);
}

export const OPEN_STAGES: ReturnStage[] = ["intake", "inspection", "verification", "approval", "tasked"];
/** Target dwell time per stage (hours) used to flag bottlenecks. */
export const STAGE_SLA: Record<ReturnStage, number> = { intake: 4, inspection: 24, verification: 8, approval: 12, tasked: 24, closed: Infinity };

export function stageDwell(rs: ReturnRecord[], now = Date.now()) {
  return OPEN_STAGES.map((s) => {
    const items = rs.filter((r) => r.stage === s);
    const ages = items.map((r) => (now - new Date(r.stageEnteredAt).getTime()) / HOUR);
    const avg = ages.length ? ages.reduce((a, b) => a + b, 0) / ages.length : 0;
    const breaching = ages.filter((a) => a > STAGE_SLA[s]).length;
    return { stage: s, label: STAGE_LABELS[s], count: items.length, avgHours: avg, sla: STAGE_SLA[s], breaching };
  });
}

export function routeValue(rs: ReturnRecord[]) {
  const decided = rs.filter((r) => r.decision && r.recommendation);
  const routes: RecoveryRoute[] = ["RESTOCK", "RESALE", "REPAIR", "RECYCLE", "FURTHER_INSPECTION"];
  return routes.map((route) => {
    const items = decided.filter((r) => r.decision!.route === route);
    const expected = items.reduce((s, r) => s + (r.recommendation!.options.find((o) => o.route === route)?.netValue ?? 0), 0);
    const msrp = items.reduce((s, r) => s + (productBySku(r.sku)?.msrp ?? 0), 0);
    const realised = items.filter((r) => r.realisedValue !== undefined).reduce((s, r) => s + r.realisedValue!, 0);
    return { route, label: ROUTE_LABELS[route], count: items.length, expected, realised, msrp };
  });
}

/** Value uplift vs. a naive "liquidate everything at 25% of MSRP" baseline. */
export function upliftVsLiquidation(rs: ReturnRecord[]) {
  const decided = rs.filter((r) => r.decision && r.recommendation);
  let chosen = 0, baseline = 0;
  for (const r of decided) {
    const p = productBySku(r.sku); if (!p) continue;
    chosen += r.recommendation!.options.find((o) => o.route === r.decision!.route)?.netValue ?? 0;
    baseline += p.msrp * 0.25 - 6;
  }
  return { chosen, baseline, uplift: chosen - baseline };
}

export function aiAgreement(rs: ReturnRecord[]) {
  const v = rs.filter((r) => r.inspection?.verifiedGrade && r.inspection.suggestion);
  const agreed = v.filter((r) => r.inspection!.verifiedGrade === r.inspection!.suggestion!.grade).length;
  const overrides = rs.filter((r) => r.decision?.overridden).length;
  return { verified: v.length, agreed, rate: v.length ? agreed / v.length : 0, overrides };
}

export function byRetailer(rs: ReturnRecord[]): Row[] {
  const m = new Map<string, number>();
  for (const r of rs) if (r.realisedValue !== undefined) m.set(r.retailer, (m.get(r.retailer) ?? 0) + r.realisedValue);
  return [...m].map(([k, v]) => ({ key: k, label: k, value: v })).sort((a, b) => b.value - a.value);
}
