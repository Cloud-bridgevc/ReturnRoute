"use client";
import Link from "next/link";
import { PageHeader, useApp } from "@/components/app/shell";
import { Badge, Button, SimulatedTag, cx, timeAgo } from "@/components/ui";
import { productBySku } from "@/lib/domain/catalog";
import type { WarehouseTask } from "@/lib/domain/types";

const COLS: { status: WarehouseTask["status"]; label: string }[] = [
  { status: "queued", label: "Queued" },
  { status: "in_progress", label: "In progress" },
  { status: "done", label: "Done (last 10)" },
];

export default function Tasks() {
  const { state, updateTask } = useApp();
  const tasks = state.returns.flatMap((r) => r.tasks.map((t) => ({ t, r }))).sort((a, b) => b.t.createdAt.localeCompare(a.t.createdAt));
  return (
    <>
      <PageHeader title="Warehouse tasks" sub="Created only after a person approves a recovery route." action={<SimulatedTag label="Simulated WMS integration" />} />
      <div className="grid gap-4 lg:grid-cols-3">
        {COLS.map((c) => {
          const items = tasks.filter((x) => x.t.status === c.status).slice(0, c.status === "done" ? 10 : undefined);
          return (
            <section key={c.status} className="rounded-xl bg-slate-100/80 p-3">
              <h2 className="mb-3 flex items-center justify-between px-1 text-sm font-semibold text-navy-900">{c.label}<span className="text-xs font-normal text-slate-500">{items.length}</span></h2>
              <ul className="space-y-2">
                {items.map(({ t, r }) => (
                  <li key={t.id} className={cx("rounded-lg border bg-white p-3 text-sm shadow-sm", t.type === "QUARANTINE_INSPECT" ? "border-signal-500/40" : "border-slate-200")}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-navy-900">{t.id}</span>
                      <Badge tone={t.type === "QUARANTINE_INSPECT" ? "orange" : t.type === "RECYCLE_BIN" ? "slate" : "teal"}>{t.type.replace(/_/g, " ").toLowerCase()}</Badge>
                    </div>
                    <div className="mt-1 text-navy-900">{productBySku(r.sku)?.name}</div>
                    <div className="text-xs text-slate-500">{t.location}</div>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                      <span>{t.assignee} · {timeAgo(t.createdAt)}</span>
                      <Link href={`/app/returns/${r.id}`} className="font-mono text-teal-600">{r.id}</Link>
                    </div>
                    <div className="mt-1 font-mono text-[10px] text-slate-400">{t.wmsRef}</div>
                    {t.status !== "done" && (
                      <Button variant="secondary" className="mt-2 w-full !py-1 text-xs" onClick={() => updateTask(r.id, t.id, t.status === "queued" ? "in_progress" : "done", state.user.name)}>
                        {t.status === "queued" ? "Start task" : "Mark done"}
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
