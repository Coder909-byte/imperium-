import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import gallia from "./regions/gallia.json";
import manifest from "./assets/manifest.json";
import { ManifestEntry, Region } from "./schema";
import { approvedAssetUrl, measureRegionAssets, validateAssetReferences } from "./assetReferences";
import { validateNarrationTranscripts, validateSynthesisTranscripts } from "./narrationValidation";
import { buildSceneProps } from "../app/scene/[regionId]/buildSceneProps";

const hash = (text: string) => createHash("sha256").update(text).digest("hex");
function fixture() {
  const region = Region.parse(gallia);
  region.scene.planes.forEach(plane => { plane.placeholder = true; });
  region.beats.forEach(beat => { beat.actors = []; delete beat.audio.cue; delete beat.audio.narration; });
  region.scene.ambientBed = "none";
  region.scene.audioAssets = { narrator: "audio/narrator.wav" };
  const body = region.beats[0].body;
  region.beats[0].audio.narration = { asset: "narrator", durationMs: 30_000, transcriptSha256: hash(body) };
  const sample = ManifestEntry.parse(manifest.find(row => row.file.endsWith("narration-george-sample.wav")));
  const row = ManifestEntry.parse({ ...sample, file: "public/assets/audio/narrator.wav", licence: "Generated stock-voice narration",
    synthesis: { ...sample.synthesis, transcript: body, transcriptSha256: hash(body), durationMs: 30_000 },
    approval: { scope: "generated-narration", by: "synthetic test fixture", at: "2026-10-23", rightsUrl: "https://example.com/fixture", rightsStatement: "Synthetic test only; not an approval for any production recording" },
  });
  return { region, row };
}

describe("narration provenance and budget", () => {
  it("rejects pending recordings and keeps generated narration approval separate from ambience and art", () => {
    const { row } = fixture();
    expect(approvedAssetUrl("audio/narrator.wav", [row], "narration")).toBe("/assets/audio/narrator.wav");
    for (const usage of ["asset", "character-draft", "structure-draft", "atmosphere"] as const) {
      expect(approvedAssetUrl("audio/narrator.wav", [row], usage)).toBeUndefined();
    }
    expect(approvedAssetUrl("audio/narrator.wav", [{ ...row, approval: undefined }], "narration")).toBeUndefined();
    expect(approvedAssetUrl("audio/narrator.wav", [{ ...row, approval: { ...row.approval!, scope: "asset" } }], "narration")).toBeUndefined();
    expect(approvedAssetUrl("audio/narrator.wav", [{ ...row, synthesis: { ...row.synthesis!, voice: { ...row.synthesis!.voice, licence: "Noncommercial" } } }], "narration")).toBeUndefined();
  });

  it("passes only reviewed narration references and rejects a stale transcript or changed duration", () => {
    const { region, row } = fixture();
    expect(validateAssetReferences(region, [row], () => true)).toEqual([]);
    expect(validateNarrationTranscripts(region, [row])).toEqual([]);
    expect(buildSceneProps(region, [], [row]).beats[0].audio?.narration?.asset).toBe("narrator");
    expect(() => buildSceneProps(region, [], [])).toThrow("Unapproved narration");
    region.beats[0].body += " Changed.";
    expect(validateNarrationTranscripts(region, [row])).toHaveLength(2);
    expect(validateSynthesisTranscripts([{ ...row, synthesis: { ...row.synthesis!, transcript: "Changed" } }])).toHaveLength(1);
  });

  it("counts narration once inside both audio and the unchanged region budget, including shared references", () => {
    const { region } = fixture();
    region.beats[1].audio.narration = region.beats[0].audio.narration;
    expect(measureRegionAssets(region, [], () => 100)).toMatchObject({ bytes: 100, audioBytes: 100, narrationBytes: 100, fits: true });
    delete region.scene.audioAssets.narrator;
    expect(validateAssetReferences(region, [], () => true)).toContain('the-hill: missing narration "narrator"');
  });

  it("does not allow a narrator asset to be used as a looping bed or an extra cue", () => {
    const { region, row } = fixture();
    region.beats[0].audio.cue = "narrator";
    expect(validateAssetReferences(region, [row], () => true)).toContain("the-hill: narration cannot also be an ambient bed or cue");
    region.scene.audioAssets.alias = region.scene.audioAssets.narrator;
    region.beats[0].audio.cue = "alias";
    expect(validateAssetReferences(region, [row], () => true)).toContain("the-hill: narration cannot also be an ambient bed or cue");
  });
});
