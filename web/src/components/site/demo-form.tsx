"use client";
import { useState } from "react";
import { CheckCircle2, FlaskConical } from "lucide-react";
import { Button, inputCls, labelCls } from "../ui";

export function DemoForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [crm, setCrm] = useState<{ stage: string; segment: string } | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const res = await fetch("/api/demo-request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error();
      setCrm(json.crm);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-2xl bg-white p-8">
        <CheckCircle2 className="h-10 w-10 text-teal-500" />
        <h2 className="mt-4 text-xl font-semibold text-navy-900">Thanks — request received</h2>
        <p className="mt-2 text-sm text-slate-600">In production this creates a HubSpot contact and company, tagged as <b>{crm?.segment}</b>, at stage <b>{crm?.stage}</b>.</p>
        <p className="mt-4 inline-flex items-center gap-1 rounded-md bg-signal-100 px-2 py-1 text-xs text-signal-700"><FlaskConical className="h-3 w-3" /> Demonstration only: nothing was sent to a CRM.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white p-6 sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className={labelCls} htmlFor="name">Full name</label><input id="name" name="name" required minLength={2} className={inputCls} /></div>
        <div><label className={labelCls} htmlFor="email">Work email</label><input id="email" name="email" type="email" required className={inputCls} /></div>
      </div>
      <div><label className={labelCls} htmlFor="company">Company</label><input id="company" name="company" required minLength={2} className={inputCls} /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor="companyType">Company type</label>
          <select id="companyType" name="companyType" className={inputCls} defaultValue="retailer">
            <option value="retailer">Retailer / brand</option>
            <option value="3pl">Fulfilment provider (3PL)</option>
            <option value="marketplace">Marketplace</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="monthlyReturns">Returns per month</label>
          <select id="monthlyReturns" name="monthlyReturns" className={inputCls} defaultValue="1k-10k">
            <option value="<1k">Under 1,000</option>
            <option value="1k-10k">1,000 – 10,000</option>
            <option value="10k-50k">10,000 – 50,000</option>
            <option value="50k+">50,000+</option>
          </select>
        </div>
      </div>
      <div><label className={labelCls} htmlFor="message">What would you like to see? (optional)</label><textarea id="message" name="message" rows={3} maxLength={2000} className={inputCls} /></div>
      {status === "error" && <p className="text-sm text-red-600">Please check the form and try again.</p>}
      <Button type="submit" variant="accent" className="w-full py-2.5" disabled={status === "sending"}>{status === "sending" ? "Sending…" : "Request demo"}</Button>
      <p className="text-xs text-slate-500">This is a demonstration form. Submissions are validated and then discarded.</p>
    </form>
  );
}
