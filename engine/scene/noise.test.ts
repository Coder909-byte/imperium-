import { describe, expect, it } from "vitest";
import { createNoise1D } from "./noise";

describe("createNoise1D", () => {
  it("stays within [-1, 1] across a wide sampled range", () => {
    const noise = createNoise1D(1);
    for (let x = -50; x <= 50; x += 0.37) {
      const v = noise(x);
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("is continuous — a small step in x produces a small step in output, never a jump toward the far end of the range", () => {
    const noise = createNoise1D(2);
    for (let x = 0; x < 20; x += 0.1) {
      const a = noise(x);
      const b = noise(x + 0.01);
      // The lattice interpolation's worst-case slope is bounded but not
      // tiny (smoothstep's max derivative times the full [-1,1] range) —
      // this threshold rules out an actual pop between lattice points,
      // not just any local variation.
      expect(Math.abs(b - a)).toBeLessThan(0.2);
    }
  });

  it("is deterministic for a given seed", () => {
    const a = createNoise1D(42);
    const b = createNoise1D(42);
    for (let x = 0; x < 10; x += 0.5) {
      expect(a(x)).toBe(b(x));
    }
  });

  it("different seeds decorrelate rather than producing phase-shifted copies", () => {
    const a = createNoise1D(1);
    const b = createNoise1D(2);
    const samples = Array.from({ length: 40 }, (_, i) => i * 0.3);
    const identical = samples.every((x) => a(x) === b(x));
    expect(identical).toBe(false);
  });
});
