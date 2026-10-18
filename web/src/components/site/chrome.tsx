import Link from "next/link";
import { Logo } from "../ui";

const NAV = [
  { href: "/#demo", label: "Demo" },
  { href: "/use-cases", label: "Use cases" },
  { href: "/pricing", label: "Pricing" },
  { href: "/app", label: "Open dashboard" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-navy-800 bg-navy-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5">
        <Logo dark />
        <nav className="hidden items-center gap-6 text-sm text-navy-300 md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="hover:text-white">{n.label}</Link>
          ))}
        </nav>
        <Link href="/request-demo" className="rounded-lg bg-teal-500 px-3.5 py-2 text-sm font-semibold text-navy-950 hover:bg-teal-400">
          Request a demo
        </Link>
      </div>
      <nav className="flex gap-5 overflow-x-auto px-4 pb-2.5 text-sm text-navy-300 md:hidden">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className="whitespace-nowrap hover:text-white">{n.label}</Link>
        ))}
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-navy-950 text-navy-300">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3">
        <div>
          <Logo dark />
          <p className="mt-3 text-sm">AI-native returns processing and product recovery for retailers and fulfilment operators.</p>
        </div>
        <div className="text-sm">
          <div className="mb-2 font-semibold text-white">Product</div>
          <ul className="space-y-1.5">
            <li><Link href="/#demo" className="hover:text-white">Routing demo</Link></li>
            <li><Link href="/use-cases" className="hover:text-white">Use cases</Link></li>
            <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
            <li><Link href="/app" className="hover:text-white">Dashboard demo</Link></li>
          </ul>
        </div>
        <div className="text-xs leading-relaxed">
          <div className="mb-2 text-sm font-semibold text-white">About this demonstration</div>
          All products, brands, retailers, customers and records shown are fictional. Warehouse management, carrier and order-system
          integrations are simulated. AI outputs are advisory and never authorise refunds, disposal or inventory adjustments.
        </div>
      </div>
      <div className="border-t border-navy-800 py-4 text-center text-xs">© 2026 ReturnRoute (demonstration product)</div>
    </footer>
  );
}
