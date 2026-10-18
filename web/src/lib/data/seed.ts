// FICTIONAL demonstration data. No real customers, orders, retailers or products.
import { DEFAULT_RULES, PRODUCTS, RETAILERS, ROUTE_TASK, SITES, STAFF, productBySku } from "../domain/catalog";
import type { ConditionGrade, Inspection, ReasonCategory, ReturnRecord, ReturnStage, WarehouseTask } from "../domain/types";
import { recommend } from "../engine/recovery";
import { assessConditionSimulated, classifyReasonSimulated } from "../engine/simulated-ai";

// Timestamps are relative to when the demo is first loaded in the browser.
const H = 3600_000;
let base = Date.now();
const iso = (msAgo: number) => new Date(base - msAgo).toISOString();

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

const REASON_TEXT: Record<ReasonCategory, string[]> = {
  damaged_in_transit: ["Box was crushed and the item arrived damaged.", "Arrived dented on one side, courier left it in the rain.", "Item arrived cracked, packaging looked smashed."],
  defective: ["Stopped working after two days.", "Won't turn on even when charged.", "Makes a buzzing noise and doesn't heat properly.", "Left earcup crackles at any volume."],
  wrong_item: ["Received the wrong colour.", "Not what I ordered — different model in the box."],
  not_as_described: ["Colour is off compared to the photos, looks different.", "Smaller than described on the listing."],
  size_fit: ["Too small across the shoulders.", "Doesn't fit, sizing runs large."],
  changed_mind: ["Changed my mind, no longer need it.", "Found it cheaper elsewhere.", "Unwanted gift."],
  missing_parts: ["Missing the power cable.", "Lid not included in the box."],
  late_delivery: ["Arrived too late for the event."],
};

const GRADE_NOTES: Record<ConditionGrade, string[]> = {
  A_NEW: ["Factory seal intact, unopened. Tags attached."],
  B_OPEN_BOX: ["Packaging opened, all accessories present, no marks. Tried on once, tags removed."],
  C_USED_GOOD: ["Light wear, minor scratch on base. Fully functional."],
  D_DAMAGED_REPAIRABLE: ["Cracked lid hinge, otherwise works.", "Won't turn on — suspect power board. Cosmetically fine.", "Loose switch and dented side panel."],
  E_NOT_REPAIRABLE: ["Housing shattered, water damage inside, corroded contacts."],
  X_UNCERTAIN: ["Slight swelling near battery compartment, set aside."],
};

const CATEGORY_GRADE: Record<ReasonCategory, ConditionGrade[]> = {
  damaged_in_transit: ["D_DAMAGED_REPAIRABLE", "D_DAMAGED_REPAIRABLE", "E_NOT_REPAIRABLE", "C_USED_GOOD"],
  defective: ["D_DAMAGED_REPAIRABLE", "D_DAMAGED_REPAIRABLE", "E_NOT_REPAIRABLE", "X_UNCERTAIN"],
  wrong_item: ["A_NEW", "A_NEW", "B_OPEN_BOX"],
  not_as_described: ["B_OPEN_BOX", "A_NEW"],
  size_fit: ["B_OPEN_BOX", "A_NEW", "C_USED_GOOD"],
  changed_mind: ["A_NEW", "B_OPEN_BOX", "C_USED_GOOD"],
  missing_parts: ["B_OPEN_BOX", "C_USED_GOOD"],
  late_delivery: ["A_NEW"],
};

const STAGE_PLAN: ReturnStage[] = [
  ...Array(5).fill("intake"), ...Array(7).fill("inspection"), ...Array(4).fill("verification"),
  ...Array(5).fill("approval"), ...Array(7).fill("tasked"), ...Array(26).fill("closed"),
];

function makeInspection(sku: string, grade: ConditionGrade, r: () => number, verified: boolean): Inspection {
  const p = productBySku(sku)!;
  const notes = GRADE_NOTES[grade][Math.floor(r() * GRADE_NOTES[grade].length)];
  const inspection: Inspection = {
    inspector: STAFF.inspector[Math.floor(r() * 3)],
    notes,
    checklist: {
      powersOn: grade === "E_NOT_REPAIRABLE" ? false : true,
      accessoriesComplete: true,
      packagingIntact: grade === "A_NEW",
      batterySafe: p.containsBattery ? grade !== "X_UNCERTAIN" : null,
    },
    images: [],
  };
  inspection.suggestion = assessConditionSimulated(inspection);
  // ~1 in 6 historical suggestions were misgraded and corrected by the inspector.
  const NEIGHBOUR: Partial<Record<ConditionGrade, ConditionGrade>> = { B_OPEN_BOX: "C_USED_GOOD", C_USED_GOOD: "B_OPEN_BOX", D_DAMAGED_REPAIRABLE: "C_USED_GOOD", E_NOT_REPAIRABLE: "D_DAMAGED_REPAIRABLE" };
  if (verified && NEIGHBOUR[grade] && r() < 0.18) {
    inspection.suggestion = { ...inspection.suggestion, grade: NEIGHBOUR[grade]!, confidence: 0.58 + Math.round(r() * 12) / 100 };
    inspection.verificationNote = "Inspector override after physical check";
  }
  if (verified) {
    inspection.verifiedGrade = grade;
    inspection.verifiedBy = inspection.inspector;
    inspection.verifiedAt = new Date().toISOString();
  }
  return inspection;
}

function generated(): ReturnRecord[] {
  const r = rng(2417);
  const cats = Object.keys(REASON_TEXT) as ReasonCategory[];
  const weights: Record<ReasonCategory, number> = { damaged_in_transit: 5, defective: 5, wrong_item: 2, not_as_described: 2, size_fit: 3, changed_mind: 4, missing_parts: 1.5, late_delivery: 1 };
  const pickCat = () => {
    const total = cats.reduce((s, c) => s + weights[c], 0);
    let x = r() * total;
    for (const c of cats) { x -= weights[c]; if (x <= 0) return c; }
    return cats[0];
  };
  return STAGE_PLAN.map((stage, i) => {
    const cat = pickCat();
    const product = PRODUCTS[(i * 7 + Math.floor(r() * 3)) % PRODUCTS.length];
    const reasonText = REASON_TEXT[cat][Math.floor(r() * REASON_TEXT[cat].length)];
    const grades = CATEGORY_GRADE[cat];
    const grade = grades[Math.floor(r() * grades.length)];
    const ageH = stage === "closed" ? 30 + r() * 600 : stage === "tasked" ? 10 + r() * 40 : 1 + r() * (stage === "approval" ? 52 : 30);
    const id = `RR-${24100 + i}`;
    const rec: ReturnRecord = {
      id,
      rma: `RMA-${880200 + i * 13}`,
      orderId: `ORD-${(5310000 + i * 977).toString()}`,
      retailer: RETAILERS[i % RETAILERS.length],
      channel: (["web", "marketplace", "store"] as const)[i % 3],
      customerRef: `CUST-${(1000 + i * 37).toString(36).toUpperCase()}`,
      sku: stage === "intake" ? undefined : product.sku,
      scannedBarcode: product.gtin,
      reasonText,
      reason: classifyReasonSimulated(reasonText),
      stage,
      receivedAt: iso(ageH * H),
      stageEnteredAt: iso(ageH * H * (stage === "closed" ? 0.2 : 0.55)),
      site: SITES[i % 2],
      carrier: ["ParcelNorth", "SwiftDrop", "Courierline"][i % 3] + " (fictional)",
      tasks: [],
      audit: [{ at: iso(ageH * H), actor: "System", action: "Return received", detail: "Scanned at returns dock", kind: "system" }],
    };
    if (stage === "inspection") rec.inspection = { notes: "", checklist: {}, images: [] };
    if (["verification", "approval", "tasked", "closed"].includes(stage)) {
      rec.inspection = makeInspection(product.sku, grade, r, stage !== "verification");
    }
    if (["approval", "tasked", "closed"].includes(stage)) {
      rec.recommendation = recommend(rec, product, DEFAULT_RULES);
    }
    if (["tasked", "closed"].includes(stage) && rec.recommendation) {
      const route = rec.recommendation.route;
      const decider = rec.recommendation.approvalLevel === "supervisor" ? STAFF.supervisor[0] : rec.inspection!.inspector!;
      rec.decision = { route, decidedBy: decider, role: rec.recommendation.approvalLevel, decidedAt: iso(ageH * H * 0.5), overridden: false, refundDecision: cat === "changed_mind" ? "partial" : "approved" };
      const t: WarehouseTask = {
        id: `WT-${7700 + i}`, returnId: id, type: ROUTE_TASK[route].type, location: ROUTE_TASK[route].location,
        assignee: STAFF.associate[i % 2], status: stage === "closed" ? "done" : i % 2 ? "in_progress" : "queued",
        createdAt: iso(ageH * H * 0.5), completedAt: stage === "closed" ? iso(ageH * H * 0.2) : undefined, wmsRef: `SIM-WMS-${40000 + i}`,
      };
      rec.tasks = [t];
      if (stage === "closed") {
        const opt = rec.recommendation.options.find((o) => o.route === route)!;
        rec.realisedValue = Math.round(opt.netValue * (0.88 + r() * 0.2) * 100) / 100;
      }
    }
    return rec;
  });
}

/** Hand-crafted showcase records used in the walkthrough and public demo. */
function showcase(): ReturnRecord[] {
  const kettle: ReturnRecord = {
    id: "RR-24017",
    rma: "RMA-880117",
    orderId: "ORD-5309912",
    retailer: "Fernbrook Home",
    channel: "web",
    customerRef: "CUST-7Q2K",
    sku: "NB-KTL-220",
    serial: "NBK22-0048813",
    scannedBarcode: "5060000100221",
    reasonText: "Box was crushed when it arrived and the kettle has a dent in the base. The lid hinge is cracked so it won't close.",
    stage: "verification",
    receivedAt: iso(26 * H),
    stageEnteredAt: iso(2.5 * H),
    site: SITES[0],
    carrier: "ParcelNorth (fictional)",
    tasks: [],
    audit: [
      { at: iso(26 * H), actor: "System", action: "Return received", detail: "Scanned at Leeds DC returns dock 2", kind: "system" },
      { at: iso(25.8 * H), actor: "Priya Natarajan", action: "Product identified", detail: "GTIN 5060000100221 matched to NB-KTL-220", kind: "human" },
      { at: iso(25.8 * H), actor: "ReturnRoute AI (simulated)", action: "Reason classified", detail: "Damaged in transit", kind: "ai" },
      { at: iso(2.6 * H), actor: "Ama Mensah", action: "Inspection submitted", detail: "Notes + 2 images", kind: "human" },
      { at: iso(2.5 * H), actor: "ReturnRoute AI (simulated)", action: "Condition suggested", detail: "Advisory only — awaiting inspector verification", kind: "ai" },
    ],
    inspection: {
      inspector: "Ama Mensah",
      notes: "Outer carton crushed on one corner. 12mm dent on base rim, kettle still heats and holds water with no leak. Lid hinge cracked — lid won't latch. Filter and base station present.",
      checklist: { powersOn: true, accessoriesComplete: true, packagingIntact: false, batterySafe: null },
      images: [
        { id: "img-1", label: "Base rim dent", uri: "s3://returnroute-demo-media/returns/RR-24017/base-dent.jpg", previewUrl: "/demo/kettle-dent.svg", observations: ["dented lower rim, approx 12mm", "no scorch or burn marks visible"] },
        { id: "img-2", label: "Lid hinge", uri: "s3://returnroute-demo-media/returns/RR-24017/lid-hinge.jpg", previewUrl: "/demo/kettle-hinge.svg", observations: ["cracked hinge on lid assembly", "lid does not sit flush"] },
      ],
    },
  };
  kettle.reason = classifyReasonSimulated(kettle.reasonText);
  kettle.inspection!.suggestion = assessConditionSimulated(kettle.inspection!);

  const headphones: ReturnRecord = {
    id: "RR-24021",
    rma: "RMA-880121",
    orderId: "ORD-5310044",
    retailer: "Volta Electronics",
    channel: "marketplace",
    customerRef: "CUST-3MZA",
    sku: "HX-ANC-700",
    serial: "HX700-22-91734",
    scannedBarcode: "5060000100702",
    reasonText: "Left earcup crackles and the case feels warm when charging.",
    stage: "verification",
    receivedAt: iso(20 * H),
    stageEnteredAt: iso(4 * H),
    site: SITES[0],
    carrier: "SwiftDrop (fictional)",
    tasks: [],
    audit: [{ at: iso(20 * H), actor: "System", action: "Return received", kind: "system" }],
    inspection: {
      inspector: "Luis Ferreira",
      notes: "Crackle confirmed on left driver. Slight swelling visible around right earcup battery seam — set aside.",
      checklist: { powersOn: true, accessoriesComplete: true, packagingIntact: false, batterySafe: false },
      images: [{ id: "img-3", label: "Right earcup seam", uri: "s3://returnroute-demo-media/returns/RR-24021/seam.jpg", previewUrl: "/demo/headphones.svg", observations: ["seam separation, possible battery swelling"] }],
    },
  };
  headphones.reason = classifyReasonSimulated(headphones.reasonText);
  headphones.inspection!.suggestion = assessConditionSimulated(headphones.inspection!);

  const lamp: ReturnRecord = {
    id: "RR-24019",
    rma: "RMA-880119",
    orderId: "ORD-5309977",
    retailer: "Marlow & Pike",
    channel: "web",
    customerRef: "CUST-9PLD",
    scannedBarcode: "5060000100029",
    reasonText: "Arrived damaged — the shade is cracked.",
    stage: "intake",
    receivedAt: iso(1.2 * H),
    stageEnteredAt: iso(1.2 * H),
    site: SITES[1],
    carrier: "Courierline (fictional)",
    tasks: [],
    audit: [{ at: iso(1.2 * H), actor: "System", action: "Return received", kind: "system" }],
  };
  return [kettle, headphones, lamp];
}

export function buildSeed(): ReturnRecord[] {
  base = Date.now();
  return [...showcase(), ...generated()].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
}
