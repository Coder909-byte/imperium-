import { describe, expect, it } from "vitest";
import { computeCameraTarget, computeDrift, HANDHELD_DRIFT } from "./Camera";
import { createNoise1D } from "./noise";
import type { SceneCamera } from "./types";

function beat(overrides: Partial<SceneCamera> = {}): SceneCamera {
  return { x: 0, y: 0, scale: 1, durationMs: 1000, ease: "power2.inOut", ...overrides };
}

describe("computeCameraTarget", () => {
  it("maps a neutral beat camera to the origin at scale 1", () => {
    expect(computeCameraTarget(beat(), { width: 1000, height: 500 })).toEqual({ x: 0, y: 0, scale: 1 });
  });

  it("scales the pan with the stage's smaller dimension, not its larger one", () => {
    const wide = computeCameraTarget(beat({ x: 1 }), { width: 2000, height: 500 });
    const tall = computeCameraTarget(beat({ x: 1 }), { width: 500, height: 2000 });
    // Both stages share a smaller dimension of 500 — same pan in px either way.
    expect(wide.x).toBeCloseTo(tall.x, 5);
  });

  it("passes scale through unchanged — it's a multiplier on the base fit scale", () => {
    expect(computeCameraTarget(beat({ scale: 1.2 }), { width: 1000, height: 600 }).scale).toBe(1.2);
  });

  it("a bigger stage produces a bigger pixel pan for the same fractional x", () => {
    const small = computeCameraTarget(beat({ x: 0.5 }), { width: 800, height: 500 });
    const large = computeCameraTarget(beat({ x: 0.5 }), { width: 1600, height: 1000 });
    expect(Math.abs(large.x)).toBeGreaterThan(Math.abs(small.x));
  });
});

describe("computeDrift", () => {
  const noiseX = createNoise1D(11);
  const noiseY = createNoise1D(29);
  const noiseRot = createNoise1D(53);

  it("stays within the configured amplitude on every axis", () => {
    for (let t = 0; t < 30; t += 0.7) {
      const drift = computeDrift(t, noiseX, noiseY, noiseRot);
      expect(Math.abs(drift.x)).toBeLessThanOrEqual(HANDHELD_DRIFT.TRANSLATE_X_PX);
      expect(Math.abs(drift.y)).toBeLessThanOrEqual(HANDHELD_DRIFT.TRANSLATE_Y_PX);
      expect(Math.abs(drift.rotationDeg)).toBeLessThanOrEqual(HANDHELD_DRIFT.ROTATION_DEG);
    }
  });

  it("is continuous over time — no popping between adjacent samples", () => {
    let previous = computeDrift(0, noiseX, noiseY, noiseRot);
    for (let t = 0.05; t < 10; t += 0.05) {
      const current = computeDrift(t, noiseX, noiseY, noiseRot);
      expect(Math.abs(current.x - previous.x)).toBeLessThan(HANDHELD_DRIFT.TRANSLATE_X_PX * 0.5);
      previous = current;
    }
  });

  it("axes decorrelate rather than moving in lockstep", () => {
    const samples = Array.from({ length: 30 }, (_, i) => computeDrift(i * 0.3, noiseX, noiseY, noiseRot));
    const lockstep = samples.every((s) => Math.sign(s.x) === Math.sign(s.y));
    expect(lockstep).toBe(false);
  });

  it("never sits dead still — it's still meaningfully non-zero somewhere in a real time window", () => {
    const samples = Array.from({ length: 60 }, (_, i) => computeDrift(i * 0.2, noiseX, noiseY, noiseRot));
    const anyMovement = samples.some((s) => Math.abs(s.x) > 0.5 || Math.abs(s.y) > 0.5);
    expect(anyMovement).toBe(true);
  });
});
