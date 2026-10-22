import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NotYetWritten } from "./NotYetWritten";
import { ScenePlayerClient } from "./ScenePlayerClient";
import { buildSceneProps } from "./buildSceneProps";
import { loadRegionContent } from "./loadContent";
import { loadProvinceMeta } from "./loadProvince";
import { loadRigs } from "./loadRigs";
import { loadManifest } from "./loadManifest";

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
    if (!province) notFound();
    return (
      <main className="p-6">
        <NotYetWritten name={province.name} latinName={province.latinName} />
      </main>
    );
  }

  return <ScenePlayerClient region={buildSceneProps(region, loadRigs(), loadManifest())} />;
}
