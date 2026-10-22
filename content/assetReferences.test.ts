import { describe, expect, it } from "vitest";
import { ManifestEntry, Region } from "./schema";
import { approvedAssetUrl, assetFile, measureRegionAssets, SCENE_ASSET_BUDGET_BYTES, validateAssetReferences } from "./assetReferences";
import galliaJson from "./regions/gallia.json";
import { buildSceneProps } from "../app/scene/[regionId]/buildSceneProps";

// Synthetic approval fixture; never written to the production manifest.
const row = ManifestEntry.parse({ file: "public/assets/gallia/sky.webp", source: "https://example.com/source", licence: "Public domain", retrieved: "2026-10-22" });
const approved = ManifestEntry.parse({ ...row, approval: { by: "test fixture", at: "2026-10-22", rightsUrl: "https://example.com/rights", rightsStatement: "Synthetic test rights statement" } });

describe("approved asset boundary", () => {
  it("requires explicit human approval and refuses copyleft and unsafe paths", () => {
    expect(approvedAssetUrl("gallia/sky.webp", [row])).toBeUndefined();
    expect(approvedAssetUrl("gallia/sky.webp", [approved])).toBe("/assets/gallia/sky.webp");
    expect(approvedAssetUrl("gallia/sky.webp", [{ ...approved, licence: "CC BY-SA 4.0" }])).toBeUndefined();
    for (const path of ["../secret.webp", "gallia/../../secret.webp", "https://example.com/a.webp", "gallia/sky.webp?x=1"]) expect(assetFile(path)).toBeNull();
  });

  it("fails a missing real plane instead of disguising it with placeholder art", () => {
    const region = Region.parse(galliaJson);
    region.scene.planes[0].placeholder = false;
    expect(validateAssetReferences(region, [], () => false)).toHaveLength(2);
    expect(() => buildSceneProps(region)).toThrow("Unapproved scene plane");
    expect(buildSceneProps(region, [], [approved]).planes[0].assetUrl).toBe("/assets/gallia/sky.webp");
  });

  it("requires audio mappings when audio is no longer declared a placeholder", () => {
    const region = Region.parse(galliaJson);
    region.scene.audioPlaceholder = false;
    region.beats[0].audio.cue = "horn";
    expect(validateAssetReferences(region, [], () => false)).toEqual([
      'missing ambient bed "wind_plains"', 'the-hill: missing audio cue "horn"',
    ]);
  });

  it("counts shared assets once and fails at the unchanged strict region budget", () => {
    const region = Region.parse(galliaJson);
    region.scene.planes[0].placeholder = false;
    region.scene.planes[1].placeholder = false;
    region.scene.planes[1].asset = region.scene.planes[0].asset;
    const measured = measureRegionAssets(region, [], () => SCENE_ASSET_BUDGET_BYTES);
    expect(measured.files).toEqual(["public/assets/gallia/sky.webp"]);
    expect(measured.fits).toBe(false);
    expect(measureRegionAssets(region, [], () => SCENE_ASSET_BUDGET_BYTES - 1).fits).toBe(true);
  });
});
