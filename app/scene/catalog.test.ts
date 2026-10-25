import { describe, expect, it } from "vitest";
import { readCampaignCatalog } from "./catalog";
import { loadRegionContent } from "./[regionId]/loadContent";
import { buildSceneProps } from "./[regionId]/buildSceneProps";
import { loadRigs } from "./[regionId]/loadRigs";

describe("multiple campaign integration", () => {
  it("supplies safe names and episode dates without confusing a draft scene with a finished quiz", () => {
    const catalog = readCampaignCatalog();
    expect(catalog).toEqual([
      { id: "gallia", name: "Gallia", year: "52 BC", quizAvailable: true },
      { id: "italia", name: "Italia", year: "January 49 BC", quizAvailable: false },
    ]);
    expect(JSON.stringify(catalog)).not.toMatch(/correctOptionId|feedbackByOptionId|explanation/);
  });

  it("adapts Italia's temporary composition without loading Gallia scenery, licensed drafts or recordings", () => {
    const region = loadRegionContent("italia");
    if (!region) throw new Error("Italia draft missing");
    const scene = buildSceneProps(region, loadRigs());
    expect(scene.beats).toHaveLength(6);
    expect(region.scene.previewNotice).toContain("temporary layout placeholders");
    expect(scene.planes.every(plane => !plane.assetUrl)).toBe(true);
    expect(scene.rigs.map(rig => rig.id)).toEqual(["legionary"]);
    expect(scene.audio?.assets).toEqual({});
    expect(scene.beats.every(beat => beat.sources && beat.sources.length >= 3)).toBe(true);
    expect(scene.beats.every(beat => beat.camera.from && beat.camera.durationMode === "dwell")).toBe(true);
  });
});
