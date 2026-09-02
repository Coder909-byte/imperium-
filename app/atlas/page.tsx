import { Suspense } from "react";
import type { Metadata } from "next";
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
    <main className="p-6">
      <AtlasMap {...props} />
      {/* Suspense keeps useSearchParams from opting the whole page into
          dynamic rendering — see DevPlaceholderLink for why this exists. */}
      <Suspense fallback={null}>
        <DevPlaceholderLink />
      </Suspense>
    </main>
  );
}
