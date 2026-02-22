"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ToggleGroceryRowProps = {
  groceryItemId: string;
  checked: boolean;
  title: string;
  subtitle?: string | null;
  quantityLabel: string;
  className?: string;
};

export function ToggleGroceryRow({
  groceryItemId,
  checked,
  title,
  subtitle,
  quantityLabel,
  className,
}: ToggleGroceryRowProps) {
  const router = useRouter();
  const [optimisticChecked, setOptimisticChecked] = useState(checked);
  const [pending, setPending] = useState(false);

  const toggle = async () => {
    if (pending) {
      return;
    }

    const nextChecked = !optimisticChecked;
    setOptimisticChecked(nextChecked);
    setPending(true);

    try {
      const response = await fetch("/api/groceries/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groceryItemId,
          checked: nextChecked,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to update item.");
      }

      router.refresh();
    } catch {
      setOptimisticChecked(!nextChecked);
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={`flex w-full items-center justify-between gap-3 text-left touch-manipulation disabled:opacity-70 ${className ?? ""}`.trim()}
      aria-label={`${optimisticChecked ? "Mark" : "Check"} ${title}`}
    >
      <span
        className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[10px] font-bold ${
          optimisticChecked
            ? "border-emerald-700 bg-emerald-600 text-white"
            : "border-slate-400 bg-white text-transparent"
        }`}
      >
        ✓
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block truncate text-sm ${optimisticChecked ? "text-slate-500 line-through" : "font-medium text-slate-900"}`}
        >
          {title}
        </span>
        {subtitle && !optimisticChecked ? <span className="block truncate text-xs text-slate-500">{subtitle}</span> : null}
      </span>
      <span className="text-sm font-medium text-slate-700">{quantityLabel}</span>
    </button>
  );
}
