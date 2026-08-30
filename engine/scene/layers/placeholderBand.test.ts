import { describe, expect, it } from "vitest";
import { computePlaceholderBand } from "./placeholderBand";

describe("computePlaceholderBand", () => {
  it("a far plane (depth 0) is nearly full height", () => {
    const band = computePlaceholderBand(0, 1000, 700);
    expect(band.height).toBe(700);
    expect(band.baseOffsetY).toBe(0);
  });

  it("a nearer plane is shorter and shifted down to stay bottom-anchored", () => {
    const far = computePlaceholderBand(0.1, 1000, 700);
    const near = computePlaceholderBand(0.9, 1000, 700);
    expect(near.height).toBeLessThan(far.height);
    expect(near.baseOffsetY).toBeGreaterThan(far.baseOffsetY);
  });

  it("bottom edges land at the same place regardless of depth (baseOffsetY + height/2 is constant)", () => {
    const overscanHeight = 700;
    for (const depth of [0, 0.2, 0.5, 0.8, 1]) {
      const band = computePlaceholderBand(depth, 1000, overscanHeight);
      expect(band.baseOffsetY + band.height / 2).toBeCloseTo(overscanHeight / 2, 5);
    }
  });

  it("never shrinks below the minimum height fraction, even at depth 1", () => {
    const band = computePlaceholderBand(1, 1000, 700);
    expect(band.height).toBeGreaterThanOrEqual(700 * 0.3 - 0.001);
  });

  it("clamps out-of-range depth", () => {
    expect(computePlaceholderBand(-1, 1000, 700)).toEqual(computePlaceholderBand(0, 1000, 700));
    expect(computePlaceholderBand(5, 1000, 700)).toEqual(computePlaceholderBand(1, 1000, 700));
  });

  it("width always passes through unchanged — only height bands", () => {
    expect(computePlaceholderBand(0.4, 1234, 700).width).toBe(1234);
  });
});
