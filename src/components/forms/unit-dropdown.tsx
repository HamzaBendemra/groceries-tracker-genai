"use client";

import { useEffect, useId, useRef, useState } from "react";

type UnitDropdownProps = {
  name?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  options: readonly string[];
  className?: string;
};

export function UnitDropdown({
  name,
  defaultValue = "unit",
  value: controlledValue,
  onChange,
  options,
  className,
}: UnitDropdownProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const initialValue = options.includes(defaultValue) ? defaultValue : options[0] ?? "unit";
  const [internalValue, setInternalValue] = useState(initialValue);
  const [open, setOpen] = useState(false);
  const value = controlledValue ?? internalValue;

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className={`relative ${className ?? ""}`.trim()}>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-11 w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
      >
        <span>{value}</span>
        <span className="text-slate-400">▾</span>
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close unit selector"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 bg-slate-900/20 backdrop-blur-[1px] sm:hidden"
          />
          <ul
            id={listId}
            role="listbox"
            className="fixed inset-x-3 bottom-3 z-40 max-h-[52vh] overflow-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl sm:absolute sm:left-0 sm:right-auto sm:top-full sm:mt-1 sm:max-h-44 sm:w-full sm:rounded-xl sm:border sm:p-1 sm:shadow-lg"
          >
            <li className="px-2 pb-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500 sm:hidden">
              Choose unit
            </li>
            {options.map((option) => (
              <li key={option}>
                <button
                  type="button"
                  role="option"
                  aria-selected={value === option}
                  onClick={() => {
                    if (controlledValue === undefined) {
                      setInternalValue(option);
                    }
                    onChange?.(option);
                    setOpen(false);
                  }}
                  className={`min-h-11 w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                    value === option ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {option}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
