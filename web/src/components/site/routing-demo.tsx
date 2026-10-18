"use client";
import { useMemo, useState } from "react";
import { ArrowRight, Camera, ClipboardCheck, Cpu, FlaskConical, RotateCcw, ScanLine, ShieldCheck, Sparkles, UserCheck } from "lucide-react";
import { DEFAULT_RULES, GRADES, GRADE_LABELS, REASON_LABELS, ROUTE_LABELS, gbp, productBySku } from "@/lib/domain/catalog";
import type { ConditionGrade, ConditionSuggestion, Inspection, ReturnRecord } from "@/lib/domain/types";
import { recommend } from "@/lib/engine/recovery";
import { assessConditionSimulated, classifyReasonSimulated } from "@/lib/engine/simulated-ai";
import { Explanation, RuleTrace, ValueComparison } from "../recommendation";
import { Confidence, GradeBadge, cx } from "../ui";

interface Scenario { key: string; title: string; sku: string; reason: string; inspection: Pick<Inspection, "notes" | "checklist" | "images">; img: string }

const SCENARIOS: Scenario[] = [
  {
    key: "kettle", title: "Dented kettle", sku: "NB-KTL-220", img: "/demo/kettle-dent.svg",
    reason: "Box was crushed when it arrived and the kettle has a dent in the base. The lid hinge is cracked so it won't close.",
    inspection: {
      notes: "Outer carton crushed. 12mm dent on base rim, heats normally, no leak. Lid hinge cracked — lid won't latch. All accessories present.",
      checklist: { powersOn: true, accessoriesComplete: true, packagingIntact: false, batterySafe: null },
      images: [{ id: "d1", label: "Base rim", uri: "demo", observations: ["dented lower rim", "cracked hinge on lid assembly"] }],
    },
  },
  {
    key: "headphones", title: "Headphones, battery concern", sku: "HX-ANC-700", img: "/demo/headphones.svg",
    reason: "Left earcup crackles and the case feels warm when charging.",
    inspection: {
      notes: "Crackle confirmed on left driver. Slight swelling visible around right earcup battery seam.",
      checklist: { powersOn: true, accessoriesComplete: true, packagingIntact: false, batterySafe: false },
      images: [{ id: "d2", label: "Earcup seam", uri: "demo", observations: ["seam separation, possible battery swelling"] }],
    },
  },
  {
    key: "jacket", title: "Jacket, tried on", sku: "TR-JKT-M-NV", img: "/demo/jacket.svg",
    reason: "Too small across the shoulders.",
    inspection: {
      notes: "Tried on, tags removed but included in bag. No marks, odours or wear.",
      checklist: { powersOn: null, accessoriesComplete: true, packagingIntact: false, batterySafe: null },
      images: [{ id: "d3", label: "Front", uri: "demo", observations: ["no visible wear", "tags removed"] }],
    },
  },
  {
    key: "blender", title: "Sealed blender", sku: "VK-BLD-900", img: "/demo/blender.svg",
    reason: "Changed my mind, no longer need it.",
    inspection: {
      notes: "Factory seal intact, unopened outer box. Pristine.",
      checklist: { powersOn: null, accessoriesComplete: true, packagingIntact: true, batterySafe: null },
      images: [{ id: "d4", label: "Box", uri: "demo", observations: ["factory wrap intact"] }],
    },
  },
];

type Step = 0 | 1 | 2 | 3;

export function RoutingDemo() {
  const [key, setKey] = useState(SCENARIOS[0].key);
  const [step, setStep] = useState<Step>(0);
  const [suggestion, setSuggestion] = useState<ConditionSuggestion | null>(null);
  const [grade, setGrade] = useState<ConditionGrade | null>(null);
  const [verified, setVerified] = useState(false);
  const sc = SCENARIOS.find((s) => s.key === key)!;
  const product = productBySku(sc.sku)!;
  const reason = useMemo(() => classifyReasonSimulated(sc.reason), [sc]);

  const pick = (k: string) => { setKey(k); setStep(0); setSuggestion(null); setGrade(null); setVerified(false); };

  const runAi = () => {
    const s = assessConditionSimulated(sc.inspection);
    setSuggestion(s); setGrade(s.grade); setStep(2);
  };

  const rec = useMemo(() => {
    if (!suggestion) return null;
    const record: ReturnRecord = {
      id: "DEMO", rma: "", orderId: "", retailer: "", channel: "web", customerRef: "", reasonText: sc.reason, stage: "approval",
      receivedAt: "", stageEnteredAt: "", site: "", tasks: [], audit: [], sku: sc.sku,
      inspection: { ...sc.inspection, suggestion, verifiedGrade: verified ? grade ?? undefined : undefined, verifiedBy: verified ? "Demo inspector" : undefined },
    };
    return recommend(record, product, DEFAULT_RULES);
  }, [suggestion, verified, grade, sc, product]);

  const steps = [
    { icon: ScanLine, label: "Intake & ID" },
    { icon: Cpu, label: "AI inspection" },
    { icon: UserCheck, label: "Human verifies" },
    { icon: ClipboardCheck, label: "Route & explain" },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-navy-700 bg-navy-900 text-white shadow-2xl shadow-navy-950/40">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy-700 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Fictional return scenarios">
          {SCENARIOS.map((s) => (
            <button key={s.key} role="tab" aria-selected={s.key === key} onClick={() => pick(s.key)}
              className={cx("rounded-full px-3 py-1 text-xs font-medium transition", s.key === key ? "bg-teal-500 text-navy-950" : "bg-navy-800 text-navy-300 hover:text-white")}>
              {s.title}
            </button>
          ))}
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-signal-500/15 px-2 py-0.5 text-[11px] font-medium text-signal-400">
          <FlaskConical className="h-3 w-3" /> Fictional data · simulated AI
        </span>
      </div>

      <ol className="grid grid-cols-4 border-b border-navy-700 text-[11px] sm:text-xs">
        {steps.map((s, i) => (
          <li key={s.label} className={cx("flex items-center justify-center gap-1.5 px-1 py-2.5 text-center", i <= step ? "text-teal-300" : "text-navy-300/60")}>
            <s.icon className="hidden h-3.5 w-3.5 sm:block" /> {s.label}
          </li>
        ))}
      </ol>

      <div className="grid gap-0 lg:grid-cols-[1fr_1.15fr]">
        {/* Left: the return */}
        <div className="space-y-4 border-b border-navy-700 p-4 sm:p-6 lg:border-b-0 lg:border-r">
          <div className="flex gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sc.img} alt={`Fictional illustration: ${sc.title}`} className="h-24 w-24 shrink-0 rounded-lg bg-navy-800 object-cover" />
            <div className="min-w-0">
              <div className="font-mono text-[11px] text-navy-300">{product.sku} · GTIN {product.gtin}</div>
              <div className="font-semibold">{product.name}</div>
              <div className="text-xs text-navy-300">{product.brand} (fictional) · MSRP {gbp(product.msrp)}{product.containsBattery ? " · Li-ion battery" : ""}</div>
            </div>
          </div>
          <div className="rounded-lg bg-navy-800/70 p-3 text-sm">
            <div className="mb-1 text-[11px] uppercase tracking-wide text-navy-300">Customer reason</div>
            <p className="text-white/90">“{sc.reason}”</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 text-teal-300"><Sparkles className="h-3 w-3" /> {REASON_LABELS[reason.category]}</span>
              <span className="text-navy-300">{Math.round(reason.confidence * 100)}% · {reason.signals.join(", ")}</span>
            </div>
          </div>
          <div className="rounded-lg bg-navy-800/70 p-3 text-sm">
            <div className="mb-1 flex items-center gap-1 text-[11px] uppercase tracking-wide text-navy-300"><Camera className="h-3 w-3" /> Inspector notes & image observations</div>
            <p className="text-white/90">{sc.inspection.notes}</p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {sc.inspection.images.flatMap((i) => i.observations ?? []).map((o) => (
                <li key={o} className="rounded bg-navy-700 px-1.5 py-0.5 text-[11px] text-navy-300">{o}</li>
              ))}
            </ul>
          </div>
          {step === 0 && (
            <button onClick={() => { setStep(1); runAi(); }} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-semibold text-navy-950 hover:bg-teal-400">
              Run AI inspection <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Right: AI → human → route */}
        <div className="space-y-4 p-4 sm:p-6">
          {!suggestion && (
            <div className="flex h-full min-h-48 flex-col items-center justify-center gap-2 text-center text-sm text-navy-300">
              <Cpu className="h-8 w-8 text-navy-600" />
              Run the AI inspection to see a suggested condition grade and how the rules engine responds.
            </div>
          )}
          {suggestion && (
            <>
              <div className="rounded-lg border border-navy-700 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-teal-300"><Sparkles className="h-3.5 w-3.5" /> AI condition suggestion (advisory)</span>
                  <span className="[&_span]:text-navy-300"><Confidence value={suggestion.confidence} threshold={DEFAULT_RULES.minSuggestionConfidence} /></span>
                </div>
                <GradeBadge grade={suggestion.grade} />
                <ul className="mt-2 space-y-0.5 text-xs text-navy-300">
                  {suggestion.findings.slice(0, 3).map((f) => <li key={f}>• {f}</li>)}
                </ul>
              </div>

              <div className={cx("rounded-lg border p-3", verified ? "border-teal-500/50 bg-teal-500/5" : "border-signal-500/50 bg-signal-500/5")}>
                <div className="mb-2 flex items-center gap-1 text-xs font-medium">
                  <ShieldCheck className={cx("h-3.5 w-3.5", verified ? "text-teal-300" : "text-signal-400")} />
                  {verified ? <span className="text-teal-300">Grade verified by inspector</span> : <span className="text-signal-400">Human verification required</span>}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <select aria-label="Inspector grade" value={grade ?? ""} disabled={verified} onChange={(e) => setGrade(e.target.value as ConditionGrade)}
                    className="flex-1 rounded-md border border-navy-600 bg-navy-800 px-2 py-1.5 text-sm text-white disabled:opacity-70">
                    {GRADES.map((g) => <option key={g} value={g}>{GRADE_LABELS[g]}</option>)}
                  </select>
                  {!verified ? (
                    <button onClick={() => { setVerified(true); setStep(3); }} className="rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-navy-900 hover:bg-slate-100">Confirm grade</button>
                  ) : (
                    <button onClick={() => { setVerified(false); setStep(2); }} className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-navy-300 hover:text-white"><RotateCcw className="h-3.5 w-3.5" /> Re-grade</button>
                  )}
                </div>
                {!verified && <p className="mt-2 text-xs text-navy-300">Until a person confirms the grade, the engine holds the item at <b className="text-white">{ROUTE_LABELS.FURTHER_INSPECTION}</b> — an AI image classification can’t move stock, authorise a refund or dispose of a product.</p>}
              </div>

              {rec && (
                <div className="rounded-lg bg-white p-4 text-navy-900">
                  <Explanation rec={rec} />
                  <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Recovery value by route</div>
                  <div className="mt-2"><ValueComparison options={rec.options} chosen={rec.route} compact /></div>
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs font-medium text-slate-500">Rule trace ({rec.ruleTrace.length} checks)</summary>
                    <div className="mt-2"><RuleTrace trace={rec.ruleTrace} /></div>
                  </details>
                  <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">Next: a {rec.approvalLevel} reviews and approves, then a warehouse task is created. The refund decision stays with your staff.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
