"use client";

import { FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function AuthForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const redirectTo = useMemo(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return `${window.location.origin}/auth/callback`;
  }, []);

  const handleMagicLink = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError(null);
    setMessage(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (signInError) {
        throw signInError;
      }

      setMessage("Magic link sent. Check your email inbox.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to send magic link.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setMessage(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
        },
      });

      if (oauthError) {
        throw oauthError;
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Google sign in failed.");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm rounded-3xl border border-white/35 bg-white/90 p-7 shadow-[0_24px_80px_-40px_rgba(22,52,79,0.45)] backdrop-blur">
      <h1 className="font-display text-3xl text-slate-900">Groceries</h1>
      <p className="mt-1 text-sm text-slate-600">Sign in to manage your shared household list.</p>
      <p className="mt-2 text-xs italic text-slate-500">
        Built by Hamza for his beautiful wife Christine.
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleMagicLink}>
        <label className="block text-sm font-medium text-slate-700" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Sending..." : "Email Magic Link"}
        </button>
      </form>

      <div className="my-5 h-px bg-slate-200" />

      <button
        type="button"
        disabled={isLoading}
        onClick={handleGoogle}
        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-800 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Continue with Google
      </button>

      {message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
