import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { cx } from "@/components/ui";

export const metadata: Metadata = { title: "Pricing" };

const TIERS = [
  {
    name: "Starter", price: "£690", per: "/month", vol: "Up to 2,500 returns / month", cta: "Start a pilot",
    items: ["Returns intake & product identification", "AI reason classification", "Inspection queue with AI grade suggestions", "Default recovery rules", "Standard analytics", "1 site · 10 users"],
  },
  {
    name: "Growth", price: "£1,950", per: "/month", vol: "Up to 15,000 returns / month", cta: "Request a demo", featured: true,
    items: ["Everything in Starter", "Configurable rules & approval thresholds", "Recovery value reports", "WMS / OMS connectors", "Image storage (S3) with 13-month retention", "3 sites · 50 users"],
  },
  {
    name: "Enterprise", price: "Custom", per: "", vol: "Unlimited volume · multi-client 3PL", cta: "Contact sales",
    items: ["Everything in Growth", "Per-client rule sets for 3PLs", "Dedicated AWS region & VPC deployment", "SSO / SAML, custom roles", "Audit export & data residency", "Named success manager"],
  },
];

export default function Pricing() {
  return (
    <main>
      <section className="grid-bg bg-navy-950 px-4 py-16 text-center text-white">
        <div className="text-xs font-semibold uppercase tracking-wider text-teal-400">Pricing</div>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Priced on return volume, not seats</h1>
        <p className="mx-auto mt-4 max-w-xl text-navy-300">Illustrative pricing for this demonstration. Every plan includes human-approval controls and a full audit trail.</p>
      </section>
      <section className="mx-auto -mt-8 grid max-w-6xl gap-6 px-4 pb-16 md:grid-cols-3">
        {TIERS.map((t) => (
          <div key={t.name} className={cx("flex flex-col rounded-2xl border bg-white p-6 shadow-sm", t.featured ? "border-teal-500 ring-2 ring-teal-500/30" : "border-slate-200")}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-navy-900">{t.name}</h2>
              {t.featured && <span className="rounded-full bg-signal-100 px-2 py-0.5 text-xs font-medium text-signal-700">Most popular</span>}
            </div>
            <div className="mt-4"><span className="text-4xl font-semibold text-navy-900">{t.price}</span><span className="text-slate-500">{t.per}</span></div>
            <div className="mt-1 text-sm text-slate-500">{t.vol}</div>
            <ul className="mt-6 flex-1 space-y-2 text-sm text-slate-700">
              {t.items.map((i) => <li key={i} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-teal-600" />{i}</li>)}
            </ul>
            <Link href="/request-demo" className={cx("mt-6 rounded-lg px-4 py-2.5 text-center text-sm font-semibold", t.featured ? "bg-teal-500 text-navy-950 hover:bg-teal-400" : "bg-navy-900 text-white hover:bg-navy-800")}>{t.cta}</Link>
          </div>
        ))}
      </section>
      <section className="mx-auto max-w-3xl px-4 pb-20">
        <h2 className="text-xl font-semibold text-navy-900">Common questions</h2>
        <dl className="mt-6 space-y-5 text-sm">
          {[
            ["Are AI inference costs included?", "Yes. Amazon Bedrock usage for classification and summaries is included up to your plan’s return volume."],
            ["Can the AI approve refunds or write off stock?", "No. AI outputs are suggestions. Refunds, disposal and inventory adjustments always need an authorised person and must pass your configured rules."],
            ["Do you integrate with our WMS?", "Growth and Enterprise include connectors. In this demonstration, all warehouse integrations are simulated."],
            ["What counts as a return?", "One RMA line that is received and processed through intake."],
          ].map(([q, a]) => (
            <div key={q}><dt className="font-medium text-navy-900">{q}</dt><dd className="mt-1 text-slate-600">{a}</dd></div>
          ))}
        </dl>
      </section>
    </main>
  );
}
