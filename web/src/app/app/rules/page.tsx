"use client";
import { useState } from "react";
import { Lock } from "lucide-react";
import { PageHeader, useApp } from "@/components/app/shell";
import { Button, Card, HumanGate, cx, inputCls, labelCls } from "@/components/ui";
import { DEFAULT_RULES, GRADES, GRADE_LABELS } from "@/lib/domain/catalog";
import type { ConditionGrade, RecoveryRules } from "@/lib/domain/types";

function GradePicker({ value, onChange, disabled }: { value: ConditionGrade[]; onChange: (v: ConditionGrade[]) => void; disabled: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {GRADES.filter((g) => g !== "X_UNCERTAIN").map((g) => {
        const on = value.includes(g);
        return (
          <button key={g} type="button" disabled={disabled} aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== g) : [...value, g])}
            className={cx("rounded-full px-2.5 py-1 text-xs ring-1 ring-inset", on ? "bg-teal-500 text-navy-950 ring-teal-500" : "bg-white text-slate-600 ring-slate-300", disabled && "opacity-60")}>
            {GRADE_LABELS[g]}
          </button>
        );
      })}
    </div>
  );
}

export default function Rules() {
  const { state, updateRules } = useApp();
  const [r, setR] = useState<RecoveryRules>(state.rules);
  const [saved, setSaved] = useState(false);
  const locked = state.user.role !== "supervisor";
  const num = (v: string) => Number(v);
  const set = (p: Partial<RecoveryRules>) => { setR({ ...r, ...p }); setSaved(false); };

  return (
    <>
      <PageHeader title="Business rules" sub={`Active version v${state.rules.version}. Changes apply to new recommendations and are logged.`}
        action={<div className="flex gap-2">
          <Button variant="secondary" disabled={locked} onClick={() => setR({ ...DEFAULT_RULES, version: state.rules.version })}>Restore defaults</Button>
          <Button disabled={locked} onClick={() => { updateRules(r); setSaved(true); }}>Save as v{state.rules.version + 1}</Button>
        </div>} />
      {locked && <p className="mb-4 flex items-center gap-1.5 text-sm text-signal-700"><Lock className="h-4 w-4" /> Only supervisors can change business rules. Switch user in the top bar.</p>}
      {saved && <p className="mb-4 rounded-md bg-teal-50 px-3 py-2 text-sm text-teal-800">Saved. New recommendations will use v{state.rules.version}.</p>}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Route eligibility by verified grade">
          <div className="space-y-4">
            <div><div className={labelCls}>Restock permitted for</div><GradePicker disabled={locked} value={r.restockGrades} onChange={(v) => set({ restockGrades: v })} /></div>
            <div><div className={labelCls}>Secondary resale permitted for</div><GradePicker disabled={locked} value={r.resaleGrades} onChange={(v) => set({ resaleGrades: v })} /></div>
            <div><div className={labelCls}>Repair permitted for</div><GradePicker disabled={locked} value={r.repairGrades} onChange={(v) => set({ repairGrades: v })} /></div>
            <div><label className={labelCls} htmlFor="rc">Repair only if cost ≤ this % of MSRP</label><input id="rc" type="number" min={0} max={100} disabled={locked} className={inputCls} value={Math.round(r.maxRepairCostPctOfMsrp * 100)} onChange={(e) => set({ maxRepairCostPctOfMsrp: num(e.target.value) / 100 })} /></div>
          </div>
        </Card>
        <Card title="Governance & approvals">
          <div className="space-y-4">
            <div><label className={labelCls} htmlFor="hv">Supervisor approval at or above MSRP (£)</label><input id="hv" type="number" min={0} disabled={locked} className={inputCls} value={r.highValueThreshold} onChange={(e) => set({ highValueThreshold: num(e.target.value) })} /></div>
            <div><label className={labelCls} htmlFor="mc">AI confidence threshold for flagging (%)</label><input id="mc" type="number" min={0} max={100} disabled={locked} className={inputCls} value={Math.round(r.minSuggestionConfidence * 100)} onChange={(e) => set({ minSuggestionConfidence: num(e.target.value) / 100 })} /></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={locked} checked={r.batteryRequiresSafetyCheck} onChange={(e) => set({ batteryRequiresSafetyCheck: e.target.checked })} /> Lithium-battery products need a passed safety check</label>
            <HumanGate>
              <b>Fixed safeguards (cannot be turned off):</b> condition grades must be human-verified before routing; recycling/disposal needs a supervisor; refunds and inventory adjustments are never executed automatically; overrides need a reason.
            </HumanGate>
          </div>
        </Card>
        <Card title="Recovery rates (% of MSRP)">
          <div className="grid grid-cols-3 gap-3">
            {(["RESTOCK", "REPAIR", "RESALE"] as const).map((k) => (
              <div key={k}><label className={labelCls} htmlFor={k}>{k.toLowerCase()}</label><input id={k} type="number" min={0} max={100} disabled={locked} className={inputCls} value={Math.round(r.recoveryRates[k] * 100)} onChange={(e) => set({ recoveryRates: { ...r.recoveryRates, [k]: num(e.target.value) / 100 } })} /></div>
            ))}
          </div>
        </Card>
        <Card title="Handling costs (£)">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(Object.keys(r.costs) as (keyof RecoveryRules["costs"])[]).map((k) => (
              <div key={k}><label className={labelCls} htmlFor={k}>{k.replace(/([A-Z])/g, " $1").toLowerCase()}</label>
                <input id={k} type="number" step="0.01" min={0} disabled={locked} className={inputCls} value={r.costs[k]} onChange={(e) => set({ costs: { ...r.costs, [k]: num(e.target.value) } })} /></div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
