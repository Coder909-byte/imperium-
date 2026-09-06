import { describe, expect, it } from "vitest";
import { computeCameraTarget, computeDrift, computeShake, HANDHELD_DRIFT, SCREEN_SHAKE } from "./Camera";
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

describe("computeShake", () => {
  const noiseX = createNoise1D(151);
  const noiseY = createNoise1D(173);
  const noiseRot = createNoise1D(191);

  it("stays within SCREEN_SHAKE's configured amplitude on every axis", () => {
    for (let t = 0; t < 10; t += 0.1) {
      const shake = computeShake(t, noiseX, noiseY, noiseRot);
      expect(Math.abs(shake.x)).toBeLessThanOrEqual(SCREEN_SHAKE.TRANSLATE_X_PX);
      expect(Math.abs(shake.y)).toBeLessThanOrEqual(SCREEN_SHAKE.TRANSLATE_Y_PX);
      expect(Math.abs(shake.rotationDeg)).toBeLessThanOrEqual(SCREEN_SHAKE.ROTATION_DEG);
    }
  });

  it("moves faster than handheld drift — its noise phase advances over 10x as fast per second", () => {
    expect(SCREEN_SHAKE.FREQUENCY_HZ).toBeGreaterThan(HANDHELD_DRIFT.FREQUENCY_HZ * 10);
  });

  it("uses its own noise channels — its shape diverges from drift's rather than being a scaled copy", () => {
    const driftNoiseX = createNoise1D(11);
    const driftSamples = Array.from({ length: 40 }, (_, i) => computeDrift(i * 0.3, driftNoiseX, driftNoiseX, driftNoiseX).x);
    const shakeSamples = Array.from({ length: 40 }, (_, i) => computeShake(i * 0.3, noiseX, noiseX, noiseX).x);
    // Same seed/phase would make these proportional (a fixed ratio at
    // every sample, since both feed the same noise fn). Different seeds
    // must disagree at some sample even after normalising for amplitude.
    const ratios = driftSamples.map((d, i) => (d === 0 ? null : shakeSamples[i] / d)).filter((r): r is number => r !== null);
    const allSameRatio = ratios.every((r) => Math.abs(r - ratios[0]) < 1e-6);
    expect(allSameRatio).toBe(false);
  });
});
