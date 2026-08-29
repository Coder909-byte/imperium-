"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const { error: signUpError } = await authClient.signUp.email({
      email,
      password,
      name: email.split("@")[0] ?? email,
    });

    if (signUpError) {
      setError(signUpError.message ?? "Sign up failed. Try again.");
      setPending(false);
      return;
    }

    // The browser applies Better Auth's Set-Cookie before this promise
    // resolves, so the profile page's server-side session read already
    // sees it by the time this navigation's RSC request goes out.
    router.push("/profile");
    router.refresh();
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4"
      >
        <h1 className="text-2xl font-semibold tracking-tight">Sign up</h1>

        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded border border-black/[.15] px-3 py-2 dark:border-white/[.2] dark:bg-black"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded border border-black/[.15] px-3 py-2 dark:border-white/[.2] dark:bg-black"
          />
        </label>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
        >
          {pending ? "Signing up…" : "Sign up"}
        </button>

        <button
          type="button"
          onClick={() =>
            authClient.signIn.social({ provider: "google", callbackURL: "/profile" })
          }
          className="rounded-full border border-black/[.15] px-5 py-3 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.2] dark:hover:bg-[#1a1a1a]"
        >
          Continue with Google
        </button>

        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Already have an account?{" "}
          <Link href="/login" className="font-medium underline">
            Log in
          </Link>
        </p>
      </form>
    </main>
  );
}
