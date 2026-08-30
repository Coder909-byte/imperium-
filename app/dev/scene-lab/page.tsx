import { readdirSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SceneLabClient } from "./SceneLabClient";

// PRD appendix: "After M4, add /dev/scene-lab — loads any region JSON
// with hot reload. Pays for itself within a week." Built with M4 itself
// per this session's scope, not deferred.
export const metadata: Metadata = { title: "Scene Lab — Imperium" };

function listRegionIds(): string[] {
  const dir = join(process.cwd(), "content", "regions");
  return readdirSync(dir)
    .filter((entry) => entry.endsWith(".json"))
    .map((entry) => entry.replace(/\.json$/, ""))
    .sort();
}

export default function SceneLabPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const regionIds = listRegionIds();
  const initialRegionId = regionIds.includes("placeholder") ? "placeholder" : regionIds[0];

  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold mb-1">Scene Lab</h1>
      <p className="text-sm text-neutral-500 mb-4">Dev-only. Not built in production.</p>
      <SceneLabClient regionIds={regionIds} initialRegionId={initialRegionId} />
    </main>
  );
}
