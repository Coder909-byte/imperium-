import { readdirSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SceneLabClient } from "./SceneLabClient";
import { SceneLabTabs } from "./SceneLabTabs";
import { RigInspectorClient } from "./RigInspectorClient";
import { loadManifest } from "@/app/scene/[regionId]/loadManifest";
import { approvedAssetUrl } from "@/content/assetReferences";

// PRD appendix: "After M4, add /dev/scene-lab — loads any region JSON
// with hot reload. Pays for itself within a week." Built with M4 itself
// per this session's scope, not deferred. M6 adds a second tab: the rig
// inspector (content/rigs/*.json), same rationale — "authoring rigs
// blind is miserable."
export const metadata: Metadata = { title: "Scene Lab — Imperium" };

function listJsonIds(dir: string): string[] {
  return readdirSync(dir)
    .filter((entry) => entry.endsWith(".json"))
    .map((entry) => entry.replace(/\.json$/, ""))
    .sort();
}

export default function SceneLabPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const regionIds = listJsonIds(join(process.cwd(), "content", "regions"));
  const initialRegionId = regionIds.includes("placeholder") ? "placeholder" : regionIds[0];
  const rigIds = listJsonIds(join(process.cwd(), "content", "rigs"));
  const manifest = loadManifest();
  const audioPreviews = [
    { label: "Synthesized plains wind — 12 second loop", asset: "gallia/audio/wind-plains.wav", loop: true },
    { label: "Cloth movement — optional cue", asset: "gallia/audio/kenney-cloth1.ogg", loop: false },
    { label: "Timber work — optional cue", asset: "gallia/audio/kenney-chop.ogg", loop: false },
  ].flatMap((preview) => {
    const url = approvedAssetUrl(preview.asset, manifest);
    return url ? [{ ...preview, url }] : [];
  });

  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold mb-1">Scene Lab</h1>
      <p className="text-sm text-neutral-500 mb-4">Dev-only. Not built in production.</p>
      {audioPreviews.length > 0 && (
        <details className="mb-4 border rounded p-3">
          <summary className="cursor-pointer text-sm">Approved Gallia audio — listen individually</summary>
          <p className="text-sm mt-2">Mute the scene player before comparing individual clips. Cue timing and mix still need review.</p>
          <div className="mt-2 flex flex-wrap gap-4">
            {audioPreviews.map((preview) => (
              <label key={preview.asset} className="text-sm">
                <span className="block mb-1">{preview.label}</span>
                <audio controls preload="none" loop={preview.loop} src={preview.url} aria-label={preview.label} />
              </label>
            ))}
          </div>
        </details>
      )}
      <SceneLabTabs
        scenePreview={<SceneLabClient regionIds={regionIds} initialRegionId={initialRegionId} />}
        rigInspector={<RigInspectorClient rigIds={rigIds} />}
      />
    </main>
  );
}
