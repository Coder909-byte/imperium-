import { describe, expect, it } from "vitest";
import { EMITTER_CONFIGS, fadeEnvelope, resolveParticleCount, spawnAtRandomAge } from "./emitterConfigs";
import type { EmitterBounds } from "./types";

const BOUNDS: EmitterBounds = { width: 1280, height: 720 };

// A deterministic, order-preserving stand-in for Math.random() — cycles
// through a fixed sequence so every spawn()/update() call in a test is
// reproducible instead of flaky.
function fakeRand(sequence: number[]): () => number {
  let i = 0;
  return () => sequence[i++ % sequence.length];
}

describe("fadeEnvelope", () => {
  it("is 0 at birth and ramps up through the fade-in window", () => {
    expect(fadeEnvelope(0)).toBe(0);
    expect(fadeEnvelope(0.075)).toBeCloseTo(0.5, 5);
    expect(fadeEnvelope(0.15)).toBeCloseTo(1, 5);
  });

  it("holds at 1 through the middle", () => {
    expect(fadeEnvelope(0.5)).toBe(1);
    expect(fadeEnvelope(0.74)).toBe(1);
  });

  it("ramps down through the fade-out window and reaches 0 at end of life", () => {
    expect(fadeEnvelope(0.875)).toBeCloseTo(0.5, 5);
    expect(fadeEnvelope(1)).toBeCloseTo(0, 5);
  });

  it("clamps outside [0,1] rather than going negative or over 1", () => {
    expect(fadeEnvelope(-0.5)).toBe(0);
    expect(fadeEnvelope(1.5)).toBe(0);
  });
});

describe("resolveParticleCount", () => {
  it("uses the full base count on high tier with motion allowed", () => {
    expect(resolveParticleCount(40, "high", false)).toBe(40);
  });

  it("halves the count on low tier", () => {
    expect(resolveParticleCount(40, "low", false)).toBe(20);
  });

  it("caps hard under reduced motion regardless of tier — reduced motion wins outright, doesn't compound with the tier halving", () => {
    expect(resolveParticleCount(40, "high", true)).toBe(6);
    expect(resolveParticleCount(40, "low", true)).toBe(6);
  });

  it("never raises a count that's already below the reduced-motion cap", () => {
    expect(resolveParticleCount(4, "high", true)).toBe(4);
  });
});

describe("EMITTER_CONFIGS", () => {
  const kinds = Object.keys(EMITTER_CONFIGS) as (keyof typeof EMITTER_CONFIGS)[];

  it("covers all six required fx kinds", () => {
    expect(kinds.sort()).toEqual(["arrow_volley", "dust", "embers", "fire", "rain", "smoke"]);
  });

  it.each(kinds)("%s: spawn() produces a particle with positive life and a valid alpha", (kind) => {
    const config = EMITTER_CONFIGS[kind];
    const rand = fakeRand([0.1, 0.9, 0.3, 0.7, 0.5, 0.2, 0.8, 0.4, 0.6]);
    const state = config.spawn(BOUNDS, rand);
    expect(state.life).toBeGreaterThan(0);
    expect(state.alpha).toBeGreaterThanOrEqual(0);
    expect(state.alpha).toBeLessThanOrEqual(1);
  });

  it.each(kinds)("%s: update() advances age and never leaves it negative", (kind) => {
    const config = EMITTER_CONFIGS[kind];
    const rand = fakeRand([0.5]);
    const state = config.spawn(BOUNDS, rand);
    const ageBefore = state.age;
    config.update(state, 0.1, BOUNDS);
    expect(state.age).toBeGreaterThan(ageBefore);
    expect(state.age).toBeGreaterThanOrEqual(0);
  });

  it.each(kinds)("%s: a particle run to end of life has age >= life", (kind) => {
    const config = EMITTER_CONFIGS[kind];
    const rand = fakeRand([0.5]);
    const state = config.spawn(BOUNDS, rand);
    const life = state.life;
    let elapsed = 0;
    while (elapsed < life) {
      config.update(state, 0.05, BOUNDS);
      elapsed += 0.05;
    }
    expect(state.age).toBeGreaterThanOrEqual(life);
  });

  it("rain falls downward (positive vy) and drifts left (negative vx), matching wind + gravity", () => {
    const state = EMITTER_CONFIGS.rain.spawn(BOUNDS, fakeRand([0.5]));
    expect(state.vy).toBeGreaterThan(0);
    expect(state.vx).toBeLessThan(0);
  });

  it("arrow_volley travels rightward (positive vx) and starts just off the left edge", () => {
    const state = EMITTER_CONFIGS.arrow_volley.spawn(BOUNDS, fakeRand([0.5]));
    expect(state.vx).toBeGreaterThan(0);
    expect(state.x).toBeLessThan(0);
  });

  it("smoke grows in scale as it ages", () => {
    const state = EMITTER_CONFIGS.smoke.spawn(BOUNDS, fakeRand([0.5]));
    const initialScale = state.scale;
    EMITTER_CONFIGS.smoke.update(state, 1, BOUNDS);
    expect(state.scale).toBeGreaterThan(initialScale);
  });
});

describe("spawnAtRandomAge", () => {
  it("produces a particle already mid-lifecycle rather than always at age 0", () => {
    const config = EMITTER_CONFIGS.dust;
    // rand sequence chosen so spawn() consumes some values and the final
    // one (used as the age fraction) is comfortably mid-range.
    const rand = fakeRand([0.2, 0.3, 0.4, 0.6]);
    const state = spawnAtRandomAge(config, BOUNDS, rand);
    expect(state.age).toBeGreaterThan(0);
  });
});
