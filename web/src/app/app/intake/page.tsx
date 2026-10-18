"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ScanLine } from "lucide-react";
import { ReturnsTable } from "@/components/app/returns-table";
import { PageHeader, useApp } from "@/components/app/shell";
import { Button, Card, inputCls, labelCls } from "@/components/ui";
import { PRODUCTS, RETAILERS, SITES } from "@/lib/domain/catalog";

export default function Intake() {
  const { state, createReturn } = useApp();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const pending = state.returns.filter((r) => r.stage === "intake");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    const id = await createReturn({
      rma: String(f.get("rma")), orderId: String(f.get("orderId")), retailer: String(f.get("retailer")),
      channel: f.get("channel") as "web", reasonText: String(f.get("reason")), barcode: String(f.get("barcode") || "") || undefined,
      site: String(f.get("site")), actor: state.user.name,
    });
    setBusy(false);
    router.push(`/app/returns/${id}`);
  }

  return (
    <>
      <PageHeader title="Returns intake" sub="Log returns as they arrive at the dock. The customer's reason is classified automatically." />
      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <Card title="Log a return">
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls} htmlFor="rma">RMA number</label><input id="rma" name="rma" required className={inputCls} defaultValue={`RMA-${880400 + state.seq}`} /></div>
              <div><label className={labelCls} htmlFor="orderId">Order ID</label><input id="orderId" name="orderId" required className={inputCls} defaultValue={`ORD-${5320000 + state.seq * 7}`} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls} htmlFor="retailer">Retailer</label><select id="retailer" name="retailer" className={inputCls}>{RETAILERS.map((r) => <option key={r}>{r}</option>)}</select></div>
              <div><label className={labelCls} htmlFor="channel">Channel</label><select id="channel" name="channel" className={inputCls}><option value="web">Web</option><option value="marketplace">Marketplace</option><option value="store">Store</option></select></div>
            </div>
            <div><label className={labelCls} htmlFor="site">Receiving site</label><select id="site" name="site" className={inputCls}>{SITES.map((s) => <option key={s}>{s}</option>)}</select></div>
            <div>
              <label className={labelCls} htmlFor="barcode">Scanned barcode (GTIN)</label>
              <div className="relative">
                <ScanLine className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <input id="barcode" name="barcode" list="gtins" className={`${inputCls} pl-8 font-mono`} placeholder="Scan or type" />
                <datalist id="gtins">{PRODUCTS.map((p) => <option key={p.gtin} value={p.gtin}>{p.name}</option>)}</datalist>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">Simulated scanner: choose a fictional GTIN from the list.</p>
            </div>
            <div><label className={labelCls} htmlFor="reason">Customer’s return reason</label><textarea id="reason" name="reason" required rows={3} className={inputCls} placeholder="e.g. Arrived with a cracked lid and the box was crushed" /></div>
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Classifying reason…" : "Log return"}</Button>
          </form>
        </Card>
        <div>
          <h2 className="mb-3 text-sm font-semibold text-navy-900">Awaiting product identification ({pending.length})</h2>
          <ReturnsTable rows={pending} empty="No returns waiting at intake." />
        </div>
      </div>
    </>
  );
}
