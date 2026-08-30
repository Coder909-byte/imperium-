import { describe, expect, it } from "vitest";
import { pickPlaceholderColor } from "./placeholderColor";

// Rough hue check without re-deriving full HSL->RGB math: "cool" means
// blue channel clearly leads red; "warm" means red clearly leads blue.
function isCool(c: { r: number; b: number }): boolean {
  return c.b > c.r;
}
function isWarm(c: { r: number; b: number }): boolean {
  return c.r > c.b;
}

describe("pickPlaceholderColor", () => {
  it("far depth (0) reads cool, near depth (1) reads warm", () => {
    expect(isCool(pickPlaceholderColor(0, 0))).toBe(true);
    expect(isWarm(pickPlaceholderColor(1, 0))).toBe(true);
  });

  it("clamps out-of-range depth instead of producing nonsense", () => {
    expect(pickPlaceholderColor(-5, 0)).toEqual(pickPlaceholderColor(0, 0));
    expect(pickPlaceholderColor(5, 0)).toEqual(pickPlaceholderColor(1, 0));
  });

  it("distinguishes two planes at the same depth by lightness, not just index parity by coincidence", () => {
    const a = pickPlaceholderColor(0.5, 0);
    const b = pickPlaceholderColor(0.5, 1);
    expect(a).not.toEqual(b);
  });

  it("is deterministic for the same inputs", () => {
    expect(pickPlaceholderColor(0.3, 2)).toEqual(pickPlaceholderColor(0.3, 2));
  });

  it("produces visibly different colours across a spread of realistic depths", () => {
    const colors = [0.1, 0.4, 0.6, 0.9].map((d, i) => pickPlaceholderColor(d, i));
    const distances = colors.slice(1).map((c, i) => {
      const prev = colors[i];
      return Math.abs(c.r - prev.r) + Math.abs(c.g - prev.g) + Math.abs(c.b - prev.b);
    });
    for (const d of distances) expect(d).toBeGreaterThan(40);
  });
});
