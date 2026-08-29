import Link from "next/link";

// Placeholder landing page. The real atlas-driven home page lands in M1.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">Imperium</h1>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        An interactive historical atlas. Click a region, watch what happened
        there, then get tested on whether you were paying attention.
      </p>
      <div className="flex gap-4">
        <Link
          href="/signup"
          className="rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          Sign up
        </Link>
        <Link
          href="/login"
          className="rounded-full border border-black/[.08] px-5 py-3 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
        >
          Log in
        </Link>
      </div>
    </main>
  );
}
