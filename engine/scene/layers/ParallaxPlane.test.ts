import { describe, expect, it } from "vitest";
import { Texture } from "pixi.js";
import { computeParallaxOffset, ParallaxPlane, PARALLAX_STRENGTH_PX } from "./ParallaxPlane";

describe("computeParallaxOffset", () => {
  it("is zero at depth 0 regardless of pointer position", () => {
    expect(computeParallaxOffset(0, 1, 1)).toEqual({ x: 0, y: 0 });
  });

  it("scales linearly with depth", () => {
    const near = computeParallaxOffset(1, 0.5, 0.5);
    const half = computeParallaxOffset(0.5, 0.5, 0.5);
    expect(half.x).toBeCloseTo(near.x / 2, 5);
    expect(half.y).toBeCloseTo(near.y / 2, 5);
  });

  it("a deeper (closer) plane moves more than a shallower one for the same pointer input", () => {
    const far = computeParallaxOffset(0.1, 1, 1);
    const near = computeParallaxOffset(0.9, 1, 1);
    expect(Math.abs(near.x)).toBeGreaterThan(Math.abs(far.x));
  });

  it("respects a custom strength", () => {
    expect(computeParallaxOffset(1, 1, 0, 10)).toEqual({ x: 10, y: 0 });
    expect(computeParallaxOffset(1, 1, 0)).toEqual({ x: PARALLAX_STRENGTH_PX, y: 0 });
  });
});

// Texture.WHITE is Pixi's shared built-in texture — used here because it
// needs no real canvas/renderer, but that also means these tests must
// never call .destroy() on a plane built from it (that would tear down
// the shared texture for every other consumer, including other tests).
describe("ParallaxPlane", () => {
  function makePlane(overrides: Partial<{ depth: number; tint: string; blur: number }> = {}) {
    return new ParallaxPlane({ id: "test-plane", depth: 0.5, texture: Texture.WHITE, ...overrides });
  }

  it("constructs without a live renderer and starts invisible", () => {
    const plane = makePlane();
    expect(plane.container.alpha).toBe(0);
  });

  it("setPointerOffset moves the sprite, scaled by depth", () => {
    const plane = makePlane({ depth: 1 });
    plane.setPointerOffset(0.5, -0.5);
    const offset = computeParallaxOffset(1, 0.5, -0.5);
    // container itself is untouched by pointer offset — only its sprite child moves.
    expect(plane.container.x).toBe(0);
    expect(plane.container.children[0].x).toBe(offset.x);
    expect(plane.container.children[0].y).toBe(offset.y);
  });

  it("setVisible with durationMs 0 is an instant cut, not a tween", () => {
    const plane = makePlane();
    plane.setVisible(true, 0);
    expect(plane.container.alpha).toBe(1);
    plane.setVisible(false, 0);
    expect(plane.container.alpha).toBe(0);
  });

  it("setVisible is a no-op when already at the target state", () => {
    const plane = makePlane();
    plane.setVisible(false, 0); // already false
    expect(plane.container.alpha).toBe(0);
  });

  it("skips the blur filter entirely when blur is 0 or omitted", () => {
    const plane = makePlane({ blur: 0 });
    expect((plane.container.children[0] as unknown as { filters: unknown[] }).filters).toHaveLength(0);
  });

  // Constructing an actual ColorMatrixFilter or BlurFilter probes for a
  // real WebGL-capable canvas at filter-construction time (Pixi tests
  // shader precision up front) — unavailable in Vitest's plain "node"
  // environment, and not worth jsdom for one file (same call this
  // codebase already made for sweepTween.test.ts). The tint/blur branch
  // that *decides whether* to construct them is covered above; the
  // filters themselves are verified in the browser — e2e and a visual
  // check in /dev/scene-lab.
});
