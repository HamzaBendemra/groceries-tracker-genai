import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { NavLinks } from "@/components/app/nav-links";
import { RefreshButton } from "@/components/app/refresh-button";
import { APP_VERSION } from "@/lib/version";

type AppShellProps = {
  children: ReactNode;
  displayName: string;
};

async function signOut() {
  "use server";

  const supabase = await createClient();
  await supabase.auth.signOut();
}

export function AppShell({ children, displayName }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#ffffff_0%,_#eef5ff_40%,_#fff4ea_72%,_#effbf5_100%)] pb-24">
      <header className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 pt-6 sm:px-8">
        <div className="flex items-start justify-between gap-4 rounded-3xl border border-white/45 bg-white/75 p-5 shadow-[0_30px_80px_-50px_rgba(16,23,49,0.35)] backdrop-blur">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Shared Household</p>
            <h1 className="font-display text-3xl text-slate-900">Family&apos;s Groceries</h1>
            <p className="mt-1 text-sm text-slate-600">Signed in as {displayName}</p>
          </div>
          <RefreshButton />
        </div>
        <NavLinks />
      </header>

      <main className="mx-auto mt-5 w-full max-w-5xl px-4 sm:px-8">{children}</main>
      <footer className="mx-auto mt-8 w-full max-w-5xl px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-xs font-medium text-slate-500 sm:px-8">
        <div className="grid grid-cols-3 items-center">
          <form action={signOut} className="justify-self-start">
            <button type="submit" className="touch-manipulation text-left underline-offset-2 hover:underline">
              Sign out
            </button>
          </form>
          <span className="text-center">For Christine ❤️</span>
          <span className="text-right">{APP_VERSION}</span>
        </div>
      </footer>
    </div>
  );
}
