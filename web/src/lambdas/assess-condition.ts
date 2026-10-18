// Trigger: EventBridge "InspectionSubmitted" { inspectionId }
// Produces an ADVISORY condition suggestion from notes + S3 images, then moves
// the return to 'verification'. It never sets a verified grade or a route.
import type { EventBridgeEvent } from "aws-lambda";
import { assessConditionBedrock, bedrockEnabled } from "../lib/ai/bedrock-core";
import type { ImageAsset, Inspection } from "../lib/domain/types";
import { assessConditionSimulated } from "../lib/engine/simulated-ai";
import { audit, tx } from "./shared/db";

export async function handler(event: EventBridgeEvent<"InspectionSubmitted", { inspectionId: string }>) {
  const { inspectionId } = event.detail;
  await tx(async (c) => {
    const { rows: [i] } = await c.query(
      "SELECT return_id, notes, powers_on, accessories_complete, packaging_intact, battery_safe FROM inspections WHERE id = $1", [inspectionId]);
    if (!i) throw new Error(`Inspection ${inspectionId} not found`);
    const { rows: media } = await c.query("SELECT id, s3_bucket, s3_key, label FROM inspection_media WHERE inspection_id = $1", [inspectionId]);
    const input: Pick<Inspection, "notes" | "images" | "checklist"> = {
      notes: i.notes,
      checklist: { powersOn: i.powers_on, accessoriesComplete: i.accessories_complete, packagingIntact: i.packaging_intact, batterySafe: i.battery_safe },
      images: media.map((m): ImageAsset => ({ id: m.id, label: m.label ?? "", uri: `s3://${m.s3_bucket}/${m.s3_key}` })),
    };
    let s;
    try {
      s = bedrockEnabled() ? await assessConditionBedrock(input) : assessConditionSimulated(input);
    } catch (e) {
      console.error("Bedrock assessment failed, using simulated assessor", e);
      s = assessConditionSimulated(input);
    }
    await c.query(
      "INSERT INTO condition_suggestions (inspection_id, grade, confidence, findings, summary, source, model_id) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [inspectionId, s.grade, s.confidence, s.findings, s.summary, s.source, s.source === "bedrock" ? process.env.BEDROCK_MODEL_ID : null],
    );
    await c.query("UPDATE returns SET stage = 'verification', stage_entered_at = now() WHERE id = $1", [i.return_id]);
    await audit(c, i.return_id, "ai", `ReturnRoute AI (${s.source})`, "Condition suggested — advisory, awaiting verification", { grade: s.grade, confidence: s.confidence });
  });
}
