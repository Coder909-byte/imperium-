import type { Metadata } from "next";
import { NotYetWritten } from "./NotYetWritten";
import { ScenePlayerClient } from "./ScenePlayerClient";
import { buildSceneProps } from "./buildSceneProps";
import { loadRegionContent } from "./loadContent";
import { loadProvinceMeta } from "./loadProvince";

// M4: regions with authored content/regions/{id}.json get the real
// scene player. A region the atlas can route to but nobody has written
// content for yet (22 of 24 provinces, still — see content/regions/)
// gets NotYetWritten instead — same scene shell, real province name and
// Latin name pulled from content/borders/provinces/ (which exists for
// every province regardless of whether its campaign is written), not a
// blank canvas or a bare fallback page.
function titleCase(slug: string): string {
  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

export async function generateMetadata(props: PageProps<"/scene/[regionId]">): Promise<Metadata> {
  const { regionId } = await props.params;
  const province = loadProvinceMeta(regionId);
  return { title: `${province?.name ?? titleCase(regionId)} — Imperium` };
}

export default async function ScenePage(props: PageProps<"/scene/[regionId]">) {
  const { regionId } = await props.params;
  const region = loadRegionContent(regionId);

  if (!region) {
    const province = loadProvinceMeta(regionId);
    return (
      <main className="p-6">
        <NotYetWritten name={province?.name ?? titleCase(regionId)} latinName={province?.latinName ?? null} />
      </main>
    );
  }

  return <ScenePlayerClient region={buildSceneProps(region)} />;
}
