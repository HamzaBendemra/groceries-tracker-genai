import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { NavLinks } from "@/components/app/nav-links";

type AppShellProps = {
  children: ReactNode;
  displayName: string;
  householdName: string;
};

async function signOut() {
  "use server";

  const supabase = await createClient();
  await supabase.auth.signOut();
}

export function AppShell({ children, displayName, householdName }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#fff_0%,_#eef4ff_45%,_#f9efe8_100%)] pb-20">
      <header className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 pt-6 sm:px-8">
        <div className="flex items-start justify-between gap-4 rounded-3xl border border-white/40 bg-white/70 p-5 shadow-[0_30px_80px_-50px_rgba(16,23,49,0.35)] backdrop-blur">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Shared Household</p>
            <h1 className="font-display text-3xl text-slate-900">{householdName}</h1>
            <p className="mt-1 text-sm text-slate-600">Signed in as {displayName}</p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 transition hover:border-slate-500 hover:text-slate-900"
            >
              Sign out
            </button>
          </form>
        </div>
        <NavLinks />
      </header>

      <main className="mx-auto mt-5 w-full max-w-5xl px-4 sm:px-8">{children}</main>
    </div>
  );
}
