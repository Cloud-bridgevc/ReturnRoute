// Trigger: EventBridge "RouteApproved" { decisionId }
// Emitted only by the approvals API after an authorised person approves a route.
// Creates the warehouse task and sends it to the WMS. Refunds are NOT executed
// here: the staff refund decision is exported to the retailer's OMS separately.
import type { EventBridgeEvent } from "aws-lambda";
import { ROUTE_TASK } from "../lib/domain/catalog";
import type { RecoveryRoute } from "../lib/domain/types";
import { audit, tx } from "./shared/db";

/** WMS adapter. The only implementation shipped is a SIMULATION. */
async function sendToWms(task: { id: string; type: string; location: string; sku: string }): Promise<string> {
  if (process.env.WMS_MODE !== "simulated") throw new Error("Only the simulated WMS adapter is available in this build");
  console.log("[SIMULATED WMS] task", task);
  return `SIM-WMS-${Math.floor(40000 + Math.random() * 9999)}`;
}

export async function handler(event: EventBridgeEvent<"RouteApproved", { decisionId: string }>) {
  const { decisionId } = event.detail;
  await tx(async (c) => {
    const { rows: [d] } = await c.query(
      `SELECT d.route, d.return_id, d.decided_by, r.sku FROM decisions d JOIN returns r ON r.id = d.return_id WHERE d.id = $1`, [decisionId]);
    if (!d) throw new Error(`Decision ${decisionId} not found`);
    // Idempotency: one task per decision.
    const existing = await c.query("SELECT 1 FROM warehouse_tasks WHERE decision_id = $1", [decisionId]);
    if (existing.rowCount) return;

    const spec = ROUTE_TASK[d.route as RecoveryRoute];
    const id = `WT-${Date.now().toString(36).toUpperCase()}`;
    const wmsRef = await sendToWms({ id, type: spec.type, location: spec.location, sku: d.sku });
    await c.query(
      "INSERT INTO warehouse_tasks (id, decision_id, task_type, location, status, wms_ref) VALUES ($1,$2,$3,$4,'queued',$5)",
      [id, decisionId, spec.type, spec.location, wmsRef],
    );
    await c.query("UPDATE returns SET stage = 'tasked', stage_entered_at = now() WHERE id = $1", [d.return_id]);
    await audit(c, d.return_id, "system", "Simulated WMS", "Warehouse task created", { id, type: spec.type, wmsRef });
  });
}
