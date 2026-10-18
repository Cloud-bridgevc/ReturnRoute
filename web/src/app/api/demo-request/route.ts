import { NextResponse } from "next/server";
import { z } from "zod";

const DemoRequest = z.object({
  name: z.string().min(2).max(120),
  email: z.email(),
  company: z.string().min(2).max(160),
  companyType: z.enum(["retailer", "3pl", "marketplace", "other"]),
  monthlyReturns: z.enum(["<1k", "1k-10k", "10k-50k", "50k+"]),
  message: z.string().max(2000).optional(),
});

// In production this posts to the HubSpot Forms API (see docs/HUBSPOT.md), which
// creates/updates the Contact + Company and enrols them in the demo workflow.
// Here it only validates and acknowledges — nothing is sent anywhere.
export async function POST(req: Request) {
  const parsed = DemoRequest.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ ok: false, issues: parsed.error.issues.map((i) => i.path.join(".")) }, { status: 400 });
  const lifecycle = parsed.data.companyType === "3pl" ? "Fulfilment provider" : "Retailer";
  return NextResponse.json({
    ok: true,
    simulated: true,
    crm: { pipeline: "New Business", stage: "Demo requested", segment: lifecycle, note: "Simulated — HubSpot not connected in this demo" },
  });
}
