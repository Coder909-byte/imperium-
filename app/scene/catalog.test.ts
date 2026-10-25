import { describe, expect, it } from "vitest";
import { readCampaignCatalog } from "./catalog";
import { loadRegionContent } from "./[regionId]/loadContent";
import { buildSceneProps } from "./[regionId]/buildSceneProps";
import { loadRigs } from "./[regionId]/loadRigs";
import { loadManifest } from "./[regionId]/loadManifest";
import { readFileSync } from "node:fs";
import { z } from "zod";
import { Beat } from "@/content/schema";
import { selectPlanesForTier, selectScenePlanesForTier } from "@/engine/scene/layers/selectActivePlanes";

const RegionApproval = z.object({ beats: z.array(Beat.pick({ headline: true, body: true, sources: true })) });

describe("multiple campaign integration", () => {
  it("leaves Gallia's accepted low-tier plane selection unchanged", () => {
    const gallia = loadRegionContent("gallia");
    if (!gallia) throw new Error("Gallia missing");
    const scene = buildSceneProps(gallia, loadRigs(), loadManifest());
    expect(selectScenePlanesForTier(scene.planes, "low", scene.beats)).toEqual(selectPlanesForTier(scene.planes, "low"));
  });
  it("supplies safe campaign names, episode dates and quiz availability", () => {
    const catalog = readCampaignCatalog();
    expect(catalog).toEqual([
      { id: "gallia", name: "Gallia", year: "52 BC", quizAvailable: true },
      { id: "italia", name: "Italia", year: "January 49 BC", quizAvailable: true },
    ]);
    expect(JSON.stringify(catalog)).not.toMatch(/correctOptionId|feedbackByOptionId|explanation/);
  });

  it("adapts complete Italia art/audio while preserving the approved prose and linked citations", () => {
    const region = loadRegionContent("italia");
    if (!region) throw new Error("Italia missing");
    const scene = buildSceneProps(region, loadRigs(), loadManifest());
    expect(scene.beats).toHaveLength(6);
    expect(region.scene.previewNotice).toBeUndefined();
    expect(scene.planes.every(plane => plane.assetUrl?.startsWith("/assets/italia/"))).toBe(true);
    expect(scene.rigs.map(rig => rig.id).sort()).toEqual(["italia_caesar", "italia_civic", "roman_infantry"]);
    expect(Object.keys(scene.audio?.assets ?? {})).toHaveLength(8);
    const approved: unknown = JSON.parse(readFileSync("docs/reviews/italia-approved-prose.json", "utf8"));
    const snapshot = RegionApproval.parse(approved);
    for (const [index, beat] of region.beats.entries()) {
      expect(beat.body).toBe(snapshot.beats[index].body);
      expect(beat.headline).toBe(snapshot.beats[index].headline);
      expect(beat.sources.filter(source => source.url)).toEqual(snapshot.beats[index].sources.filter(source => source.url));
      const narration = beat.audio.narration;
      expect(narration).toBeDefined();
      const row = loadManifest().find(row => row.file === `public/assets/${region.scene.audioAssets[narration!.asset]}`);
      expect(row?.synthesis?.transcript).toBe(beat.body);
    }
    expect(scene.beats.every(beat => beat.sources && beat.sources.length >= 3)).toBe(true);
    expect(scene.beats.every(beat => beat.camera.from && beat.camera.durationMode === "dwell")).toBe(true);
  });
});
