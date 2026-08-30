import { describe, expect, it } from "vitest";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { classifyProvince } from "./MorphBorders";

describe("classifyProvince", () => {
  it("held before and after is retained", () => {
    expect(classifyProvince({ heldBefore: true, heldAfter: true })).toBe("retained");
  });

  it("not held before, held after is gained", () => {
    expect(classifyProvince({ heldBefore: false, heldAfter: true })).toBe("gained");
  });

  it("held before, not held after is lost", () => {
    expect(classifyProvince({ heldBefore: true, heldAfter: false })).toBe("lost");
  });

  it("not held before or after is unheld", () => {
    expect(classifyProvince({ heldBefore: false, heldAfter: false })).toBe("unheld");
  });
});

// M2's geometry finding, as a regression test rather than a one-off probe:
// MorphSVGPlugin equalizes differing vertex counts by subdividing the
// shorter path, cleanly, with no NaN corruption. Uses the plugin's own
// pure string API (normalizeStrings/stringToRawPath) — these never touch
// `document`, only gsap.registerPlugin() does, so this runs fine under
// Vitest's plain `node` environment with no DOM.
//
// Today's real province content has exactly one geometry per province
// (era only gates heldFrom/heldTo, not shape — see MorphBorders.ts), so
// there's no real cross-era vertex-count mismatch to test against yet.
// These paths are synthetic stand-ins with a similar point-count spread
// to what hand-authored per-era boundaries might look like.
describe("MorphSVGPlugin vertex-count handling (M2 geometry finding)", () => {
  const ninePoint = "M100,100 L140,90 L180,100 L200,140 L190,180 L150,200 L110,190 L80,160 L70,120 Z";
  const sevenPoint = "M100,100 L160,80 L220,110 L230,170 L190,220 L120,210 L60,150 Z";
  const thirteenPoint =
    "M100,100 L120,85 L150,80 L180,85 L210,100 L225,130 L220,165 L200,195 L165,210 L130,205 L95,180 L75,145 L80,115 Z";

  function rawPointCount(path: string): number {
    const raw = MorphSVGPlugin.stringToRawPath(path);
    return raw[0].length / 2;
  }

  it("equalizes a shorter path up to match a longer one, with no NaN", () => {
    expect(rawPointCount(ninePoint)).not.toBe(rawPointCount(sevenPoint));

    const [a, b] = MorphSVGPlugin.normalizeStrings(ninePoint, sevenPoint, {});
    expect(rawPointCount(a)).toBe(rawPointCount(b));
    expect(a).not.toContain("NaN");
    expect(b).not.toContain("NaN");
  });

  it("equalizes regardless of which side is longer", () => {
    const [a, b] = MorphSVGPlugin.normalizeStrings(ninePoint, thirteenPoint, {});
    expect(rawPointCount(a)).toBe(rawPointCount(b));
    expect(a).not.toContain("NaN");
    expect(b).not.toContain("NaN");
  });

  it("is a no-op on identical paths — the case every retained province hits today", () => {
    const [a, b] = MorphSVGPlugin.normalizeStrings(ninePoint, ninePoint, {});
    expect(rawPointCount(a)).toBe(rawPointCount(b));
    expect(rawPointCount(a)).toBe(rawPointCount(ninePoint));
  });
});
