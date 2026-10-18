// Trigger: EventBridge "ConditionVerified" { verificationId }
// Runs the deterministic rules engine against the HUMAN-verified grade and stores
// a recommendation that waits for staff approval.
import type { EventBridgeEvent } from "aws-lambda";
import type { Product, RecoveryRules, ReturnRecord } from "../lib/domain/types";
import { recommend } from "../lib/engine/recovery";
import { audit, tx } from "./shared/db";

export async function handler(event: EventBridgeEvent<"ConditionVerified", { verificationId: string }>) {
  const { verificationId } = event.detail;
  await tx(async (c) => {
    const { rows: [v] } = await c.query(`
      SELECT v.grade, s.name AS verified_by, i.return_id, i.accessories_complete, i.battery_safe, i.notes,
             cs.grade AS ai_grade, cs.confidence AS ai_confidence, r.sku, r.organisation_id
      FROM condition_verifications v
      JOIN inspections i ON i.id = v.inspection_id
      JOIN returns r ON r.id = i.return_id
      JOIN staff s ON s.id = v.verified_by
      LEFT JOIN condition_suggestions cs ON cs.id = v.suggestion_id
      WHERE v.id = $1`, [verificationId]);
    if (!v) throw new Error(`Verification ${verificationId} not found`);

    const { rows: [p] } = await c.query("SELECT * FROM products WHERE sku = $1", [v.sku]);
    const { rows: [rs] } = await c.query(
      "SELECT id, version, rules FROM recovery_rule_sets WHERE organisation_id = $1 ORDER BY version DESC LIMIT 1", [v.organisation_id]);

    const product: Product = {
      sku: p.sku, name: p.name, category: p.category, brand: p.brand, msrp: Number(p.msrp), unitCost: Number(p.unit_cost),
      weightKg: Number(p.weight_kg), repairable: p.repairable, avgRepairCost: Number(p.avg_repair_cost), containsBattery: p.contains_battery, gtin: p.gtin,
    };
    const rules: RecoveryRules = { ...rs.rules, version: rs.version, requireVerifiedGrade: true };
    const record = {
      id: v.return_id, sku: v.sku,
      inspection: {
        notes: v.notes, images: [], checklist: { accessoriesComplete: v.accessories_complete, batterySafe: v.battery_safe },
        verifiedGrade: v.grade, verifiedBy: v.verified_by,
        suggestion: v.ai_grade ? { grade: v.ai_grade, confidence: Number(v.ai_confidence), findings: [], summary: "", source: "bedrock", generatedAt: "", advisoryOnly: true } : undefined,
      },
    } as unknown as ReturnRecord;

    const rec = recommend(record, product, rules);
    await c.query(
      `INSERT INTO recommendations (return_id, verification_id, rule_set_id, route, options, rationale, rule_trace, approval_level)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [v.return_id, verificationId, rs.id, rec.route, JSON.stringify(rec.options), rec.rationale, JSON.stringify(rec.ruleTrace), rec.approvalLevel],
    );
    await c.query("UPDATE returns SET stage = 'approval', stage_entered_at = now() WHERE id = $1", [v.return_id]);
    await audit(c, v.return_id, "system", "Rules engine", "Recovery route recommended", { route: rec.route, rulesVersion: rs.version, approvalLevel: rec.approvalLevel });
  });
}
