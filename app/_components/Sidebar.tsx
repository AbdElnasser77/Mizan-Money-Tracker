"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type NavItem = { href: string; label: string; icon: string };

const SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Main menu",
    items: [
      { href: "/", label: "Overview", icon: "M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z" },
      { href: "/transactions", label: "Transactions", icon: "M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3" },
      { href: "/income", label: "Salaries & Income", icon: "M3 7h18v12H3zM3 11h18M7 15h3M16 3l-4 4-4-4" },
    ],
  },
  {
    title: "Tools",
    items: [
      { href: "/settings", label: "Settings", icon: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" },
    ],
  },
];

export function Icon({ d, className = "h-5 w-5" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} shrink-0`} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-800 text-white shadow-sm">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
          <path d="M12 4v16M6 20h12M4 8h16M7 8l-3 6a3 3 0 006 0zM17 8l-3 6a3 3 0 006 0z" />
        </svg>
      </div>
      <span className="text-2xl font-medium tracking-tight text-ink">Mizan</span>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-shell px-4 py-3 md:hidden">
        <Logo />
        <button type="button" onClick={() => setOpen(true)} className="rounded-lg p-2 text-muted hover:bg-card" aria-label="Open menu">
          <Icon d="M4 6h16M4 12h16M4 18h16" />
        </button>
      </header>

      {open && <div className="fixed inset-0 z-40 bg-ink/30 md:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-shell px-3 py-4 transition-transform md:sticky md:top-5 md:h-[calc(100vh-4rem)] md:translate-x-0 md:py-2 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-line px-2 pb-5 pt-1">
          <Logo />
        </div>

        <nav className="mt-4 flex flex-1 flex-col gap-6 overflow-y-auto">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-muted">{section.title}</p>
              <div className="flex flex-col gap-1">
                {section.items.map((item) => {
                  const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition-colors ${
                        active ? "bg-white font-medium text-ink shadow-[0_1px_2px_rgb(0_0_0/0.04)]" : "text-[#4a5858] hover:bg-white/60 hover:text-ink"
                      }`}
                    >
                      <Icon d={item.icon} className={`h-5 w-5 ${active ? "text-brand-800" : ""}`} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="rounded-2xl bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-brand-800">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-brand-50">
              <Icon d="M12 3v18M17 7H9.5a3 3 0 000 6h5a3 3 0 010 6H6" className="h-4 w-4" />
            </span>
            Tip
          </div>
          <p className="mt-2 text-sm text-ink">Set a budget for each month.</p>
          <p className="mt-0.5 text-xs text-muted">The progress bar shows how much of it you&apos;ve spent.</p>
        </div>
      </aside>
    </>
  );
}
