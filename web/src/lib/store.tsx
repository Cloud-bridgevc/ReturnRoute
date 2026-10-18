"use client";
// Client-side demo store. In production these mutations are API calls backed by
// PostgreSQL (see db/schema.sql) and Lambda workflows (see infra/template.yaml).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_RULES, ROUTE_TASK, STAFF, productBySku, productByGtin } from "./domain/catalog";
import type {
  AuditEvent, ConditionGrade, ConditionSuggestion, Decision, ImageAsset, Inspection, ReasonClassification, RecoveryRoute,
  RecoveryRules, ReturnRecord, Role, WarehouseTask,
} from "./domain/types";
import { buildSeed } from "./data/seed";
import { canApprove, recommend } from "./engine/recovery";
import { assessConditionSimulated, classifyReasonSimulated } from "./engine/simulated-ai";

const KEY = "returnroute-demo-v3";

export interface User { name: string; role: Role }
export const DEMO_USERS: User[] = [
  { name: STAFF.associate[0], role: "associate" },
  { name: STAFF.inspector[0], role: "inspector" },
  { name: STAFF.supervisor[0], role: "supervisor" },
];

interface State { returns: ReturnRecord[]; rules: RecoveryRules; user: User; seq: number }

const now = () => new Date().toISOString();

async function postJSON<T>(url: string, body: unknown, fallback: () => T): Promise<T> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(String(res.status));
    return (await res.json()) as T;
  } catch {
    return fallback();
  }
}

function useStoreImpl() {
  const [state, setState] = useState<State | null>(null);
  const loaded = useRef(false);
  const stateRef = useRef<State | null>(null);
  stateRef.current = state;

  useEffect(() => {
    let initial: State | null = null;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) initial = JSON.parse(raw) as State;
    } catch { /* storage unavailable */ }
    setState(initial ?? { returns: buildSeed(), rules: DEFAULT_RULES, user: DEMO_USERS[1], seq: 1 });
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!state || !loaded.current) return;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }, [state]);

  const patch = useCallback((id: string, fn: (r: ReturnRecord, s: State) => ReturnRecord) => {
    setState((s) => (s ? { ...s, returns: s.returns.map((r) => (r.id === id ? fn(r, s) : r)) } : s));
  }, []);

  const log = (r: ReturnRecord, e: Omit<AuditEvent, "at">): AuditEvent[] => [...r.audit, { at: now(), ...e }];

  const actions = useMemo(() => ({
    setUser(user: User) { setState((s) => (s ? { ...s, user } : s)); },
    resetDemo() {
      try { localStorage.removeItem(KEY); } catch { /* ignore */ }
      setState({ returns: buildSeed(), rules: DEFAULT_RULES, user: DEMO_USERS[1], seq: 1 });
    },
    updateRules(rules: RecoveryRules) { setState((s) => (s ? { ...s, rules: { ...rules, version: s.rules.version + 1 } } : s)); },

    async createReturn(input: { rma: string; orderId: string; retailer: string; channel: ReturnRecord["channel"]; reasonText: string; barcode?: string; site: string; actor: string }) {
      const id = `RR-${24300 + (stateRef.current?.seq ?? 1)}`;
      const reason = await postJSON<ReasonClassification>("/api/ai/classify-reason", { text: input.reasonText }, () => classifyReasonSimulated(input.reasonText));
      const product = productByGtin(input.barcode);
      const rec: ReturnRecord = {
        id, rma: input.rma, orderId: input.orderId, retailer: input.retailer, channel: input.channel,
        customerRef: `CUST-${Math.random().toString(36).slice(2, 6).toUpperCase()}`, reasonText: input.reasonText, reason,
        scannedBarcode: input.barcode, stage: "intake", receivedAt: now(), stageEnteredAt: now(), site: input.site, tasks: [],
        audit: [
          { at: now(), actor: input.actor, action: "Return logged at intake", kind: "human" },
          { at: now(), actor: `ReturnRoute AI (${reason.source})`, action: "Reason classified", detail: `${reason.category} · ${Math.round(reason.confidence * 100)}%`, kind: "ai" },
          ...(product ? [{ at: now(), actor: "System", action: "Barcode matched", detail: `${input.barcode} → ${product.sku} (pending confirmation)`, kind: "system" as const }] : []),
        ],
      };
      setState((s) => (s ? { ...s, returns: [rec, ...s.returns], seq: s.seq + 1 } : s));
      return id;
    },

    identifyProduct(id: string, sku: string, serial: string, actor: string) {
      patch(id, (r) => ({
        ...r, sku, serial: serial || r.serial, stage: "inspection", stageEnteredAt: now(),
        inspection: r.inspection ?? { notes: "", checklist: {}, images: [] },
        audit: log(r, { actor, action: "Product identified", detail: `${sku}${serial ? ` · S/N ${serial}` : ""}`, kind: "human" }),
      }));
    },

    async submitInspection(id: string, data: { inspector: string; notes: string; checklist: Inspection["checklist"]; images: ImageAsset[] }) {
      const suggestion = await postJSON<ConditionSuggestion>("/api/ai/assess-condition", data, () => assessConditionSimulated(data));
      patch(id, (r) => ({
        ...r, stage: "verification", stageEnteredAt: now(),
        inspection: { ...data, suggestion, verifiedGrade: undefined, verifiedBy: undefined, verifiedAt: undefined },
        recommendation: undefined,
        audit: [
          ...log(r, { actor: data.inspector, action: "Inspection submitted", detail: `${data.images.length} image(s)`, kind: "human" }),
          { at: now(), actor: `ReturnRoute AI (${suggestion.source})`, action: "Condition suggested", detail: `${suggestion.grade} · ${Math.round(suggestion.confidence * 100)}% — advisory, awaiting verification`, kind: "ai" },
        ],
      }));
    },

    verifyCondition(id: string, grade: ConditionGrade, actor: string, note?: string) {
      patch(id, (r, s) => {
        const product = productBySku(r.sku);
        if (!product || !r.inspection) return r;
        const verifiedRec: ReturnRecord = { ...r, inspection: { ...r.inspection, verifiedGrade: grade, verifiedBy: actor, verifiedAt: now(), verificationNote: note } };
        const recommendation = recommend(verifiedRec, product, s.rules);
        const agreed = r.inspection.suggestion?.grade === grade;
        return {
          ...verifiedRec, recommendation, stage: "approval", stageEnteredAt: now(),
          audit: [
            ...log(r, { actor, action: agreed ? "Condition verified (agreed with AI)" : "Condition verified (inspector override)", detail: `${grade}${note ? ` — ${note}` : ""}`, kind: "human" }),
            { at: now(), actor: "Rules engine", action: "Recovery route recommended", detail: `${recommendation.route} · rules v${recommendation.rulesVersion} · needs ${recommendation.approvalLevel} approval`, kind: "system" },
          ],
        };
      });
    },

    sendBackToInspection(id: string, actor: string, note: string) {
      patch(id, (r) => ({ ...r, stage: "inspection", stageEnteredAt: now(), recommendation: undefined, audit: log(r, { actor, action: "Sent back to inspection", detail: note, kind: "human" }) }));
    },

    decide(id: string, d: { route: RecoveryRoute; note?: string; refundDecision: Decision["refundDecision"] }, user: User): string | null {
      const r = stateRef.current?.returns.find((x) => x.id === id);
      const rec = r?.recommendation;
      if (!r || !rec) return "No recommendation to approve.";
      if (!rec.gradeVerified) return "Condition must be verified by an inspector first.";
      if (!canApprove(user.role, rec.approvalLevel)) return `This decision requires ${rec.approvalLevel} approval. Switch to a ${rec.approvalLevel} user.`;
      const overridden = d.route !== rec.route;
      if (overridden && !d.note?.trim()) return "An override reason is required when choosing a different route.";
      const opt = rec.options.find((o) => o.route === d.route);
      if (opt && !opt.eligible) return `Route blocked by rule: ${opt.blockedBy[0]}`;
      if (d.route === "RECYCLE" && user.role !== "supervisor") return "Disposal requires supervisor approval.";
      const task: WarehouseTask = {
        id: `WT-${Math.floor(7900 + Math.random() * 900)}`, returnId: id, type: ROUTE_TASK[d.route].type, location: ROUTE_TASK[d.route].location,
        assignee: STAFF.associate[Math.floor(Math.random() * 2)], status: "queued", createdAt: now(), wmsRef: `SIM-WMS-${Math.floor(40000 + Math.random() * 9999)}`,
      };
      patch(id, (cur) => ({
        ...cur, stage: "tasked", stageEnteredAt: now(),
        decision: { route: d.route, decidedBy: user.name, role: user.role, decidedAt: now(), overridden, note: d.note, refundDecision: d.refundDecision },
        tasks: [...cur.tasks, task],
        audit: [
          ...log(cur, { actor: user.name, action: overridden ? "Route approved with override" : "Recommended route approved", detail: `${d.route} · refund: ${d.refundDecision}${d.note ? ` — ${d.note}` : ""}`, kind: "human" }),
          { at: now(), actor: "Simulated WMS", action: "Warehouse task created", detail: `${task.id} ${task.type} → ${task.location} (${task.wmsRef})`, kind: "system" },
        ],
      }));
      return null;
    },

    updateTask(returnId: string, taskId: string, status: WarehouseTask["status"], actor: string) {
      patch(returnId, (r) => {
        const tasks = r.tasks.map((t) => (t.id === taskId ? { ...t, status, completedAt: status === "done" ? now() : undefined } : t));
        const allDone = tasks.every((t) => t.status === "done");
        const route = r.decision?.route;
        const opt = r.recommendation?.options.find((o) => o.route === route);
        return {
          ...r, tasks,
          stage: allDone ? "closed" : r.stage,
          stageEnteredAt: allDone ? now() : r.stageEnteredAt,
          realisedValue: allDone && opt ? opt.netValue : r.realisedValue,
          audit: log(r, { actor, action: `Task ${taskId} → ${status}`, detail: allDone ? "Return closed (simulated WMS confirmation)" : undefined, kind: "human" }),
        };
      });
    },
  }), [patch]);

  return { state, ...actions };
}

type Store = ReturnType<typeof useStoreImpl>;
const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const store = useStoreImpl();
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside StoreProvider");
  return s;
}
