"use client";

import { useState } from "react";

export function RefreshButton() {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    if (refreshing) {
      return;
    }

    setRefreshing(true);
    window.setTimeout(() => {
      window.location.reload();
    }, 120);
  };

  return (
    <button
      type="button"
      onClick={handleRefresh}
      disabled={refreshing}
      className="min-h-11 touch-manipulation rounded-full border border-slate-300 bg-white px-3 py-2.5 text-slate-700 transition hover:border-slate-500 hover:text-slate-900 disabled:cursor-wait disabled:opacity-80"
      aria-label={refreshing ? "Refreshing page" : "Refresh page"}
      title={refreshing ? "Refreshing..." : "Refresh"}
    >
      {refreshing ? (
        <span className="flex items-center gap-1.5 text-xs font-medium">
          <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M21 12a9 9 0 1 1-2.64-6.36" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M21 3v6h-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Refreshing...
        </span>
      ) : (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M21 12a9 9 0 1 1-2.64-6.36" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M21 3v6h-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}
