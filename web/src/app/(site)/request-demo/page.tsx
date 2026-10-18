import type { Metadata } from "next";
import { DemoForm } from "@/components/site/demo-form";

export const metadata: Metadata = { title: "Request a demo" };

export default function RequestDemo() {
  return (
    <main className="grid-bg bg-navy-950 px-4 py-16">
      <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1fr_1.2fr]">
        <div className="text-white">
          <div className="text-xs font-semibold uppercase tracking-wider text-teal-400">Request a demo</div>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">Model recovery value on your returns</h1>
          <p className="mt-4 text-navy-300">In 30 minutes we’ll walk through intake, inspection, routing and approvals, and estimate recovery uplift from a sample of your SKUs.</p>
          <ul className="mt-6 space-y-2 text-sm text-navy-300">
            <li>• Live routing walkthrough with your product categories</li>
            <li>• Review of your current disposition rules</li>
            <li>• Integration plan for your WMS and OMS</li>
          </ul>
        </div>
        <DemoForm />
      </div>
    </main>
  );
}
