"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clsx } from "clsx";
import { useEffect, useState } from "react";

const links = [
  { href: "/groceries", label: "Groceries" },
  { href: "/recipes", label: "Recipes" },
];

export function NavLinks() {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    links.forEach((link) => {
      router.prefetch(link.href);
    });
  }, [router]);

  return (
    <nav className="grid grid-cols-2 gap-2 rounded-2xl bg-white/65 p-1.5 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.45)] touch-manipulation">
      {links.map((link) => {
        const isActive = pathname.startsWith(link.href) || pendingHref === link.href;

        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setPendingHref(link.href)}
            onTouchStart={() => {
              setPendingHref(link.href);
              router.prefetch(link.href);
            }}
            className={clsx(
              "min-h-11 rounded-full px-3 py-2.5 text-center text-sm font-medium transition touch-manipulation",
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
