import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { AtlasMap } from "@/engine/atlas/AtlasMap";
import { loadAtlasContent } from "./loadContent";
import { buildAtlasProps } from "./buildAtlasProps";
import { DevPlaceholderLink } from "./DevPlaceholderLink";

export const metadata: Metadata = {
  title: "Atlas — Imperium",
  description: "An interactive period map of the Roman world, 350 BC to 486 AD.",
};

// Server Component shell: loads content and does all projection work
// here, so the client only ever receives finished path strings — see
// engine/atlas/AtlasMap.tsx for the interactive piece.
export default function AtlasPage() {
  const content = loadAtlasContent();
  const props = buildAtlasProps(content);

  return (
    <div className="min-h-screen bg-[#f1eadb] text-[#30271a]">
      <a href="#main-content" className="sr-only z-50 bg-[#f1eadb] p-4 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to atlas</a>
      <header className="mx-auto flex max-w-[1576px] flex-wrap items-center justify-between gap-5 border-b border-[#c4b594] px-4 py-5 sm:px-8 lg:px-12">
        <Link href="/" className="font-[family-name:var(--font-cinzel)] text-lg tracking-[.16em] focus-visible:outline-2 focus-visible:outline-offset-4">IMPERIUM</Link>
        <nav aria-label="Main navigation" className="flex items-center gap-5 text-sm sm:gap-8">
          <Link href="/" className="hover:underline focus-visible:outline-2 focus-visible:outline-offset-4">Home</Link>
          <Link href="/scene/gallia" prefetch={false} className="hover:underline focus-visible:outline-2 focus-visible:outline-offset-4">Gallia</Link>
          <Link href="/login" className="hover:underline focus-visible:outline-2 focus-visible:outline-offset-4">Log in <span aria-hidden="true">↗</span></Link>
        </nav>
      </header>
      <main id="main-content" className="mx-auto max-w-[1576px] px-4 pb-8 pt-8 sm:px-8 lg:px-12 lg:pt-10">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-x-12 gap-y-4">
          <div>
            <p className="mb-2 font-[family-name:var(--font-cinzel)] text-xs tracking-[.16em] text-[#6c382d]">The historical atlas</p>
            <h1 className="font-[family-name:var(--font-cinzel)] text-3xl sm:text-4xl">The Roman world.</h1>
          </div>
          <p className="max-w-md font-serif text-base leading-relaxed text-[#63533e]">Follow Rome across four eras. Choose a period, then a province to see its story status.</p>
        </div>
        <AtlasMap {...props} />
      {/* Suspense keeps useSearchParams from opting the whole page into
          dynamic rendering — see DevPlaceholderLink for why this exists. */}
      <Suspense fallback={null}>
        <DevPlaceholderLink />
      </Suspense>
      </main>
      <footer className="mx-auto flex max-w-[1576px] flex-wrap justify-between gap-3 border-t border-[#c4b594] px-4 py-6 text-xs leading-relaxed text-[#63533e] sm:px-8 lg:px-12">
        <p>350 BC — 486 AD · Provincial boundaries are approximate.</p>
        <p>Relief: <a href="https://www.naturalearthdata.com/about/terms-of-use/" className="underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-4">Natural Earth, public domain</a>. Modern physical geography.</p>
      </footer>
    </div>
  );
}
