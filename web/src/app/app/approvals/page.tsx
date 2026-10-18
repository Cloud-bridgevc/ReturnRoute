"use client";
import { ReturnsTable } from "@/components/app/returns-table";
import { PageHeader, useApp } from "@/components/app/shell";
import { HumanGate } from "@/components/ui";
import { canApprove } from "@/lib/engine/recovery";

export default function Approvals() {
  const { state } = useApp();
  const waiting = state.returns.filter((r) => r.stage === "approval");
  const mine = waiting.filter((r) => r.recommendation && canApprove(state.user.role, r.recommendation.approvalLevel));
  const others = waiting.filter((r) => !mine.includes(r));
  return (
    <>
      <PageHeader title="Staff approval" sub="Recommended routes waiting for an authorised person." />
      <div className="mb-6"><HumanGate>Approving a route creates a warehouse task and records your refund decision. Nothing reaches stock, refunds or disposal until someone approves it. Recycling and high-value items need a supervisor.</HumanGate></div>
      <h2 className="mb-3 text-sm font-semibold text-navy-900">You can approve ({mine.length})</h2>
      <ReturnsTable rows={mine} empty={state.user.role === "associate" ? "Associates can't approve recovery routes. Switch user in the top bar." : "Nothing waiting for you."} />
      {others.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 text-sm font-semibold text-navy-900">Needs a supervisor ({others.length})</h2>
          <ReturnsTable rows={others} />
        </>
      )}
    </>
  );
}
