// Deterministic stand-ins for the Bedrock classifiers. Used in the demo and as
// a fallback when Bedrock is not configured. Outputs are ADVISORY ONLY.
import type { ConditionGrade, ConditionSuggestion, Inspection, ReasonCategory, ReasonClassification } from "../domain/types";

const REASON_PATTERNS: [ReasonCategory, RegExp[]][] = [
  ["damaged_in_transit", [/arriv\w* (damaged|broken|cracked|dented)/i, /box (was )?(crushed|damaged|wet)/i, /courier|transit|shipping damage/i, /dent(ed)?/i, /smashed/i]],
  ["defective", [/(stopped|doesn'?t|does not|won'?t|not) (work|turn on|charge|heat|power)/i, /fault(y)?|defect|broken after|crackl|buzz|leak/i, /dead pixel|error code/i]],
  ["wrong_item", [/wrong (item|colou?r|size|model)/i, /not what i ordered|different (item|product)/i, /received (a|the) wrong/i]],
  ["missing_parts", [/missing|not included|no (charger|cable|lid|screws)/i, /incomplete/i]],
  ["not_as_described", [/not as (described|pictured|shown)/i, /(looks|looked) different|colou?r is off|smaller than/i, /misleading/i]],
  ["size_fit", [/too (small|big|large|tight|loose|long|short)/i, /(doesn'?t|does not) fit|sizing/i]],
  ["late_delivery", [/(arrived|came) (too )?late|after the (event|date)|delayed/i]],
  ["changed_mind", [/changed my mind|no longer (need|want)|don'?t need|found (it )?cheaper|gift/i]],
];

export function classifyReasonSimulated(text: string): ReasonClassification {
  const scores = REASON_PATTERNS.map(([cat, pats]) => {
    const hits = pats.filter((p) => p.test(text)).map((p) => text.match(p)?.[0] ?? "");
    return { cat, hits };
  }).filter((s) => s.hits.length > 0);
  if (scores.length === 0) {
    return { category: "changed_mind", confidence: 0.41, signals: ["No strong signal; defaulted"], source: "simulated" };
  }
  scores.sort((a, b) => b.hits.length - a.hits.length);
  const top = scores[0];
  const competing = scores.length > 1 ? 0.12 : 0;
  const confidence = Math.min(0.96, 0.68 + top.hits.length * 0.11 - competing);
  return {
    category: top.cat,
    confidence: Number(confidence.toFixed(2)),
    signals: top.hits.map((h) => `“${h.trim()}”`),
    source: "simulated",
  };
}

const GRADE_SIGNALS: { grade: ConditionGrade; weight: number; re: RegExp; finding: string }[] = [
  { grade: "X_UNCERTAIN", weight: 4, re: /swell|swollen|bulg|scorch|burn(t|ing)? (smell|mark)|leak(ing)? (fluid|battery)|smok/i, finding: "Possible battery or electrical hazard" },
  { grade: "E_NOT_REPAIRABLE", weight: 3, re: /shatter|snapped|crushed (beyond|completely)|water damage|corroded|beyond repair|frame (bent|broken)/i, finding: "Structural damage likely beyond economic repair" },
  { grade: "D_DAMAGED_REPAIRABLE", weight: 2.4, re: /crack(ed)?|dent(ed)?|loose|hinge|no power|won'?t (turn on|power)|doesn'?t heat|broken (switch|clip|knob|lid|cable|strap)|torn (earpad|cushion)|rattl|seal (worn|broken)|dead pixels?|won'?t charge|stopped working|crackl|no sound|faulty/i, finding: "Localised damage to a replaceable component" },
  { grade: "C_USED_GOOD", weight: 1.6, re: /scuff|light (wear|scratch)|minor (mark|scratch)|used|worn sole|creas/i, finding: "Cosmetic wear consistent with light use" },
  { grade: "B_OPEN_BOX", weight: 1.4, re: /\bopened\b|seal broken|tags? (removed|off)|packaging (opened|torn)|tried on/i, finding: "Opened but complete, no visible wear" },
  { grade: "A_NEW", weight: 1.4, re: /sealed|unopened|tags? attached|factory (seal|wrap)|pristine|as new/i, finding: "Factory seal intact / unused" },
];

export function assessConditionSimulated(insp: Pick<Inspection, "notes" | "images" | "checklist">): ConditionSuggestion {
  const corpus = [insp.notes, ...insp.images.flatMap((i) => i.observations ?? [])].join(" \n ");
  const tally = new Map<ConditionGrade, number>();
  const findings: string[] = [];
  // Ignore matches negated within the same clause, e.g. "no scorch or burn marks".
  const affirmed = (re: RegExp) => {
    for (const m of corpus.matchAll(new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g"))) {
      const clause = corpus.slice(0, m.index).split(/[.;,\n]/).pop() ?? "";
      if (!/\b(no|not|without|nor|never|free of)\b[^.;,\n]*$/i.test(clause)) return m;
    }
    return null;
  };
  for (const s of GRADE_SIGNALS) {
    const m = affirmed(s.re);
    if (m) {
      tally.set(s.grade, (tally.get(s.grade) ?? 0) + s.weight);
      findings.push(`${s.finding} (signal: “${m[0]}”)`);
    }
  }
  if (insp.checklist.batterySafe === false) {
    tally.set("X_UNCERTAIN", (tally.get("X_UNCERTAIN") ?? 0) + 5);
    findings.push("Inspector checklist: battery not confirmed safe");
  }
  if (insp.checklist.powersOn === false) {
    tally.set("D_DAMAGED_REPAIRABLE", (tally.get("D_DAMAGED_REPAIRABLE") ?? 0) + 1.5);
    findings.push("Inspector checklist: unit does not power on");
  }
  if (insp.checklist.accessoriesComplete === false) findings.push("Accessories incomplete — affects resale value");

  let grade: ConditionGrade = "X_UNCERTAIN";
  let confidence = 0.45;
  if (tally.size > 0) {
    const ranked = [...tally.entries()].sort((a, b) => b[1] - a[1]);
    grade = ranked[0][0];
    const margin = ranked.length > 1 ? ranked[0][1] - ranked[1][1] : ranked[0][1];
    confidence = Math.min(0.95, 0.55 + margin * 0.1 + (insp.images.length > 0 ? 0.06 : 0));
  } else {
    findings.push("Insufficient evidence in notes or images to grade");
  }
  const summary =
    grade === "X_UNCERTAIN"
      ? "Evidence is insufficient or indicates a potential hazard. Recommend specialist inspection before any recovery decision."
      : `Evidence most consistent with grade ${grade.slice(0, 1)}. ${findings[0] ?? ""}. Inspector must confirm before this is used.`;
  return {
    grade,
    confidence: Number(confidence.toFixed(2)),
    findings,
    summary,
    source: "simulated",
    generatedAt: new Date().toISOString(),
    advisoryOnly: true,
  };
}
