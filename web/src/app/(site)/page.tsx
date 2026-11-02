import Link from "next/link";
import {
  ArrowRight, BarChart3, ClipboardList, Cpu, Eye, PackageCheck, Recycle, Scale, Search, ShieldCheck, Sparkles, Tags, Wrench,
} from "lucide-react";
import { RoutingDemo } from "@/components/site/routing-demo";
import { GlowTop, GlowMid, GlowEnd } from "@/components/Glow";

const ROUTES = [
  { icon: PackageCheck, t: "Restock", d: "Sealed, complete items back to A-stock at full price.", c: "#34d399" },
  { icon: Wrench, t: "Repair", d: "Repairable damage to the bench — only when the maths works.", c: "#2dd4bf" },
  { icon: Tags, t: "Resale", d: "Open-box and B-stock to secondary channels.", c: "#5eead4" },
  { icon: Recycle, t: "Recycle", d: "Certified recycling, always supervisor-approved.", c: "#9fb3cc" },
  { icon: Search, t: "Inspect", d: "Uncertain or hazardous items quarantined first.", c: "#fb923c" },
];

const FEATURES = [
  { icon: ClipboardList, t: "Return reason classification", d: "Free-text reasons become structured categories, so recurring product and fulfilment issues surface on their own." },
  { icon: Eye, t: "Inspection intelligence", d: "Inspector notes and product photos produce a suggested condition grade with cited evidence — for a person to verify." },
  { icon: Cpu, t: "Recovery recommendation engine", d: "Your configurable rules decide which routes are permitted; the engine ranks them by net value and shows its working." },
  { icon: Scale, t: "Recovery value analysis", d: "Every permitted route is costed — labour, parts, channel fees, logistics — so the trade-off is explicit." },
  { icon: BarChart3, t: "Returns analytics", d: "Spot damage hotspots, defective SKUs, carrier problems and stage bottlenecks before they become write-offs." },
];

function HeroGraphic() {
  const ys = [40, 95, 150, 205, 260];
  return (
    <svg viewBox="0 0 440 300" className="h-auto w-full" role="img" aria-label="Diagram: a returned item flows through AI inspection and human verification to five recovery routes">
      <rect x="10" y="125" width="96" height="50" rx="10" fill="#102742" stroke="#2a4a72" />
      <text x="58" y="147" textAnchor="middle" fontSize="11" fill="#fff" fontWeight="600">Return</text>
      <text x="58" y="163" textAnchor="middle" fontSize="9" fill="#9fb3cc">RR-24017</text>
      <rect x="140" y="110" width="104" height="80" rx="12" fill="#0a1a2f" stroke="#14b8a6" />
      <text x="192" y="137" textAnchor="middle" fontSize="10" fill="#5eead4">AI suggests</text>
      <text x="192" y="155" textAnchor="middle" fontSize="10" fill="#fff">Rules permit</text>
      <text x="192" y="173" textAnchor="middle" fontSize="10" fill="#fb923c">Human approves</text>
      <path d="M106 150H140" stroke="#5eead4" strokeWidth="2" className="route-flow" />
      {ROUTES.map((r, i) => (
        <g key={r.t}>
          <path d={`M244 150 C 290 150, 290 ${ys[i]}, 320 ${ys[i]}`} fill="none" stroke={r.c} strokeWidth={i === 1 ? 2.5 : 1.2} opacity={i === 1 ? 1 : 0.45} className={i === 1 ? "route-flow" : undefined} />
          <rect x="320" y={ys[i] - 15} width="110" height="30" rx="8" fill={i === 1 ? "#14b8a6" : "#102742"} stroke={r.c} strokeOpacity="0.6" />
          <text x="375" y={ys[i] + 4} textAnchor="middle" fontSize="11" fill={i === 1 ? "#050d19" : "#fff"} fontWeight={i === 1 ? 700 : 500}>{r.t}</text>
        </g>
      ))}
    </svg>
  );
}

export default function Home() {
  return (
    <main>
      <section className="grid-bg bg-navy-950 text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-20 pt-14 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-navy-700 bg-navy-900 px-3 py-1 text-xs text-navy-300">
              <Sparkles className="h-3.5 w-3.5 text-teal-400" /> AI-native returns processing
            </div>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Route every return to its <span className="text-teal-400">highest-value</span> recovery path.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-navy-300">
              ReturnRoute classifies return reasons, suggests condition grades from inspection notes and photos, and recommends
              restock, repair, resale or recycling under your business rules. A person approves every decision that matters.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="#demo" className="inline-flex items-center gap-2 rounded-lg bg-teal-500 px-5 py-3 text-sm font-semibold text-navy-950 hover:bg-teal-400">
                Try the routing demo <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/request-demo" className="rounded-lg border border-navy-600 px-5 py-3 text-sm font-semibold text-white hover:bg-navy-800">
                Talk to us
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-2 text-xs text-navy-300">
              <ShieldCheck className="h-4 w-4 text-teal-400" /> AI suggests · your rules decide what’s permitted · your staff approve
            </div>
          </div>
          <div className="rounded-2xl border border-navy-800 bg-navy-900/60 p-4">
            <HeroGraphic />
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:grid-cols-3">
          {[
            ["Every route costed", "Labour, parts, channel fees and logistics, compared side by side"],
            ["Every decision explained", "Rule trace and rationale attached to each recommendation"],
            ["Every action approved", "No refund, disposal or stock adjustment happens without a person"],
          ].map(([t, d]) => (
            <div key={t}>
              <div className="font-semibold text-navy-900">{t}</div>
              <p className="mt-1 text-sm text-slate-600">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <GlowTop />

      <section id="demo" className="scroll-mt-20 bg-navy-900 px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-wider text-teal-400">Interactive demo</div>
            <h2 className="mt-2 text-3xl font-semibold text-white">Watch a damaged product get its route</h2>
            <p className="mt-3 text-navy-300">
              Pick a fictional return and run the AI inspection. The engine won’t act on the AI grade alone: confirm it as the
              inspector to see the recommended route, the value of every option and the rules behind it.
            </p>
          </div>
          <RoutingDemo />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="max-w-2xl">
          <div className="text-xs font-semibold uppercase tracking-wider text-teal-600">Platform</div>
          <h2 className="mt-2 text-3xl font-semibold text-navy-900">Five AI capabilities, one accountable workflow</h2>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.t} className="rounded-xl border border-slate-200 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-900">
                <f.icon className="h-5 w-5 text-teal-400" />
              </div>
              <div className="mt-4 font-semibold text-navy-900">{f.t}</div>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{f.d}</p>
            </div>
          ))}
          <div className="rounded-xl bg-navy-900 p-6 text-white">
            <div className="font-semibold">Built on AWS</div>
            <p className="mt-1.5 text-sm text-navy-300">
              Amazon S3 for images and documents, Amazon Bedrock for classification and summaries, PostgreSQL for returns and
              inventory, and AWS Lambda for processing workflows.
            </p>
          </div>
        </div>
      </section>

      <GlowMid />

      <section className="bg-slate-50 px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-semibold text-navy-900">Five recovery paths</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {ROUTES.map((r) => (
              <div key={r.t} className="rounded-xl border border-slate-200 bg-white p-5">
                <r.icon className="h-6 w-6 text-teal-600" />
                <div className="mt-3 font-semibold text-navy-900">{r.t}</div>
                <p className="mt-1 text-sm text-slate-600">{r.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-signal-500">Safeguards</div>
            <h2 className="mt-2 text-3xl font-semibold text-navy-900">AI that advises. People who decide.</h2>
            <p className="mt-4 text-slate-600">
              Image classification is useful, and it can be wrong. ReturnRoute treats every AI output as a suggestion: it is
              labelled, carries a confidence score and evidence, and is recorded in the audit trail next to the person who
              confirmed or overrode it.
            </p>
          </div>
          <ul className="space-y-3">
            {[
              "AI condition grades must be verified by an inspector before any route can be approved",
              "Refund decisions are recorded by staff and never executed automatically",
              "Disposal and recycling, and any item over your high-value threshold, need supervisor approval",
              "Lithium-battery products need a recorded safety check before leaving quarantine",
              "Inventory adjustments are only sent to your WMS after a human approval",
              "Overrides need a reason, and every step is audit-logged",
            ].map((s) => (
              <li key={s} className="flex gap-3 rounded-lg border border-slate-200 p-3 text-sm text-navy-900">
                <ShieldCheck className="h-5 w-5 shrink-0 text-teal-600" /> {s}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <GlowEnd />

      <section className="px-4 pb-20">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 rounded-2xl bg-navy-900 px-8 py-10 text-white sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-semibold">See it on your own returns mix</h2>
            <p className="mt-1 text-navy-300">We’ll model recovery value on a sample of your SKUs and business rules.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/app" className="rounded-lg border border-navy-600 px-4 py-2.5 text-sm font-semibold hover:bg-navy-800">Explore dashboard</Link>
            <Link href="/request-demo" className="rounded-lg bg-signal-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-signal-400">Request a demo</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
