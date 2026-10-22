import { describe, expect, it } from "vitest";
import { mulberry32 } from "../prng";
import type { SceneActor } from "../types";
import { batchAdjacentActors, placeCrowdUnit } from "./crowdPlacement";

const actor: SceneActor = { rig: "test", clip: "march", x: 100, y: 20, scale: 0.1, count: 20, flip: false, phase: 0, depth: 0.6, formation: { columns: 5, spacing: [100, 40], jitter: 0.1 } };

describe("painted crowd placement", () => {
  it("batches adjacent formations without crossing a puppet, action, facing or plane boundary", () => {
    const actors = [actor, { ...actor, x: 200 }, { ...actor, count: 1 }, actor, { ...actor, depth: 0.7 }, { ...actor, clip: "brace" }, { ...actor, flip: true }];
    const batches = batchAdjacentActors(actors);
    expect(batches.map((batch) => batch.length)).toEqual([2, 1, 1, 1, 1, 1]);
    expect(batches.flat()).toEqual(actors);
    expect(batches.flat().reduce((sum, unit) => sum + unit.count, 0)).toBe(121);
  });
  it("keeps rows legible, scales spacing with the scene, and decorrelates phases", () => {
    const random = mulberry32(26);
    const units = Array.from({ length: actor.count }, (_, index) => placeCrowdUnit(actor, index, random, 1400));
    expect(units[4].x - units[0].x).toBeGreaterThan(39);
    expect(units[5].y - units[0].y).toBeGreaterThan(3.5);
    expect(units[5].x).toBeLessThan(units[4].x);
    expect(new Set(units.map((unit) => unit.phaseMs)).size).toBe(20);
    const half = placeCrowdUnit({ ...actor, x: 50, y: 10, scale: 0.05 }, 0, mulberry32(26), 1400);
    expect(half.x).toBeCloseTo(units[0].x / 2);
    expect(half.y).toBeCloseTo(units[0].y / 2);
  });

  it("compensates atlas downsampling without changing foot positions or timing", () => {
    const native = placeCrowdUnit(actor, 3, mulberry32(4), 1400);
    const baked = placeCrowdUnit(actor, 3, mulberry32(4), 1400, 2);
    expect(baked).toEqual({ ...native, scale: native.scale * 2 });
  });
});
