import { NextResponse } from "next/server";
import { assessConditionBedrock, bedrockEnabled } from "@/lib/ai/bedrock";
import type { Inspection } from "@/lib/domain/types";
import { assessConditionSimulated } from "@/lib/engine/simulated-ai";

export async function POST(req: Request) {
  const body = (await req.json()) as Pick<Inspection, "notes" | "images" | "checklist">;
  const input = { notes: String(body.notes ?? "").slice(0, 8000), images: (body.images ?? []).slice(0, 8), checklist: body.checklist ?? {} };
  if (bedrockEnabled()) {
    try {
      return NextResponse.json(await assessConditionBedrock(input));
    } catch (e) {
      console.error("Bedrock assessment failed; using simulated assessor", e);
    }
  }
  return NextResponse.json(assessConditionSimulated(input));
}
