// Trigger: EventBridge "ReturnLogged" { returnId }
// Classifies the customer's free-text reason. Output is analytical only.
import type { EventBridgeEvent } from "aws-lambda";
import { bedrockEnabled, classifyReasonBedrock } from "../lib/ai/bedrock-core";
import { classifyReasonSimulated } from "../lib/engine/simulated-ai";
import { audit, tx } from "./shared/db";

export async function handler(event: EventBridgeEvent<"ReturnLogged", { returnId: string }>) {
  const { returnId } = event.detail;
  await tx(async (c) => {
    const { rows } = await c.query<{ reason_text: string }>("SELECT reason_text FROM returns WHERE id = $1", [returnId]);
    if (!rows[0]) throw new Error(`Return ${returnId} not found`);
    let result;
    try {
      result = bedrockEnabled() ? await classifyReasonBedrock(rows[0].reason_text) : classifyReasonSimulated(rows[0].reason_text);
    } catch (e) {
      console.error("Bedrock classification failed, using simulated classifier", e);
      result = classifyReasonSimulated(rows[0].reason_text);
    }
    await c.query(
      "INSERT INTO reason_classifications (return_id, category, confidence, signals, source, model_id) VALUES ($1,$2,$3,$4,$5,$6)",
      [returnId, result.category, result.confidence, result.signals, result.source, result.source === "bedrock" ? process.env.BEDROCK_MODEL_ID : null],
    );
    await audit(c, returnId, "ai", `ReturnRoute AI (${result.source})`, "Reason classified", result);
  });
}
