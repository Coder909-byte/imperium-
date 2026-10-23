"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const signup = mode === "signup";
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"email" | "google" | "success" | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    setPending("email");
    try {
      const result = signup
        ? await authClient.signUp.email({ email, password, name: email.split("@")[0] ?? email })
        : await authClient.signIn.email({ email, password });
      if (result.error) {
        setError(result.error.message ?? (signup ? "Sign up failed. Try again." : "Log in failed. Check your email and password."));
        setPending(null);
        return;
      }
      // Better Auth applies its session cookie before the profile's server read.
      setPending("success");
      router.push("/profile");
      router.refresh();
    } catch {
      setError("Could not connect. Check your connection and try again.");
      setPending(null);
    }
  }

  async function handleGoogle() {
    if (pending) return;
    setError(null);
    setPending("google");
    try {
      const result = await authClient.signIn.social({ provider: "google", callbackURL: "/profile" });
      if (result.error) {
        setError(result.error.message ?? "Google sign-in could not start. Try again.");
        setPending(null);
      }
    } catch {
      setError("Could not connect to Google sign-in. Try again.");
      setPending(null);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form flex flex-col gap-5" aria-busy={pending !== null} aria-describedby={error ? "auth-error" : undefined}>
      <div>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" autoCapitalize="none" spellCheck={false} value={email} onChange={(event) => setEmail(event.target.value)} disabled={pending !== null} placeholder="you@example.com" />
      </div>
      <div>
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required minLength={signup ? 8 : undefined} autoComplete={signup ? "new-password" : "current-password"} aria-describedby={signup ? "password-help" : undefined} value={password} onChange={(event) => setPassword(event.target.value)} disabled={pending !== null} />
        {signup && <p id="password-help" className="mt-2 text-xs">Use at least 8 characters.</p>}
      </div>
      {error && <p id="auth-error" role="alert" className="form-error">{error}</p>}
      <button type="submit" disabled={pending !== null} className="shell-button shell-button-primary w-full">
        {pending === "email" ? (signup ? "Creating account…" : "Logging in…") : pending === "success" ? "Opening your account…" : signup ? "Sign up" : "Log in"}
        <span aria-hidden="true">→</span>
      </button>
      <p role="status" className="sr-only">{pending === "success" ? "Signed in. Opening your account." : pending === "email" ? "Submitting your details." : pending === "google" ? "Opening Google sign-in." : ""}</p>
      <div className="auth-divider flex items-center gap-4"><span />or<span /></div>
      <button type="button" onClick={handleGoogle} disabled={pending !== null} className="shell-button shell-button-outline w-full">
        <span className="google-initial" aria-hidden="true">G</span>{pending === "google" ? "Connecting to Google…" : "Continue with Google"}
      </button>
      <p className="auth-switch mt-1 text-center text-sm">{signup ? "Already have an account? " : "New to Imperium? "}<Link href={signup ? "/login" : "/signup"}>{signup ? "Log in" : "Create an account"}</Link></p>
    </form>
  );
}
