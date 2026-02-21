import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function AuthPage() {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      redirect("/groceries");
    }
  }

  return (
    <div className="flex min-h-screen flex-col justify-between bg-[radial-gradient(circle_at_10%_20%,_#d9f2ff,_transparent_40%),radial-gradient(circle_at_90%_10%,_#fce4cf,_transparent_35%),#f4f7fb] px-4 py-10">
      <div className="flex flex-1 items-center justify-center">
        {isSupabaseConfigured ? (
          <AuthForm />
        ) : (
          <div className="w-full max-w-md rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
            <h1 className="font-display text-3xl">Setup required</h1>
            <p className="mt-2 text-sm">
              Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment to enable sign in.
            </p>
          </div>
        )}
      </div>
      <p className="pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center text-xs font-medium text-slate-500">
        For Christine ❤️
      </p>
    </div>
  );
}
