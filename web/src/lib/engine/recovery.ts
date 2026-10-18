// Recovery Recommendation Engine + Recovery Value Analysis.
// Pure, deterministic and explainable: every recommendation carries a rule trace
// and a per-route value breakdown. It only RECOMMENDS — approval is a human step.
import { GRADE_LABELS, ROUTE_LABELS, gbp } from "../domain/catalog";
import type {
  ConditionGrade, Product, Recommendation, RecoveryRoute, RecoveryRules, ReturnRecord, Role, RouteOption, RuleTraceEntry,
} from "../domain/types";

const round = (n: number) => Math.round(n * 100) / 100;

export function evaluateRoutes(product: Product, grade: ConditionGrade, rules: RecoveryRules, opts: { accessoriesComplete?: boolean | null } = {}) {
  const c = rules.costs;
  const trace: RuleTraceEntry[] = [];
  const missingPenalty = opts.accessoriesComplete === false ? 0.85 : 1;

  const option = (route: RecoveryRoute, gross: number, costs: { label: string; amount: number }[], blockedBy: string[]): RouteOption => {
    const handlingCost = round(costs.reduce((s, x) => s + x.amount, 0));
    return { route, eligible: blockedBy.length === 0, blockedBy, expectedRecovery: round(gross), handlingCost, netValue: round(gross - handlingCost), costBreakdown: costs };
  };

  // RESTOCK
  const restockBlocks: string[] = [];
  if (!rules.restockGrades.includes(grade)) restockBlocks.push(`R-01 Restock limited to ${rules.restockGrades.map((g) => g[0]).join("/")} grades`);
  if (opts.accessoriesComplete === false) restockBlocks.push("R-02 Restock requires complete accessories");
  const restock = option("RESTOCK", product.msrp * rules.recoveryRates.RESTOCK,
    [{ label: "Inspection labour", amount: c.inspectionLabour }, { label: "Restock & repack labour", amount: c.restockLabour }], restockBlocks);

  // RESALE (secondary / open-box)
  const resaleBlocks: string[] = [];
  if (!rules.resaleGrades.includes(grade)) resaleBlocks.push(`R-10 Secondary resale limited to ${rules.resaleGrades.map((g) => g[0]).join("/")} grades`);
  const gradeFactor = rules.resaleGradeDiscount[grade] ?? 0.6;
  const resaleGross = product.msrp * rules.recoveryRates.RESALE * gradeFactor * missingPenalty;
  const resale = option("RESALE", resaleGross, [
    { label: "Inspection labour", amount: c.inspectionLabour },
    { label: "Grading, photos & prep", amount: c.resalePrepCost },
    { label: `Channel fee (${Math.round(c.resaleChannelFeePct * 100)}%)`, amount: round(resaleGross * c.resaleChannelFeePct) },
    { label: "Outbound logistics", amount: c.outboundLogistics },
  ], resaleBlocks);

  // REPAIR
  const repairBlocks: string[] = [];
  if (!product.repairable) repairBlocks.push("R-20 Product line not designated repairable");
  if (!rules.repairGrades.includes(grade)) repairBlocks.push(`R-21 Repair limited to ${rules.repairGrades.map((g) => g[0]).join("/")} grades`);
  const repairCost = product.avgRepairCost + c.repairLabourPerHour * c.repairHours;
  if (product.repairable && repairCost > product.msrp * rules.maxRepairCostPctOfMsrp)
    repairBlocks.push(`R-22 Repair cost ${gbp(repairCost)} exceeds ${Math.round(rules.maxRepairCostPctOfMsrp * 100)}% of MSRP`);
  const repairGross = product.msrp * rules.recoveryRates.REPAIR * missingPenalty;
  const repair = option("REPAIR", product.repairable ? repairGross : 0, [
    { label: "Inspection labour", amount: c.inspectionLabour },
    { label: "Parts (typical)", amount: product.avgRepairCost },
    { label: `Bench labour (${c.repairHours}h)`, amount: round(c.repairLabourPerHour * c.repairHours) },
    { label: `Channel fee (${Math.round(c.resaleChannelFeePct * 100)}%)`, amount: round(repairGross * c.resaleChannelFeePct) },
    { label: "Outbound logistics", amount: c.outboundLogistics },
  ], repairBlocks);

  // RECYCLE — always permitted for graded items; may be net negative.
  const recycleBlocks: string[] = [];
  if (grade === "X_UNCERTAIN") recycleBlocks.push("R-30 Cannot dispose of an item whose condition is unconfirmed");
  const credit = product.weightKg * c.materialCreditPerKg;
  const recycle = option("RECYCLE", credit, [
    { label: "Inspection labour", amount: c.inspectionLabour },
    { label: "Certified recycling fee", amount: round(product.weightKg * c.recyclingFeePerKg) },
  ], recycleBlocks);

  const inspect = option("FURTHER_INSPECTION", 0, [{ label: "Specialist inspection (est.)", amount: 12 }], []);

  trace.push({ ruleId: "R-01", description: `Restock grade gate (${grade[0]})`, outcome: restockBlocks.length ? "block" : "pass" });
  trace.push({ ruleId: "R-10", description: `Secondary resale grade gate (${grade[0]})`, outcome: resaleBlocks.length ? "block" : "pass" });
  trace.push({ ruleId: "R-20/22", description: `Repair eligibility & cost ceiling (${gbp(repairCost)} vs ${gbp(product.msrp * rules.maxRepairCostPctOfMsrp)})`, outcome: repairBlocks.length ? "block" : "pass" });
  trace.push({ ruleId: "R-30", description: "Disposal requires confirmed condition", outcome: recycleBlocks.length ? "block" : "pass" });

  return { options: [restock, resale, repair, recycle, inspect], trace };
}

export function recommend(record: ReturnRecord, product: Product, rules: RecoveryRules): Recommendation {
  const insp = record.inspection;
  const verified = !!insp?.verifiedGrade;
  const grade: ConditionGrade = insp?.verifiedGrade ?? insp?.suggestion?.grade ?? "X_UNCERTAIN";
  const { options, trace } = evaluateRoutes(product, grade, rules, { accessoriesComplete: insp?.checklist.accessoriesComplete });
  const rationale: string[] = [];
  let forced: RecoveryRoute | null = null;

  trace.unshift({
    ruleId: "G-01",
    description: verified ? `Condition verified by ${insp?.verifiedBy}: ${GRADE_LABELS[grade]}` : "Condition not yet verified by a person — AI suggestion cannot drive a route",
    outcome: verified ? "pass" : "block",
  });
  if (rules.requireVerifiedGrade && !verified) {
    forced = "FURTHER_INSPECTION";
    rationale.push("The condition grade has not been confirmed by an inspector, so the engine will not recommend a disposition based on the AI suggestion alone.");
  }
  if (grade === "X_UNCERTAIN") {
    forced = "FURTHER_INSPECTION";
    rationale.push("Condition is uncertain; the item is held in quarantine for specialist inspection.");
  }
  if (product.containsBattery && rules.batteryRequiresSafetyCheck) {
    const ok = insp?.checklist.batterySafe === true;
    trace.push({ ruleId: "S-01", description: "Lithium battery safety check recorded", outcome: ok ? "pass" : "block" });
    if (!ok) {
      forced = "FURTHER_INSPECTION";
      rationale.push("Product contains a lithium battery and no passed battery safety check is recorded (rule S-01).");
    }
  }
  const sug = insp?.suggestion;
  if (sug && sug.confidence < rules.minSuggestionConfidence) {
    trace.push({ ruleId: "G-02", description: `AI suggestion confidence ${Math.round(sug.confidence * 100)}% below ${Math.round(rules.minSuggestionConfidence * 100)}% threshold`, outcome: "flag" });
    if (!verified) forced = "FURTHER_INSPECTION";
  }
  if (sug && verified && sug.grade !== grade) {
    trace.push({ ruleId: "G-03", description: `Inspector grade (${grade[0]}) differs from AI suggestion (${sug.grade[0]}); inspector grade used`, outcome: "info" });
  }

  const eligible = options.filter((o) => o.eligible && o.route !== "FURTHER_INSPECTION");
  let route: RecoveryRoute;
  if (forced) {
    route = forced;
  } else if (eligible.length === 0) {
    route = "FURTHER_INSPECTION";
    rationale.push("No processing route is permitted by the current rules for this grade.");
  } else {
    eligible.sort((a, b) => b.netValue - a.netValue || rules.routePriority.indexOf(a.route) - rules.routePriority.indexOf(b.route));
    const best = eligible[0];
    route = best.route;
    rationale.push(`${ROUTE_LABELS[best.route]} has the highest estimated net recovery of the permitted routes (${gbp(best.netValue, 2)}).`);
    const runner = eligible[1];
    if (runner) rationale.push(`Next best: ${ROUTE_LABELS[runner.route]} at ${gbp(runner.netValue, 2)} (${gbp(best.netValue - runner.netValue, 2)} lower).`);
    const blocked = options.filter((o) => !o.eligible && o.route !== "FURTHER_INSPECTION");
    for (const b of blocked) rationale.push(`${ROUTE_LABELS[b.route]} not permitted: ${b.blockedBy[0]}.`);
    if (best.netValue < 0) rationale.push("All permitted routes are net-negative; the least-cost option is recommended.");
  }

  // Approval level — explicit business rule, never inferred by AI.
  let approvalLevel: Role = "inspector";
  if (route === "RECYCLE") { approvalLevel = "supervisor"; trace.push({ ruleId: "A-01", description: "Disposal/recycling requires supervisor approval", outcome: "flag" }); }
  if (product.msrp >= rules.highValueThreshold) { approvalLevel = "supervisor"; trace.push({ ruleId: "A-02", description: `High-value item (≥ ${gbp(rules.highValueThreshold)}) requires supervisor approval`, outcome: "flag" }); }
  trace.push({ ruleId: "A-00", description: "Refunds and inventory adjustments are never executed automatically", outcome: "info" });

  return {
    route, options, rationale, ruleTrace: trace, approvalLevel, basedOnGrade: grade, gradeVerified: verified,
    generatedAt: new Date().toISOString(), rulesVersion: rules.version,
  };
}

export const canApprove = (role: Role, required: Role) =>
  required === "inspector" ? role === "inspector" || role === "supervisor" : role === "supervisor";
