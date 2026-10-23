import Link from "next/link";
import { Shell, Compass } from "./Shell";
import { Artwork } from "./Artwork";
import { AuthForm } from "./AuthForm";

export function AuthPage({ mode }: { mode: "login" | "signup" }) {
  const signup = mode === "signup";
  return (
    <Shell authArt>
      <main id="main-content" className="shell-width auth-layout my-5 grid md:grid-cols-[1.1fr_1fr]">
        <section className="auth-art relative isolate overflow-hidden" aria-label="Explore Imperium">
          <Artwork auth />
          <div className="auth-art-shade absolute inset-0" />
          <div className="auth-art-copy relative z-10 flex h-full flex-col justify-end">
            <Compass className="mb-6 h-12 w-12" />
            <p className="shell-eyebrow mb-3">The Roman world awaits</p>
            <h2>Every place<br />holds <em>a story.</em></h2>
            <p className="mt-5 max-w-xs leading-relaxed">Begin with Gallia. Follow the siege of Alesia through six narrated scenes.</p>
            <Link href="/scene/gallia" prefetch={false} className="mt-6 inline-block underline underline-offset-4">Experience Gallia <span aria-hidden="true">→</span></Link>
          </div>
        </section>
        <section className="auth-panel flex flex-col justify-center">
          <p className="shell-eyebrow">Your Imperium account</p>
          <h1 className="shell-heading mt-3">{signup ? "Begin your journey." : "Welcome back."}</h1>
          <p className="auth-intro mt-4 mb-8 leading-relaxed">{signup ? "Create an account with email or Google. Saved progress and quizzes are still to come." : "Log in with your email or Google account."}</p>
          <AuthForm mode={mode} />
          <p className="auth-open-note mt-8 pt-5 text-center text-xs leading-relaxed">You can explore without an account.<br /><Link href="/atlas" prefetch={false}>Continue to the atlas <span aria-hidden="true">→</span></Link></p>
        </section>
      </main>
    </Shell>
  );
}
