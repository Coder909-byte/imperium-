import { describe, expect, it } from "vitest";
import galliaJson from "./regions/gallia.json";
import legionaryJson from "./rigs/legionary.json";
import { Region, Rig } from "./schema";
import { validateSceneReferences } from "./sceneValidation";
import { buildSceneProps } from "../app/scene/[regionId]/buildSceneProps";
import { cameraForBeat } from "../engine/scene/beatTiming";
import { computeAutoplayDwellMs } from "../engine/scene/dwell";
import { selectPlanesForTier } from "../engine/scene/layers/selectActivePlanes";

const gallia = () => Region.parse(structuredClone(galliaJson));
const rigs = [Rig.parse(legionaryJson)];

describe("Gallia's review sequence", () => {
  it("has six sourced beats with valid plane, rig and LUT references", () => {
    const region = gallia();
    expect(region.beats).toHaveLength(6);
    expect(region.beats.every((beat) => beat.sources.length > 0)).toBe(true);
    expect(region.scene.planes.every((plane) => plane.placeholder)).toBe(true);
    expect(validateSceneReferences(region, rigs)).toEqual([]);
  });

  it("preserves prose and citations across the adapter and moves through every reading dwell", () => {
    const region = gallia();
    const props = buildSceneProps(region, rigs);
    props.beats.forEach((beat, index) => {
      expect(beat.body).toBe(galliaJson.beats[index].body);
      expect(beat.sources).toEqual(region.beats[index].sources);
      expect(cameraForBeat(beat).durationMs).toBeGreaterThanOrEqual(computeAutoplayDwellMs(beat.body));
      expect(beat.camera.ease).toBe("none");
    });
  });

  it("keeps both siege walls legible within the four-plane low-tier budget", () => {
    const selected = selectPlanesForTier(buildSceneProps(gallia(), rigs).planes, "low");
    expect(selected).toHaveLength(4);
    expect(selected.map((plane) => plane.id)).toEqual(["sky", "hillfort", "inner_wall", "outer_wall"]);
    const region = gallia();
    region.scene.planes.forEach((plane) => { plane.essential = true; });
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
      'the-hill: unknown clip "unknown" on rig "legionary"',
      'the-hill: crowds support only the march clip',
    ]));
  });
});
