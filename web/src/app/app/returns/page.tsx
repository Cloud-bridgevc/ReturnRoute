"use client";
import { useState } from "react";
import { ReturnsTable } from "@/components/app/returns-table";
import { PageHeader, useApp } from "@/components/app/shell";
import { inputCls } from "@/components/ui";
import { STAGE_LABELS } from "@/lib/domain/catalog";
import type { ReturnStage } from "@/lib/domain/types";

export default function AllReturns() {
  const { state } = useApp();
  const [q, setQ] = useState("");
  const [stage, setStage] = useState<ReturnStage | "all">("all");
  const rows = state.returns.filter((r) =>
    (stage === "all" || r.stage === stage) &&
    (!q || [r.id, r.rma, r.orderId, r.sku, r.retailer, r.reasonText].join(" ").toLowerCase().includes(q.toLowerCase())));
  return (
    <>
      <PageHeader title="All returns" sub={`${rows.length} of ${state.returns.length} returns`} />
      <div className="mb-4 flex flex-wrap gap-3">
        <input aria-label="Search returns" className={`${inputCls} max-w-xs`} placeholder="Search ID, RMA, SKU, retailer…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="Filter by stage" className={`${inputCls} max-w-[200px]`} value={stage} onChange={(e) => setStage(e.target.value as ReturnStage | "all")}>
          <option value="all">All stages</option>
          {Object.entries(STAGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <ReturnsTable rows={rows} empty="No returns match." />
    </>
  );
}
