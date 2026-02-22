"use client";

export function RefreshButton() {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="min-h-11 min-w-11 touch-manipulation rounded-full border border-slate-300 bg-white p-2.5 text-slate-700 transition hover:border-slate-500 hover:text-slate-900"
      aria-label="Refresh page"
      title="Refresh"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M21 12a9 9 0 1 1-2.64-6.36" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M21 3v6h-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
