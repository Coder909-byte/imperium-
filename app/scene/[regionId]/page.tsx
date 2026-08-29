import type { Metadata } from "next";

// Stub for M1 — region name only. The real scene engine (Pixi, beats,
// camera) is built in M4; this just proves the atlas routes here.
function titleCase(slug: string): string {
  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

export async function generateMetadata(props: PageProps<"/scene/[regionId]">): Promise<Metadata> {
  const { regionId } = await props.params;
  return { title: `${titleCase(regionId)} — Imperium` };
}

export default async function ScenePage(props: PageProps<"/scene/[regionId]">) {
  const { regionId } = await props.params;

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">{titleCase(regionId)}</h1>
      <p className="mt-2 text-sm text-neutral-500">Scene coming in M4.</p>
    </main>
  );
}
