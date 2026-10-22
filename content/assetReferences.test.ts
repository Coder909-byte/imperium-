import { describe, expect, it } from "vitest";
import { ManifestEntry, Region } from "./schema";
import { approvedAssetUrl, assetFile, measureRegionAssets, SCENE_ASSET_BUDGET_BYTES, validateAssetReferences } from "./assetReferences";
import galliaJson from "./regions/gallia.json";
import { buildSceneProps } from "../app/scene/[regionId]/buildSceneProps";

// Synthetic approval fixture; never written to the production manifest.
const row = ManifestEntry.parse({ file: "public/assets/gallia/sky.webp", source: "https://example.com/source", licence: "Public domain", retrieved: "2026-10-22" });
const approved = ManifestEntry.parse({ ...row, approval: { by: "test fixture", at: "2026-10-22", rightsUrl: "https://example.com/rights", rightsStatement: "Synthetic test rights statement" } });
const isolatedRegion = () => {
  const region = Region.parse(galliaJson);
  region.scene.planes.forEach((plane) => { plane.placeholder = true; });
  region.scene.audioAssets = {};
  region.scene.audioPlaceholder = true;
  region.beats.forEach((beat) => { delete beat.audio.cue; delete beat.audio.cueVolume; });
  return region;
};

describe("approved asset boundary", () => {
  it("requires separate explicit structure-draft approval and never promotes it to final art or figure/audio use", () => {
    const source = ManifestEntry.parse({ ...approved, file: "content/assets/staging/motte.jpg" });
    const draft = ManifestEntry.parse({ ...approved, licence: "Owner-approved provisional AI-assisted structure draft",
      approval: { ...approved.approval, scope: "structural-draft" },
      derivation: { kind: "ai-assisted-structure-draft", sourceFile: source.file, modifications: "Provisional source-based rampart study" },
    });
    expect(approvedAssetUrl("gallia/sky.webp", [draft, source], "structure-draft")).toBe("/assets/gallia/sky.webp");
    expect(approvedAssetUrl("gallia/sky.webp", [draft, source])).toBeUndefined();
    expect(approvedAssetUrl("gallia/sky.webp", [draft, source], "atmosphere")).toBeUndefined();
    expect(approvedAssetUrl("gallia/sky.webp", [draft], "structure-draft")).toBeUndefined();
    expect(approvedAssetUrl("gallia/sky.webp", [{ ...draft, approval: { ...draft.approval!, scope: "atmospheric-derivative" } }, source], "structure-draft")).toBeUndefined();
  });
  it("limits owner-approved AI scenery to atmospheric planes with approved source provenance", () => {
    const source = ManifestEntry.parse({ ...approved, file: "content/assets/staging/source.jpg" });
    const edited = ManifestEntry.parse({ ...approved,
      licence: "Owner-approved AI-assisted derivative of Public domain source",
      approval: { ...approved.approval, scope: "atmospheric-derivative" },
      derivation: { kind: "ai-assisted-atmosphere", sourceFile: source.file, modifications: "Sky restoration only" },
    });
    expect(approvedAssetUrl("gallia/sky.webp", [edited, source], "atmosphere")).toBe("/assets/gallia/sky.webp");
    expect(approvedAssetUrl("gallia/sky.webp", [edited, source])).toBeUndefined();
    expect(approvedAssetUrl("gallia/sky.webp", [edited], "atmosphere")).toBeUndefined();
    expect(approvedAssetUrl("gallia/sky.webp", [edited, { ...source, approval: undefined }], "atmosphere")).toBeUndefined();
  });
  it("requires explicit human approval and refuses copyleft and unsafe paths", () => {
    expect(approvedAssetUrl("gallia/sky.webp", [row])).toBeUndefined();
    expect(approvedAssetUrl("gallia/sky.webp", [approved])).toBe("/assets/gallia/sky.webp");
    expect(approvedAssetUrl("gallia/sky.webp", [{ ...approved, licence: "CC BY-SA 4.0" }])).toBeUndefined();
    for (const path of ["../secret.webp", "gallia/../../secret.webp", "https://example.com/a.webp", "gallia/sky.webp?x=1"]) expect(assetFile(path)).toBeNull();
  });

  it("fails a missing real plane instead of disguising it with placeholder art", () => {
    const region = isolatedRegion();
    region.scene.planes[0].placeholder = false;
    expect(validateAssetReferences(region, [], () => false)).toHaveLength(2);
    expect(() => buildSceneProps(region)).toThrow("Unapproved scene plane");
    expect(buildSceneProps(region, [], [approved]).planes[0].assetUrl).toBe("/assets/gallia/sky.webp");
  });

  it("requires audio mappings when audio is no longer declared a placeholder", () => {
    const region = isolatedRegion();
    region.scene.audioPlaceholder = false;
    region.beats[0].audio.cue = "horn";
    expect(validateAssetReferences(region, [], () => false)).toEqual([
      'missing ambient bed "wind_plains"', 'the-hill: missing audio cue "horn"',
    ]);
  });

  it("counts shared assets once and fails at the unchanged strict region budget", () => {
    const region = isolatedRegion();
    region.scene.planes[0].placeholder = false;
    region.scene.planes[1].placeholder = false;
    region.scene.planes[1].asset = region.scene.planes[0].asset;
    const measured = measureRegionAssets(region, [], () => SCENE_ASSET_BUDGET_BYTES);
    expect(measured.files).toEqual(["public/assets/gallia/sky.webp"]);
    expect(measured.fits).toBe(false);
    expect(measureRegionAssets(region, [], () => SCENE_ASSET_BUDGET_BYTES - 1).fits).toBe(true);
  });
});
