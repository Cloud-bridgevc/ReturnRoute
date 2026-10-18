"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { AlertTriangle, ArrowLeft, Camera, Check, Cog, ImagePlus, Lock, Sparkles, Truck, User } from "lucide-react";
import { PageHeader, useApp } from "@/components/app/shell";
import { Explanation, RuleTrace, ValueComparison } from "@/components/recommendation";
import {
  AiBadge, Badge, Button, Card, Confidence, GradeBadge, HumanGate, RouteBadge, SimulatedTag, StageBadge, cx, inputCls, labelCls, timeAgo,
} from "@/components/ui";
import { GRADES, GRADE_LABELS, PRODUCTS, REASON_LABELS, ROUTE_LABELS, STAGE_LABELS, gbp, productByGtin, productBySku } from "@/lib/domain/catalog";
import type { ConditionGrade, Decision, ImageAsset, Inspection, RecoveryRoute, ReturnRecord, ReturnStage } from "@/lib/domain/types";
import { canApprove } from "@/lib/engine/recovery";

const FLOW: ReturnStage[] = ["intake", "inspection", "verification", "approval", "tasked", "closed"];

function Stepper({ stage }: { stage: ReturnStage }) {
  const idx = FLOW.indexOf(stage);
  return (
    <ol className="mb-6 grid grid-cols-3 gap-2 sm:grid-cols-6">
      {FLOW.map((s, i) => (
        <li key={s} className={cx("rounded-lg border px-3 py-2 text-xs", i < idx ? "border-teal-200 bg-teal-50 text-teal-800" : i === idx ? "border-signal-500/50 bg-signal-100 font-semibold text-signal-700" : "border-slate-200 bg-white text-slate-400")}>
          <span className="mr-1 font-mono">{i + 1}</span>{STAGE_LABELS[s]}
        </li>
      ))}
    </ol>
  );
}

function Field({ k, v }: { k: string; v: React.ReactNode }) {
  return <div><dt className="text-xs text-slate-500">{k}</dt><dd className="text-sm text-navy-900">{v}</dd></div>;
}

function ReturnDetails({ r }: { r: ReturnRecord }) {
  return (
    <Card title="Return details">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        <Field k="RMA" v={<span className="font-mono">{r.rma}</span>} />
        <Field k="Order" v={<span className="font-mono">{r.orderId}</span>} />
        <Field k="Customer" v={<span className="font-mono">{r.customerRef}</span>} />
        <Field k="Retailer" v={r.retailer} />
        <Field k="Channel" v={r.channel} />
        <Field k="Site" v={r.site} />
        <Field k="Carrier" v={r.carrier ?? "—"} />
        <Field k="Received" v={timeAgo(r.receivedAt)} />
        <Field k="Barcode" v={<span className="font-mono">{r.scannedBarcode ?? "—"}</span>} />
      </dl>
      <div className="mt-4 rounded-lg bg-slate-50 p-3">
        <div className="text-xs text-slate-500">Customer’s reason</div>
        <p className="mt-0.5 text-sm text-navy-900">“{r.reasonText}”</p>
        {r.reason && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <AiBadge source={r.reason.source} />
            <Badge tone="teal">{REASON_LABELS[r.reason.category]}</Badge>
            <Confidence value={r.reason.confidence} />
            <span className="text-xs text-slate-500">{r.reason.signals.join(" · ")}</span>
          </div>
        )}
      </div>
    </Card>
  );
}

function Identification({ r }: { r: ReturnRecord }) {
  const { state, identifyProduct } = useApp();
  const match = productByGtin(r.scannedBarcode);
  const [sku, setSku] = useState(r.sku ?? match?.sku ?? "");
  const [serial, setSerial] = useState(r.serial ?? "");
  const p = productBySku(r.sku);
  if (r.stage !== "intake" && p) {
    return (
      <Card title="Product identification" action={<Badge tone="green"><Check className="h-3 w-3" /> Confirmed</Badge>}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-semibold text-navy-900">{p.name}</div>
            <div className="font-mono text-xs text-slate-500">{p.sku} · GTIN {p.gtin}{r.serial ? ` · S/N ${r.serial}` : ""}</div>
            <div className="mt-1 text-xs text-slate-500">{p.category} · {p.brand} (fictional)</div>
          </div>
          <div className="text-right text-xs text-slate-500">
            <div>MSRP <b className="text-navy-900">{gbp(p.msrp)}</b></div>
            <div>Unit cost {gbp(p.unitCost)} · {p.weightKg}kg</div>
            <div>{p.repairable ? "Repairable line" : "Not repairable"}{p.containsBattery ? " · Li-ion" : ""}</div>
          </div>
        </div>
      </Card>
    );
  }
  return (
    <Card title="Product identification">
      {match ? <p className="mb-3 text-sm text-slate-600">Barcode <span className="font-mono">{r.scannedBarcode}</span> matches <b>{match.name}</b>. Confirm it against the physical item.</p>
        : <p className="mb-3 text-sm text-signal-700">No catalogue match for the scanned barcode. Identify the product manually.</p>}
      <div className="grid gap-3 sm:grid-cols-[1fr_200px_auto] sm:items-end">
        <div><label className={labelCls} htmlFor="sku">Product (SKU)</label>
          <select id="sku" className={inputCls} value={sku} onChange={(e) => setSku(e.target.value)}>
            <option value="">Select product…</option>
            {PRODUCTS.map((x) => <option key={x.sku} value={x.sku}>{x.sku} — {x.name}</option>)}
          </select>
        </div>
        <div><label className={labelCls} htmlFor="serial">Serial number</label><input id="serial" className={inputCls} value={serial} onChange={(e) => setSerial(e.target.value)} placeholder="Optional" /></div>
        <Button disabled={!sku} onClick={() => identifyProduct(r.id, sku, serial, state.user.name)}>Confirm & send to inspection</Button>
      </div>
    </Card>
  );
}

async function downscale(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
  const scale = Math.min(1, 480 / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(url);
  return c.toDataURL("image/jpeg", 0.75);
}

type Tri = boolean | null | undefined;
function TriState({ label, value, onChange }: { label: string; value: Tri; onChange: (v: Tri) => void }) {
  const opts: [string, Tri][] = [["Yes", true], ["No", false], ["N/A", null]];
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-slate-700">{label}</span>
      <div className="flex overflow-hidden rounded-md ring-1 ring-slate-300">
        {opts.map(([l, v]) => (
          <button key={l} type="button" onClick={() => onChange(v)} aria-pressed={value === v}
            className={cx("px-2.5 py-1 text-xs", value === v ? (v === false ? "bg-signal-500 text-white" : "bg-navy-900 text-white") : "bg-white text-slate-600 hover:bg-slate-50")}>{l}</button>
        ))}
      </div>
    </div>
  );
}

function Images({ images }: { images: ImageAsset[] }) {
  if (!images.length) return <p className="text-xs text-slate-500">No images attached.</p>;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {images.map((i) => (
        <figure key={i.id} className="overflow-hidden rounded-lg border border-slate-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {i.previewUrl ? <img src={i.previewUrl} alt={i.label} className="aspect-square w-full bg-navy-800 object-cover" /> : <div className="flex aspect-square items-center justify-center bg-slate-100"><Camera className="h-6 w-6 text-slate-400" /></div>}
          <figcaption className="p-2 text-xs">
            <div className="font-medium text-navy-900">{i.label}</div>
            <div className="truncate font-mono text-[10px] text-slate-400" title={i.uri}>{i.uri}</div>
            {i.observations?.length ? <div className="mt-1 text-[11px] text-slate-500">{i.observations.join("; ")}</div> : null}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

function InspectionPanel({ r }: { r: ReturnRecord }) {
  const { state, submitInspection } = useApp();
  const p = productBySku(r.sku);
  const [notes, setNotes] = useState(r.inspection?.notes ?? "");
  const [checklist, setChecklist] = useState<Inspection["checklist"]>(r.inspection?.checklist ?? {});
  const [images, setImages] = useState<ImageAsset[]>(r.inspection?.images ?? []);
  const [busy, setBusy] = useState(false);
  const editable = r.stage === "inspection";

  if (!r.inspection || (!editable && !r.inspection.notes)) return null;
  if (!editable) {
    const i = r.inspection;
    return (
      <Card title="Inspection" action={<span className="text-xs text-slate-500">{i.inspector}</span>}>
        <p className="text-sm text-navy-900">{i.notes}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {Object.entries(i.checklist).filter(([, v]) => v !== null && v !== undefined).map(([k, v]) => (
            <Badge key={k} tone={v ? "green" : "orange"}>{k.replace(/([A-Z])/g, " $1").toLowerCase()}: {v ? "yes" : "no"}</Badge>
          ))}
        </div>
        <div className="mt-4"><Images images={i.images} /></div>
      </Card>
    );
  }

  async function onFiles(files: FileList | null) {
    if (!files) return;
    const added: ImageAsset[] = [];
    for (const f of Array.from(files).slice(0, 4)) {
      if (!f.type.startsWith("image/")) continue;
      const previewUrl = await downscale(f);
      const safe = f.name.replace(/[^a-z0-9.\-_]/gi, "_");
      added.push({ id: `up-${Date.now()}-${safe}`, label: f.name, uri: `s3://returnroute-media/returns/${r.id}/${safe}`, previewUrl });
    }
    setImages((x) => [...x, ...added]);
  }

  return (
    <Card title="Inspection" action={<Badge tone="orange">In progress</Badge>}>
      <div className="space-y-4">
        <div>
          <label className={labelCls} htmlFor="notes">Inspector notes</label>
          <textarea id="notes" rows={4} className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Describe packaging, cosmetic condition, function test, accessories, any safety concerns…" />
          <div className="mt-1 flex flex-wrap gap-1.5">
            {["Factory seal intact, unopened.", "Opened, all accessories present, no marks.", "Light wear, minor scratch.", "Cracked housing, otherwise works.", "Won't turn on.", "Slight swelling near battery."].map((t) => (
              <button key={t} type="button" onClick={() => setNotes((n) => (n ? `${n} ${t}` : t))} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-200">+ {t}</button>
            ))}
          </div>
        </div>
        <div className="space-y-2 rounded-lg border border-slate-200 p-3">
          <TriState label="Powers on / functions" value={checklist.powersOn} onChange={(v) => setChecklist({ ...checklist, powersOn: v })} />
          <TriState label="Accessories complete" value={checklist.accessoriesComplete} onChange={(v) => setChecklist({ ...checklist, accessoriesComplete: v })} />
          <TriState label="Packaging intact" value={checklist.packagingIntact} onChange={(v) => setChecklist({ ...checklist, packagingIntact: v })} />
          {p?.containsBattery && <TriState label="Battery safe (no swelling, heat or damage)" value={checklist.batterySafe} onChange={(v) => setChecklist({ ...checklist, batterySafe: v })} />}
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className={labelCls}>Product images</span>
            <SimulatedTag label="Simulated S3 upload" />
          </div>
          <Images images={images} />
          <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600 hover:bg-slate-50">
            <ImagePlus className="h-4 w-4" /> Add images (JPEG/PNG)
            <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => onFiles(e.target.files)} />
          </label>
          <p className="mt-1 text-[11px] text-slate-500">In the demo, images stay in your browser and the simulated assessor reads only your notes. With Bedrock enabled, images are uploaded to S3 and analysed.</p>
        </div>
        <Button className="w-full" disabled={busy || notes.trim().length < 5} onClick={async () => {
          setBusy(true);
          await submitInspection(r.id, { inspector: state.user.name, notes, checklist, images });
          setBusy(false);
        }}>
          <Sparkles className="h-4 w-4" /> {busy ? "Requesting AI suggestion…" : "Submit inspection & get AI suggestion"}
        </Button>
      </div>
    </Card>
  );
}

function ConditionPanel({ r }: { r: ReturnRecord }) {
  const { state, verifyCondition } = useApp();
  const s = r.inspection?.suggestion;
  const [grade, setGrade] = useState<ConditionGrade>(s?.grade ?? "X_UNCERTAIN");
  const [note, setNote] = useState("");
  if (!s) return null;
  const disagree = grade !== s.grade;
  const canVerify = state.user.role !== "associate";
  const i = r.inspection!;
  return (
    <Card title="Condition assessment">
      <div className="rounded-lg border border-navy-900/10 bg-navy-900/[0.03] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <AiBadge source={s.source} />
          <Confidence value={s.confidence} threshold={state.rules.minSuggestionConfidence} />
        </div>
        <div className="mt-2 flex items-center gap-2"><span className="text-xs text-slate-500">Suggested grade</span><GradeBadge grade={s.grade} /></div>
        <p className="mt-2 text-sm text-slate-700">{s.summary}</p>
        <ul className="mt-2 space-y-0.5 text-xs text-slate-600">{s.findings.map((f) => <li key={f}>• {f}</li>)}</ul>
        {s.confidence < state.rules.minSuggestionConfidence && (
          <p className="mt-2 flex items-center gap-1 text-xs font-medium text-signal-700"><AlertTriangle className="h-3.5 w-3.5" /> Below the {Math.round(state.rules.minSuggestionConfidence * 100)}% confidence threshold: inspect closely.</p>
        )}
      </div>

      {i.verifiedGrade ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <Check className="h-4 w-4 text-teal-600" /> Verified as <GradeBadge grade={i.verifiedGrade} /> by <b>{i.verifiedBy}</b>
          {i.verifiedGrade !== s.grade && <Badge tone="orange">Inspector override</Badge>}
          {i.verificationNote && <span className="w-full text-xs text-slate-500">“{i.verificationNote}”</span>}
        </div>
      ) : r.stage === "verification" ? (
        <div className="mt-4 space-y-3">
          <HumanGate>The AI grade is advisory. Check the physical item and confirm or correct the grade. Only a verified grade can drive a recovery route.</HumanGate>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div><label className={labelCls} htmlFor="grade">Inspector’s grade</label>
              <select id="grade" className={inputCls} value={grade} onChange={(e) => setGrade(e.target.value as ConditionGrade)}>
                {GRADES.map((g) => <option key={g} value={g}>{GRADE_LABELS[g]}{g === s.grade ? " (AI suggestion)" : ""}</option>)}
              </select>
            </div>
            <Button variant="accent" disabled={!canVerify || (disagree && note.trim().length < 3)} onClick={() => verifyCondition(r.id, grade, state.user.name, note || undefined)}>
              {disagree ? "Override & verify" : "Confirm grade"}
            </Button>
          </div>
          {disagree && <div><label className={labelCls} htmlFor="vnote">Reason for differing from the AI (required)</label><input id="vnote" className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} /></div>}
          {!canVerify && <p className="flex items-center gap-1 text-xs text-signal-700"><Lock className="h-3.5 w-3.5" /> Only inspectors or supervisors can verify a condition grade.</p>}
        </div>
      ) : null}
    </Card>
  );
}

function RecommendationPanel({ r }: { r: ReturnRecord }) {
  const { state, decide, sendBackToInspection } = useApp();
  const rec = r.recommendation!;
  const [route, setRoute] = useState<RecoveryRoute>(rec.route);
  const [refund, setRefund] = useState<Decision["refundDecision"]>("deferred");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const allowed = canApprove(state.user.role, rec.approvalLevel);
  return (
    <Card title="Recommended recovery route" action={<span className="text-[11px] text-slate-400">rules v{rec.rulesVersion}</span>}>
      <Explanation rec={rec} />
      <div className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">Recovery value analysis</div>
      <div className="mt-2"><ValueComparison options={rec.options} chosen={rec.route} /></div>
      <details className="mt-4 rounded-lg border border-slate-200 p-3" open>
        <summary className="cursor-pointer text-xs font-semibold text-slate-600">Rule trace</summary>
        <div className="mt-2"><RuleTrace trace={rec.ruleTrace} /></div>
      </details>

      {r.stage === "approval" && (
        <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
          <div className="text-sm font-semibold text-navy-900">Staff approval</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className={labelCls} htmlFor="route">Approved route</label>
              <select id="route" className={inputCls} value={route} onChange={(e) => setRoute(e.target.value as RecoveryRoute)}>
                {rec.options.map((o) => <option key={o.route} value={o.route} disabled={!o.eligible}>{ROUTE_LABELS[o.route]}{o.route === rec.route ? " (recommended)" : ""}{!o.eligible ? " — blocked" : ""}</option>)}
              </select>
            </div>
            <div><label className={labelCls} htmlFor="refund">Refund decision (staff)</label>
              <select id="refund" className={inputCls} value={refund} onChange={(e) => setRefund(e.target.value as Decision["refundDecision"])}>
                <option value="deferred">Defer to customer service</option>
                <option value="approved">Approve full refund</option>
                <option value="partial">Approve partial refund</option>
                <option value="declined">Decline refund</option>
              </select>
            </div>
          </div>
          <div><label className={labelCls} htmlFor="dnote">Note {route !== rec.route && <span className="text-signal-700">(required for override)</span>}</label><input id="dnote" className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} /></div>
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          {!allowed && <p className="flex items-center gap-1 text-xs text-signal-700"><Lock className="h-3.5 w-3.5" /> Needs {rec.approvalLevel} approval. You’re signed in as a {state.user.role}; switch user in the top bar.</p>}
          <div className="flex flex-wrap gap-2">
            <Button disabled={!allowed} onClick={() => setError(decide(r.id, { route, note: note || undefined, refundDecision: refund }, state.user))}>
              <Check className="h-4 w-4" /> Approve & create warehouse task
            </Button>
            <Button variant="secondary" onClick={() => sendBackToInspection(r.id, state.user.name, note || "Re-inspection requested")}>Send back to inspection</Button>
          </div>
          <p className="text-[11px] text-slate-500">The refund decision is recorded for the retailer’s order system and is never executed automatically. In this demo, no refund is processed.</p>
        </div>
      )}
    </Card>
  );
}

function TasksPanel({ r }: { r: ReturnRecord }) {
  const { state, updateTask } = useApp();
  if (!r.decision) return null;
  return (
    <Card title="Decision & warehouse tasks" action={<SimulatedTag label="Simulated WMS" />}>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <RouteBadge route={r.decision.route} /> approved by <b>{r.decision.decidedBy}</b> ({r.decision.role})
        {r.decision.overridden && <Badge tone="orange">Override</Badge>}
        <Badge tone="slate">Refund: {r.decision.refundDecision}</Badge>
      </div>
      {r.decision.note && <p className="mt-1 text-xs text-slate-500">“{r.decision.note}”</p>}
      <ul className="mt-4 space-y-2">
        {r.tasks.map((t) => (
          <li key={t.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm">
            <Truck className="h-4 w-4 text-teal-600" />
            <div className="min-w-0 flex-1">
              <div className="font-medium text-navy-900">{t.id} · {t.type.replace(/_/g, " ").toLowerCase()}</div>
              <div className="text-xs text-slate-500">{t.location} · {t.assignee} · <span className="font-mono">{t.wmsRef}</span></div>
            </div>
            <Badge tone={t.status === "done" ? "green" : t.status === "in_progress" ? "teal" : "slate"}>{t.status.replace("_", " ")}</Badge>
            {t.status !== "done" && (
              <Button variant="secondary" className="!py-1 text-xs" onClick={() => updateTask(r.id, t.id, t.status === "queued" ? "in_progress" : "done", state.user.name)}>
                {t.status === "queued" ? "Start" : "Mark done"}
              </Button>
            )}
          </li>
        ))}
      </ul>
      {r.stage === "closed" && r.realisedValue !== undefined && <p className="mt-3 text-sm text-slate-600">Closed. Net recovery recorded: <b className="text-navy-900">{gbp(r.realisedValue, 2)}</b></p>}
    </Card>
  );
}

function Audit({ r }: { r: ReturnRecord }) {
  return (
    <Card title="Audit trail">
      <ol className="relative space-y-3 border-l border-slate-200 pl-4">
        {[...r.audit].reverse().map((a, i) => (
          <li key={i} className="text-sm">
            <span className={cx("absolute -left-[7px] mt-1 flex h-3.5 w-3.5 items-center justify-center rounded-full ring-2 ring-white", a.kind === "ai" ? "bg-navy-900" : a.kind === "human" ? "bg-teal-500" : "bg-slate-300")} />
            <div className="flex flex-wrap items-center gap-1.5 text-navy-900">
              {a.kind === "ai" ? <Sparkles className="h-3 w-3 text-navy-600" /> : a.kind === "human" ? <User className="h-3 w-3 text-teal-600" /> : <Cog className="h-3 w-3 text-slate-400" />}
              {a.action}
            </div>
            <div className="text-xs text-slate-500">{a.actor} · {new Date(a.at).toLocaleString("en-GB")}</div>
            {a.detail && <div className="text-xs text-slate-600">{a.detail}</div>}
          </li>
        ))}
      </ol>
    </Card>
  );
}

export default function ReturnDetail() {
  const { id } = useParams<{ id: string }>();
  const { state } = useApp();
  const r = state.returns.find((x) => x.id === id);
  if (!r) return <div className="text-sm text-slate-500">Return {id} not found. <Link href="/app/returns" className="text-teal-600">All returns</Link></div>;
  const p = productBySku(r.sku);
  return (
    <>
      <Link href="/app/returns" className="mb-3 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-navy-900"><ArrowLeft className="h-3.5 w-3.5" /> All returns</Link>
      <PageHeader title={`${r.id}${p ? ` · ${p.name}` : ""}`} sub={`${r.retailer} · received ${timeAgo(r.receivedAt)}`} action={<StageBadge stage={r.stage} />} />
      <Stepper stage={r.stage} />
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <ReturnDetails r={r} />
          <Identification key={`id-${r.stage}`} r={r} />
          <InspectionPanel key={`in-${r.stage}`} r={r} />
          <ConditionPanel key={`cp-${r.stage}`} r={r} />
        </div>
        <div className="space-y-6">
          {r.recommendation ? <RecommendationPanel key={`rec-${r.recommendation.generatedAt}`} r={r} /> : (
            <Card title="Recommended recovery route">
              <p className="text-sm text-slate-500">A route is recommended once an inspector has verified the condition grade.</p>
            </Card>
          )}
          <TasksPanel r={r} />
          <Audit r={r} />
        </div>
      </div>
    </>
  );
}
