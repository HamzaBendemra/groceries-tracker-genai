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
    <nav className="flex gap-2 overflow-x-auto pb-1">
      {links.map((link) => {
        const isActive = pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={clsx(
              "rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition",
              isActive
                ? "bg-slate-900 text-white"
                : "bg-white/70 text-slate-700 hover:bg-white hover:text-slate-900",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
