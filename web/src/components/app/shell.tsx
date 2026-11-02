"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3, CheckSquare, ClipboardList, FlaskConical, LayoutDashboard, Menu, PackagePlus, PoundSterling, RotateCcw, ScanSearch, Settings2, Truck, X,
} from "lucide-react";
import { DEMO_USERS, StoreProvider, useStore } from "@/lib/store";
import { Logo, cx } from "../ui";

const NAV = [
  { href: "/app", label: "Overview", icon: LayoutDashboard },
  { href: "/app/intake", label: "Returns intake", icon: PackagePlus },
  { href: "/app/inspection", label: "Inspection queue", icon: ScanSearch },
  { href: "/app/approvals", label: "Staff approval", icon: CheckSquare },
  { href: "/app/tasks", label: "Warehouse tasks", icon: Truck },
  { href: "/app/returns", label: "All returns", icon: ClipboardList },
  { href: "/app/reports", label: "Recovery value", icon: PoundSterling },
  { href: "/app/analytics", label: "Returns analytics", icon: BarChart3 },
  { href: "/app/rules", label: "Business rules", icon: Settings2 },
];

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  const { state } = useStore();
  const counts: Record<string, number> = state
    ? {
        "/app/intake": state.returns.filter((r) => r.stage === "intake").length,
        "/app/inspection": state.returns.filter((r) => r.stage === "inspection" || r.stage === "verification").length,
        "/app/approvals": state.returns.filter((r) => r.stage === "approval").length,
        "/app/tasks": state.returns.flatMap((r) => r.tasks).filter((t) => t.status !== "done").length,
      }
    : {};
  return (
    <nav className="flex flex-col gap-0.5 px-3">
      {NAV.map((n) => {
        const active = n.href === "/app" ? path === "/app" : path.startsWith(n.href);
        return (
          <Link key={n.href} href={n.href} onClick={onNavigate}
            className={cx("flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm", active ? "bg-navy-800 text-white" : "text-navy-300 hover:bg-navy-800/60 hover:text-white")}>
            <n.icon className={cx("h-4 w-4", active && "text-teal-400")} />
            <span className="flex-1">{n.label}</span>
            {counts[n.href] ? <span className="rounded-full bg-signal-500 px-1.5 text-[11px] font-semibold text-white">{counts[n.href]}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}

function TopBar({ onMenu }: { onMenu: () => void }) {
  const { state, setUser, resetDemo } = useStore();
  return (
    <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur">
      <button className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={onMenu} aria-label="Open navigation"><Menu className="h-5 w-5" /></button>
      <span className="inline-flex items-center gap-1 rounded-full bg-signal-100 px-2.5 py-1 text-xs font-medium text-signal-700">
        <FlaskConical className="h-3.5 w-3.5" /> Demo<span className="hidden sm:inline"> · fictional data · simulated WMS</span>
      </span>
      <div className="ml-auto flex min-w-0 items-center gap-2">
        <label className="hidden text-xs text-slate-500 sm:block" htmlFor="user">Signed in as</label>
        <select id="user" className="min-w-0 max-w-[11rem] rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm sm:max-w-none" value={state?.user.name ?? ""}
          onChange={(e) => { const u = DEMO_USERS.find((x) => x.name === e.target.value); if (u) setUser(u); }}>
          {DEMO_USERS.map((u) => <option key={u.name} value={u.name}>{u.name} · {u.role}</option>)}
        </select>
        <button onClick={() => { if (confirm("Reset the demo to its original fictional data?")) resetDemo(); }}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-100" title="Reset demo data">
          <RotateCcw className="h-3.5 w-3.5" /> <span className="hidden md:inline">Reset</span>
        </button>
      </div>
    </div>
  );
}

function Gate({ children }: { children: React.ReactNode }) {
  const { state } = useStore();
  if (!state) return <div className="p-8 text-sm text-slate-500">Loading demo data…</div>;
  return <>{children}</>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <StoreProvider>
      <div className="flex min-h-screen bg-slate-50">
        <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col gap-6 bg-navy-950 py-5 lg:flex">
          <div className="px-6"><Logo dark href="/app" /></div>
          <Sidebar />
          <Link href="/" className="mt-auto px-6 text-xs text-navy-300 hover:text-white">← Public website</Link>
        </aside>
        {open && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-navy-950/60" onClick={() => setOpen(false)} />
            <aside className="absolute inset-y-0 left-0 flex w-64 flex-col gap-6 bg-navy-950 py-5">
              <div className="flex items-center justify-between px-6"><Logo dark href="/app" /><button onClick={() => setOpen(false)} aria-label="Close navigation" className="text-navy-300"><X className="h-5 w-5" /></button></div>
              <Sidebar onNavigate={() => setOpen(false)} />
            </aside>
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
          <TopBar onMenu={() => setOpen(true)} />
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6"><Gate>{children}</Gate></main>
        </div>
      </div>
    </StoreProvider>
  );
}

export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-navy-900">{title}</h1>
        {sub && <p className="mt-1 text-sm text-slate-500">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

/** Use inside pages rendered under <Gate>: state is guaranteed loaded. */
export function useApp() {
  const s = useStore();
  return { ...s, state: s.state! };
}
