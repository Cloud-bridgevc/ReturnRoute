import type { Metadata } from "next";
import Link from "next/link";
import { Armchair, Headphones, Shirt, Truck, Warehouse, Zap } from "lucide-react";

export const metadata: Metadata = { title: "Use cases" };

const CASES = [
  {
    icon: Headphones, seg: "Consumer electronics retailer", t: "Stop restocking faulty units",
    problem: "Units returned as ‘changed mind’ were restocked without testing; a share came back again as defective.",
    how: ["Reason classification flags ‘works but…’ language as likely defects", "Power-on and battery checks are mandatory for battery products", "Repair is permitted only when its cost stays under a set share of MSRP"],
    outcome: "Fewer repeat returns, and lithium-battery items never leave quarantine without a recorded safety check.",
  },
  {
    icon: Shirt, seg: "Fashion & footwear", t: "Grade at speed, resell more",
    problem: "High volumes of tried-on items, with grading left to each inspector’s judgement.",
    how: ["Photo-assisted grading suggests A/B/C grades for the inspector to confirm", "Open-box (B) items go to secondary resale automatically under your rules", "Size and fit analytics feed back to merchandising"],
    outcome: "Consistent grading across shifts and sites, with sizing problems reported by SKU.",
  },
  {
    icon: Armchair, seg: "Home & furniture", t: "Know when repair beats liquidation",
    problem: "Bulky items are expensive to move, so damaged returns were liquidated by default.",
    how: ["Value analysis includes handling and outbound logistics by weight", "Repair-bench capacity is visible in the warehouse task queue", "Carrier damage patterns are surfaced for claims"],
    outcome: "Recovery decisions backed by a full cost model, plus evidence to support carrier claims.",
  },
  {
    icon: Warehouse, seg: "3PL / fulfilment provider", t: "Run each client on their own rules",
    problem: "Every retailer client had different disposition rules, kept in spreadsheets.",
    how: ["Rules are configured per client and versioned in an audit log", "Approval thresholds can be set by client and by value", "Client-facing recovery value reports"],
    outcome: "Each client’s rules are applied consistently, with reporting that can be passed straight to clients.",
  },
  {
    icon: Truck, seg: "Marketplace operations", t: "Find the fulfilment problem behind returns",
    problem: "‘Damaged in transit’ returns were rising, with no visibility by carrier or packaging type.",
    how: ["Damage analytics by carrier, site and SKU", "Inspection images and notes attached to every damage record in S3", "Bottleneck tracking for each workflow stage"],
    outcome: "A clear view of which lanes and packaging types drive damage.",
  },
  {
    icon: Zap, seg: "Small appliances brand", t: "Close the loop with product teams",
    problem: "Defect signals were buried in free-text return notes.",
    how: ["Defect clustering by SKU and failure phrase", "AI summaries of recurring issues for quality teams", "Routing to return-to-repair or certified recycling"],
    outcome: "Recurring faults surface weeks earlier and reach the people who can fix them.",
  },
];

export default function UseCases() {
  return (
    <main>
      <section className="grid-bg bg-navy-950 px-4 py-16 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="text-xs font-semibold uppercase tracking-wider text-teal-400">Use cases</div>
          <h1 className="mt-2 max-w-3xl text-4xl font-semibold tracking-tight">Built for the teams that process returns</h1>
          <p className="mt-4 max-w-2xl text-navy-300">Illustrative scenarios for retailers and fulfilment operators. The organisations described are composites, not customers.</p>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-16 md:grid-cols-2">
        {CASES.map((c) => (
          <article key={c.t} className="rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-900"><c.icon className="h-5 w-5 text-teal-400" /></div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{c.seg}</div>
                <h2 className="font-semibold text-navy-900">{c.t}</h2>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-600"><b className="text-navy-900">Challenge.</b> {c.problem}</p>
            <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
              {c.how.map((h) => <li key={h} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />{h}</li>)}
            </ul>
            <p className="mt-4 rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-900">{c.outcome}</p>
          </article>
        ))}
      </section>
      <section className="px-4 pb-20 text-center">
        <Link href="/request-demo" className="inline-flex rounded-lg bg-navy-900 px-5 py-3 text-sm font-semibold text-white hover:bg-navy-800">Discuss your use case</Link>
      </section>
    </main>
  );
}
