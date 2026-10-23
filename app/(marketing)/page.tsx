import Link from "next/link";
import type { Metadata } from "next";
import { Shell, Compass } from "@/app/_components/shell/Shell";
import { Artwork } from "@/app/_components/shell/Artwork";
import "./landing.css";

export const metadata: Metadata = {
  title: "Imperium — An interactive historical atlas",
  description: "Explore the Roman world through a period atlas and narrated stories. Begin with Gallia and the siege of Alesia in 52 BC. No account required.",
};

export default function Home() {
  return (
    <Shell backdrop={<Artwork fullBleed />}>
      <main id="main-content">
        <section className="landing-opening" aria-labelledby="imperium-title">
          <div className="hero-masthead shell-width text-center">
            <p className="shell-eyebrow flex items-center justify-center gap-4"><span aria-hidden="true">—</span> An interactive historical atlas <span aria-hidden="true">—</span></p>
            <h1 id="imperium-title" className="hero-wordmark">IMPERIUM</h1>
            <div className="hero-edition flex items-center justify-between"><span>Volume I · The Roman world</span><span>Places become stories</span></div>
          </div>
          <div className="hero-scene shell-width relative">
            <div className="hero-copy relative z-10">
              <div className="hero-introduction">
              <h2>History has a place. <em>Start there.</em></h2>
              <p className="hero-description">Explore a map of the Roman world. Step into a narrated story, told through painted scenes and the sources behind it.</p>
              </div>
              <div className="hero-entry">
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/atlas" prefetch={false} className="shell-button shell-button-light">Explore the Atlas <span aria-hidden="true">↗</span></Link>
                <Link href="/scene/gallia" prefetch={false} className="shell-button shell-button-ghost">Experience Gallia <span aria-hidden="true">→</span></Link>
              </div>
              <p className="hero-note mt-4">Open to everyone. No account required.</p>
              </div>
            </div>
          </div>
          <div className="flagship-strip shell-width flex flex-col justify-between gap-3 py-6 sm:flex-row sm:items-center">
            <p><span className="shell-eyebrow block mb-1">Available flagship</span><span className="text-xl">Gallia · The siege of Alesia</span></p>
            <p className="text-sm">52 BC <span aria-hidden="true" className="mx-3">/</span> Six narrated scenes <span aria-hidden="true" className="mx-3">/</span> <Link href="/scene/gallia" prefetch={false} className="shell-text-link">Enter the story →</Link></p>
          </div>
        </section>
        <section className="shell-width journey-section" aria-labelledby="journey-title">
          <div className="journey-heading flex items-start justify-between gap-8">
            <div><p className="shell-eyebrow">How to explore</p><h2 id="journey-title" className="shell-heading mt-3">A map is only<br /><em>the beginning.</em></h2></div>
            <Compass className="journey-compass h-24 w-24 shrink-0" />
          </div>
          <ol className="journey-steps mt-10 grid gap-8 md:grid-cols-3">
            <li><span className="step-number">I</span><h3>Find a place.</h3><p>Move through four eras on the atlas. Gallia is ready to explore; other provinces are marked coming soon.</p><span className="feature-status">Atlas available</span></li>
            <li><span className="step-number">II</span><h3>Follow the story.</h3><p>Watch Alesia unfold in six painted scenes. Listen to the narration, read at your own pace and open the sources.</p><span className="feature-status">Gallia available</span></li>
            <li><span className="step-number">III</span><h3>Test what stays.</h3><p>A short quiz will bring you back to the details that matter. Quizzes and saved progress are still being built.</p><span className="feature-status feature-planned">Planned</span></li>
          </ol>
        </section>
        <section className="shell-width closing-invitation flex flex-col justify-between gap-6 md:flex-row md:items-center" aria-labelledby="invitation-title">
          <div><p className="shell-eyebrow">Begin in Gallia · 52 BC</p><h2 id="invitation-title" className="shell-heading mt-3">One hill. Two walls.<br /><em>An empire at stake.</em></h2></div>
          <div className="max-w-sm"><p className="mb-6 leading-relaxed">Caesar surrounds Alesia. A relief army arrives behind him. Follow the siege from the first wall to the surrender.</p><Link href="/scene/gallia" prefetch={false} className="shell-button shell-button-primary">Experience Gallia <span aria-hidden="true">→</span></Link></div>
        </section>
      </main>
    </Shell>
  );
}
