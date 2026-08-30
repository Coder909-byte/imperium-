import type { Metadata } from "next";
import { BackToAtlasButton } from "./BackToAtlasButton";
import { ScenePlayerClient } from "./ScenePlayerClient";
import { buildSceneProps } from "./buildSceneProps";
import { loadRegionContent } from "./loadContent";

// M4: regions with authored content/regions/{id}.json get the real
// scene player. A region the atlas can route to but nobody has written
// content for yet (most of them, still — see content/regions/) keeps
// the M1 stub rather than a broken or blank page.
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
  const region = loadRegionContent(regionId);

  if (!region) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-semibold">{titleCase(regionId)}</h1>
        <p className="mt-2 text-sm text-neutral-500">No scene has been written for this region yet.</p>
        <div className="mt-6">
          <BackToAtlasButton />
        </div>
      </main>
    );
  }

  return <ScenePlayerClient region={buildSceneProps(region)} />;
}
