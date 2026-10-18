"use client";
import { ReturnsTable } from "@/components/app/returns-table";
import { PageHeader, useApp } from "@/components/app/shell";

export default function InspectionQueue() {
  const { state } = useApp();
  const byAge = (a: { stageEnteredAt: string }, b: { stageEnteredAt: string }) => a.stageEnteredAt.localeCompare(b.stageEnteredAt);
  const toInspect = state.returns.filter((r) => r.stage === "inspection").sort(byAge);
  const toVerify = state.returns.filter((r) => r.stage === "verification").sort(byAge);
  return (
    <>
      <PageHeader title="Inspection queue" sub="Oldest first. AI condition grades are suggestions until an inspector confirms them." />
      <h2 className="mb-3 text-sm font-semibold text-navy-900">Condition verification needed ({toVerify.length})</h2>
      <ReturnsTable rows={toVerify} show="grade" empty="No AI suggestions awaiting verification." />
      <h2 className="mb-3 mt-8 text-sm font-semibold text-navy-900">Ready for inspection ({toInspect.length})</h2>
      <ReturnsTable rows={toInspect} show="grade" empty="Inspection queue is clear." />
    </>
  );
}
