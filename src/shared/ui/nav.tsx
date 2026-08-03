"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/shared/lib/cn";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/accounts", label: "Accounts" },
  { href: "/budget", label: "Budget" },
  { href: "/goals", label: "Goals" },
  { href: "/forecasts", label: "Forecasts" },
  { href: "/settings", label: "Settings" },
] as const;

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col border-b border-border md:h-full md:border-b-0 md:border-r">
      <div className="border-b border-border px-5 py-4 md:px-6 md:py-5">
        <span className="text-sm font-bold uppercase tracking-widest">
          Finance OS
        </span>
      </div>
      {/* A scrolling strip on phones, a stacked list from md up. */}
      <ul className="flex flex-1 overflow-x-auto md:block md:overflow-visible">
        {links.map((link) => {
          const isActive =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);

          return (
            <li
              key={link.href}
              className="shrink-0 border-r border-border last:border-r-0 md:border-r-0 md:border-b"
            >
              <Link
                href={link.href}
                className={cn(
                  "block whitespace-nowrap px-5 py-3 text-sm uppercase tracking-wide transition-colors duration-150 md:px-6",
                  isActive
                    ? "bg-foreground text-background"
                    : "text-foreground hover:bg-foreground/10",
                )}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
