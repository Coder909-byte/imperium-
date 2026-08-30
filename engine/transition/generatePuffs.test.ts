import { describe, expect, it } from "vitest";
import { generatePuffs, puffLocalProgress } from "./generatePuffs";

// A deterministic "random" source so the generated field is reproducible.
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

describe("generatePuffs", () => {
  it("generates the requested count", () => {
    expect(generatePuffs(14, seeded(1))).toHaveLength(14);
    expect(generatePuffs(0, seeded(1))).toHaveLength(0);
  });

  it("alternates sides so the field doesn't lean toward one edge", () => {
    const puffs = generatePuffs(14, seeded(1));
    const left = puffs.filter((p) => p.side === "left").length;
    const right = puffs.filter((p) => p.side === "right").length;
    expect(left).toBe(7);
    expect(right).toBe(7);
  });

  it("keeps every parameter within its documented range", () => {
    const puffs = generatePuffs(50, seeded(7));
    for (const p of puffs) {
      expect(p.depthMultiplier).toBeGreaterThanOrEqual(0.6);
      expect(p.depthMultiplier).toBeLessThanOrEqual(1.3);
      expect(p.size).toBeGreaterThanOrEqual(60);
      expect(p.size).toBeLessThanOrEqual(200);
      expect(p.verticalOffset).toBeGreaterThanOrEqual(-210);
      expect(p.verticalOffset).toBeLessThanOrEqual(210);
      expect(p.baseOpacity).toBeGreaterThanOrEqual(0.25);
      expect(p.baseOpacity).toBeLessThanOrEqual(0.6);
      expect(p.startDelay).toBeGreaterThanOrEqual(0);
      expect(p.startDelay).toBeLessThanOrEqual(0.35);
    }
  });

  it("is reproducible given the same random source", () => {
    expect(generatePuffs(14, seeded(3))).toEqual(generatePuffs(14, seeded(3)));
  });
});

describe("puffLocalProgress", () => {
  it("is 0 before a puff's start delay is reached", () => {
    expect(puffLocalProgress(0.1, 0.3)).toBe(0);
  });

  it("reaches 1 exactly when global occlusion completes", () => {
    expect(puffLocalProgress(1, 0.3)).toBe(1);
  });

  it("is 0 at the very start regardless of delay", () => {
    expect(puffLocalProgress(0, 0)).toBe(0);
  });

  it("scales linearly across the remaining range after the delay", () => {
    // startDelay 0.5: occlusion 0.75 is halfway from 0.5 to 1.
    expect(puffLocalProgress(0.75, 0.5)).toBeCloseTo(0.5);
  });

  it("clamps a startDelay of 1 or more to always read 0", () => {
    expect(puffLocalProgress(1, 1)).toBe(0);
  });
});
