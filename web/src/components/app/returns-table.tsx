"use client";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { REASON_LABELS, productBySku } from "@/lib/domain/catalog";
import type { ReturnRecord } from "@/lib/domain/types";
import { GradeBadge, RouteBadge, StageBadge, timeAgo } from "../ui";

export function ReturnsTable({ rows, empty = "Nothing here right now.", show = "route" }: { rows: ReturnRecord[]; empty?: string; show?: "route" | "grade" }) {
  if (rows.length === 0) return <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">{empty}</div>;
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
          <tr>
            <th className="px-4 py-2.5">Return</th>
            <th className="px-4 py-2.5">Product</th>
            <th className="px-4 py-2.5">Reason</th>
            <th className="px-4 py-2.5">Stage</th>
            <th className="px-4 py-2.5">{show === "route" ? "Route" : "Grade"}</th>
            <th className="px-4 py-2.5">In stage</th>
            <th />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => {
            const p = productBySku(r.sku);
            const grade = r.inspection?.verifiedGrade ?? r.inspection?.suggestion?.grade;
            const route = r.decision?.route ?? r.recommendation?.route;
            return (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-2.5">
                  <Link href={`/app/returns/${r.id}`} className="font-mono text-xs font-semibold text-navy-900 hover:text-teal-600">{r.id}</Link>
                  <div className="text-xs text-slate-500">{r.retailer}</div>
                </td>
                <td className="px-4 py-2.5">{p ? <><div className="text-navy-900">{p.name}</div><div className="font-mono text-[11px] text-slate-400">{p.sku}</div></> : <span className="text-signal-700">Unidentified</span>}</td>
                <td className="px-4 py-2.5 text-slate-600">{r.reason ? REASON_LABELS[r.reason.category] : "—"}</td>
                <td className="px-4 py-2.5"><StageBadge stage={r.stage} /></td>
                <td className="px-4 py-2.5">
                  {show === "route" ? (route ? <RouteBadge route={route} /> : <span className="text-slate-400">—</span>) : grade ? (
                    <span className="flex items-center gap-1"><GradeBadge grade={grade} />{!r.inspection?.verifiedGrade && <span className="text-[10px] text-slate-400">AI</span>}</span>
                  ) : <span className="text-slate-400">—</span>}
                </td>
                <td className="px-4 py-2.5 text-xs text-slate-500">{timeAgo(r.stageEnteredAt)}</td>
                <td className="px-2"><Link href={`/app/returns/${r.id}`} aria-label={`Open ${r.id}`}><ChevronRight className="h-4 w-4 text-slate-400" /></Link></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
