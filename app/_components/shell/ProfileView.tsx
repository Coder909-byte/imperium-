import Link from "next/link";
import type { ReactNode } from "react";
import { Shell, Compass } from "./Shell";

export function ProfileView({ email, logout }: { email: string; logout: ReactNode }) {
  return (
    <Shell account>
      <main id="main-content" className="shell-width profile-main py-14 sm:py-20">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div><p className="shell-eyebrow">Your account</p><h1 className="shell-heading mt-4">A place for<br /><em>what comes next.</em></h1></div>
          {logout}
        </div>
        <dl className="profile-details mt-10 py-6"><dt className="shell-eyebrow mb-2">Email</dt><dd className="break-all text-lg">{email}</dd></dl>
        <section className="profile-empty flex flex-col items-center px-5 py-14 text-center" aria-labelledby="profile-empty-title">
          <Compass className="mb-7 h-20 w-20" />
          <p className="shell-eyebrow">Still being charted</p>
          <h2 id="profile-empty-title" className="mt-4 text-3xl">Your journeys will have a home here.</h2>
          <p className="mt-4 max-w-md leading-relaxed">Saved progress, quiz history and achievements are not available yet. For now, the atlas and Gallia are open to explore.</p>
          <Link href="/atlas" prefetch={false} className="shell-button shell-button-primary mt-8">Explore the Atlas <span aria-hidden="true">↗</span></Link>
        </section>
      </main>
    </Shell>
  );
}
