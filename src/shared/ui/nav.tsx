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
    <nav className="flex h-full flex-col border-r border-border">
      <div className="border-b border-border px-6 py-5">
        <span className="text-sm font-bold uppercase tracking-widest">
          Finance OS
        </span>
      </div>
      <ul className="flex-1">
        {links.map((link) => {
          const isActive =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);

          return (
            <li key={link.href} className="border-b border-border">
              <Link
                href={link.href}
                className={cn(
                  "block px-6 py-3 text-sm uppercase tracking-wide transition-colors duration-150",
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
