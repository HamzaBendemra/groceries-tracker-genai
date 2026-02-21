"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

const links = [
  { href: "/groceries", label: "Groceries" },
  { href: "/recipes", label: "Recipes" },
  { href: "/household", label: "Household" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-2 overflow-x-auto rounded-2xl bg-white/65 p-1.5 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.45)]">
      {links.map((link) => {
        const isActive = pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={clsx(
              "min-h-11 rounded-full px-4 py-2.5 text-sm font-medium whitespace-nowrap transition",
              isActive
                ? "bg-slate-900 text-white shadow-[0_10px_20px_-14px_rgba(15,23,42,0.8)]"
                : "text-slate-700 hover:bg-white hover:text-slate-900",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
