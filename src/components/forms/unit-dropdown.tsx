"use client";

import { useEffect, useId, useRef, useState } from "react";

type UnitDropdownProps = {
  name: string;
  defaultValue?: string;
  options: readonly string[];
  className?: string;
};

export function UnitDropdown({ name, defaultValue = "unit", options, className }: UnitDropdownProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const initialValue = options.includes(defaultValue) ? defaultValue : options[0] ?? "unit";
  const [value, setValue] = useState(initialValue);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return (
    <div ref={wrapperRef} className={`relative ${className ?? ""}`.trim()}>
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
      >
        <span>{value}</span>
        <span className="text-slate-400">▾</span>
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 z-30 mt-1 max-h-44 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
        >
          {options.map((option) => (
            <li key={option}>
              <button
                type="button"
                role="option"
                aria-selected={value === option}
                onClick={() => {
                  setValue(option);
                  setOpen(false);
                }}
                className={`w-full rounded-lg px-2 py-2 text-left text-sm transition ${
                  value === option ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {option}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
