import { describe, expect, it } from "vitest";
import galliaJson from "./regions/gallia.json";
import legionaryJson from "./rigs/legionary.json";
import romanJson from "./rigs/roman_infantry.json";
import gallicJson from "./rigs/gaul_warrior.json";
import gallicBlueJson from "./rigs/gaul_warrior_blue.json";
import { ManifestEntry, Region, Rig } from "./schema";
import manifestJson from "./assets/manifest.json";
import { validateSceneReferences } from "./sceneValidation";
import { buildSceneProps } from "../app/scene/[regionId]/buildSceneProps";
import { cameraForBeat } from "../engine/scene/beatTiming";
import { computeAutoplayDwellMs } from "../engine/scene/dwell";
import { selectPlanesForTier } from "../engine/scene/layers/selectActivePlanes";
import { validateAssetReferences } from "./assetReferences";
import { existsSync } from "node:fs";

const gallia = () => Region.parse(structuredClone(galliaJson));
const rigs = [legionaryJson, romanJson, gallicJson, gallicBlueJson].map((rig) => Rig.parse(rig));
const manifest = manifestJson.map((row) => ManifestEntry.parse(row));

describe("Gallia's review sequence", () => {
  it("uses painted provisional military rigs throughout and keeps 150 battle crowd units instanced", () => {
    const region = gallia();
    const props = buildSceneProps(region, rigs, manifest);
    expect(props.rigs.every((rig) => rig.draft && rig.parts.every((part) => part.texture.startsWith("/assets/")))).toBe(true);
    expect(region.beats[4].actors.filter((actor) => actor.count > 1).reduce((sum, actor) => sum + actor.count, 0)).toBe(150);
    expect(new Set(region.beats[4].actors.map((actor) => actor.rig))).toEqual(new Set(["roman_infantry", "gaul_warrior", "gaul_warrior_blue"]));
    expect(props.beats[4].camera.from).toEqual(region.beats[4].camera.from);
    expect(cameraForBeat(props.beats[4]).from).toEqual(region.beats[4].camera.from);
  });
  it("passes approved quiet work and cloth cues through to the player, leaving the Mandubii without a cue", () => {
    const region = gallia();
    expect(validateAssetReferences(region, manifest, existsSync)).toEqual([]);
    const props = buildSceneProps(region, rigs, manifest);
    expect(props.audio?.assets.timber_work).toBe("/assets/gallia/audio/kenney-chop.ogg");
    expect(props.audio?.assets.cloth_movement).toBe("/assets/gallia/audio/kenney-cloth1.ogg");
    expect(props.beats[1].audio).toEqual({ bedIntensity: 0.45, cue: "timber_work", cueVolume: 0.18 });
    expect(props.beats[5].audio).toEqual({ bedIntensity: 0.25, cue: "cloth_movement", cueVolume: 0.12 });
    expect(props.beats[3].audio?.cue).toBeUndefined();
    for (const cueVolume of [-0.1, 1.1]) {
      region.beats[1].audio.cueVolume = cueVolume;
      expect(Region.safeParse(region).success).toBe(false);
    }
  });

  it("has six sourced beats with valid plane, rig and LUT references", () => {
    const region = gallia();
    expect(region.beats).toHaveLength(6);
    expect(region.beats.every((beat) => beat.sources.length > 0)).toBe(true);
    expect(region.scene.planes.filter((plane) => !plane.placeholder).map((plane) => plane.id)).toEqual(["sky", "mid_ground", "inner_wall", "outer_wall", "foreground"]);
    expect(validateSceneReferences(region, rigs)).toEqual([]);
  });

  it("preserves prose and citations across the adapter and moves through every reading dwell", () => {
    const region = gallia();
    const props = buildSceneProps(region, rigs, manifest);
    props.beats.forEach((beat, index) => {
      expect(beat.body).toBe(galliaJson.beats[index].body);
      expect(beat.sources).toEqual(region.beats[index].sources);
      expect(cameraForBeat(beat).durationMs).toBeGreaterThanOrEqual(computeAutoplayDwellMs(beat.body));
      expect(beat.camera.ease).toBe("none");
    });
  });

  it("keeps both siege walls legible within the four-plane low-tier budget", () => {
    const selected = selectPlanesForTier(buildSceneProps(gallia(), rigs, manifest).planes, "low");
    expect(selected).toHaveLength(4);
    expect(selected.map((plane) => plane.id)).toEqual(["sky", "hillfort", "inner_wall", "outer_wall"]);
    expect(selected[0].compositeSources?.map((plane) => plane.id)).toEqual(["sky", "mid_ground"]);
    const region = gallia();
    region.scene.planes.forEach((plane) => { plane.essential = true; });
    expect(Region.safeParse(region).success).toBe(false);
  });

  it("never shows the later outer wall during the first wall's construction", () => {
    const region = gallia();
    expect(region.beats[0].visibleLayers).not.toContain("inner_wall");
    expect(region.beats[1].visibleLayers).toContain("inner_wall");
    expect(region.beats[1].visibleLayers).not.toContain("outer_wall");
    expect(region.beats[2].visibleLayers).toContain("outer_wall");
  });

  it("rejects grouped structures or atmosphere with different beat visibility", () => {
    const region = gallia();
    region.scene.planes[2].lowTierGroup = "painted-atmosphere";
    expect(Region.safeParse(region).success).toBe(false);
    delete region.scene.planes[2].lowTierGroup;
    region.beats[1].visibleLayers = region.beats[1].visibleLayers.filter((id) => id !== "mid_ground");
    expect(Region.safeParse(region).success).toBe(false);
  });

  it("rejects dangling and duplicate layer or beat ids", () => {
    const region = gallia();
    region.beats[0].visibleLayers.push("missing-wall");
    region.scene.planes.push({ ...region.scene.planes[0], essential: false });
    region.beats[1].id = region.beats[0].id;
    const result = Region.safeParse(region);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues).toHaveLength(3);
  });

  it("rejects unknown rigs, clips, LUTs and unsupported crowd actions", () => {
    const region = gallia();
    region.scene.lut = "typo";
    region.beats[0].actors[0].rig = "missing";
    region.beats[0].actors[1].clip = "unknown";
    expect(validateSceneReferences(region, rigs)).toEqual(expect.arrayContaining([
      'unknown LUT "typo"', 'the-hill: unknown rig "missing"',
      'the-hill: unknown clip "unknown" on rig "roman_infantry"',
      'the-hill: crowds require march or a painted looping clip',
    ]));
  });
});
