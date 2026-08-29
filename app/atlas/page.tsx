import type { Metadata } from "next";
import { AtlasMap } from "@/engine/atlas/AtlasMap";
import { loadAtlasContent } from "./loadContent";
import { buildAtlasProps } from "./buildAtlasProps";

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
    </main>
  );
}
