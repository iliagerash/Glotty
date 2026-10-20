"use client";

import { useState } from "react";
import { signIn, signOut, signUp, useSession } from "@/lib/auth-client";

/**
 * Renders its children only for a signed-in account. Which accounts may
 * annotate is decided on the server (GLOTTY_ANNOTATOR_EMAILS).
 */
export function SignInGate({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (isPending) return <p className="mx-auto max-w-sm px-4 py-16 text-slate-500">Loading…</p>;

  if (session) {
    return (
      <>
        <div className="flex justify-end gap-3 px-4 pt-3 text-sm text-slate-500">
          <span>{session.user.email}</span>
          <button className="underline" onClick={() => signOut()}>
            Sign out
          </button>
        </div>
        {children}
      </>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res =
      mode === "sign-in"
        ? await signIn.email({ email: email.trim().toLowerCase(), password })
        : await signUp.email({ name: name.trim(), email: email.trim().toLowerCase(), password });
    setBusy(false);
    if (res.error) setError(res.error.message ?? "That didn't work");
  };

  const input = "mt-1 w-full rounded border border-slate-300 px-3 py-2";
  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-semibold">{mode === "sign-in" ? "Sign in" : "Create an account"}</h1>
      <form onSubmit={submit} className="mt-6 space-y-4">
        {mode === "sign-up" && (
          <label className="block text-sm">
            Name
            <input className={input} value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
        )}
        <label className="block text-sm">
          Email
          <input className={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="block text-sm">
          Password
          <input
            className={input}
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="w-full rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50">
          {mode === "sign-in" ? "Sign in" : "Create account"}
        </button>
      </form>
      <button
        className="mt-4 text-sm text-slate-600 underline"
        onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
      >
        {mode === "sign-in" ? "No account yet? Create one" : "Have an account? Sign in"}
      </button>
    </main>
  );
}
