"use client";

import { FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.2-1.4 3.5-5.5 3.5-3.3 0-6-2.8-6-6.2s2.7-6.2 6-6.2c1.9 0 3.2.8 3.9 1.5l2.7-2.7C17.3 2.7 14.9 1.6 12 1.6 6.6 1.6 2.2 6 2.2 11.4s4.4 9.8 9.8 9.8c5.6 0 9.3-3.9 9.3-9.4 0-.6-.1-1.1-.2-1.6H12z"
      />
      <path fill="#34A853" d="M2.2 11.4c0-1.7.7-3.3 1.8-4.5l3 2.3c-.5.6-.8 1.4-.8 2.2s.3 1.6.8 2.2l-3 2.3c-1.1-1.2-1.8-2.8-1.8-4.5z" />
      <path fill="#4285F4" d="M12 21.2c2.7 0 4.9-.9 6.5-2.4l-3.1-2.4c-.9.6-2 .9-3.4.9-2.6 0-4.7-1.7-5.5-4.1L3.4 15.6c1.8 3.5 5 5.6 8.6 5.6z" />
      <path fill="#FBBC05" d="M6.5 13.2c-.2-.6-.3-1.2-.3-1.8s.1-1.2.3-1.8L3.4 7.2c-.7 1.3-1.2 2.7-1.2 4.2s.4 2.9 1.2 4.2l3.1-2.4z" />
    </svg>
  );
}

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
      <h1 className="font-display text-3xl text-slate-900">Family Groceries</h1>
      <p className="mt-1 text-sm text-slate-600">Sign in to manage your shared household list.</p>
      <div className="my-5 h-px bg-slate-200" />

      <button
        type="button"
        disabled={isLoading}
        onClick={handleGoogle}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-800 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <GoogleMark />
        <span>Sign in with Google</span>
      </button>

      <div className="my-5 h-px bg-slate-200" />

      <form className="space-y-4" onSubmit={handleMagicLink}>
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

      {message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
