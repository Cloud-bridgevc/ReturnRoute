import { NextResponse } from "next/server";
import { bedrockEnabled, classifyReasonBedrock } from "@/lib/ai/bedrock";
import { classifyReasonSimulated } from "@/lib/engine/simulated-ai";

export async function POST(req: Request) {
  const { text } = (await req.json()) as { text?: string };
  if (!text || text.length > 4000) return NextResponse.json({ error: "text required (max 4000 chars)" }, { status: 400 });
  if (bedrockEnabled()) {
    try {
      return NextResponse.json(await classifyReasonBedrock(text));
    } catch (e) {
      console.error("Bedrock classification failed; using simulated classifier", e);
    }
  }
  return NextResponse.json(classifyReasonSimulated(text));
}
