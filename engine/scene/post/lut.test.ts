import { describe, expect, it } from "vitest";
import { applyLutPreset, LUT_PRESETS, DEFAULT_LUT_KEY, resolveLutKey, type ColorMatrixLike } from "./lut";

function makeFakeFilter(): ColorMatrixLike & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    reset: () => calls.push("reset()"),
    brightness: (b, m) => calls.push(`brightness(${b}, ${m})`),
    contrast: (a, m) => calls.push(`contrast(${a}, ${m})`),
    saturate: (a, m) => calls.push(`saturate(${a}, ${m})`),
    hue: (r, m) => calls.push(`hue(${r}, ${m})`),
    tint: (c, m) => calls.push(`tint(${c}, ${m})`),
  };
}

describe("resolveLutKey", () => {
  it("passes through a known preset key", () => {
    expect(resolveLutKey("night")).toBe("night");
  });

  it("falls back to the default for an unknown or legacy key", () => {
    expect(resolveLutKey("engraving_dust")).toBe(DEFAULT_LUT_KEY);
    expect(resolveLutKey("none")).toBe(DEFAULT_LUT_KEY);
    expect(resolveLutKey("")).toBe(DEFAULT_LUT_KEY);
  });
});

describe("applyLutPreset", () => {
  it("resets before replaying a preset's ops, all multiplied", () => {
    const filter = makeFakeFilter();
    applyLutPreset(filter, "warm_dusk");
    expect(filter.calls[0]).toBe("reset()");
    expect(filter.calls.length).toBe(1 + LUT_PRESETS.warm_dusk.ops.length);
    expect(filter.calls.every((call, i) => i === 0 || call.endsWith(", true)"))).toBe(true);
  });

  it("is safe to call repeatedly on the same filter — each call is a full reset+replay, not additive", () => {
    const filter = makeFakeFilter();
    applyLutPreset(filter, "night");
    applyLutPreset(filter, "arid_heat");
    // Two resets, one per call — the second call didn't compose onto the first's result.
    expect(filter.calls.filter((c) => c === "reset()")).toHaveLength(2);
  });

  it("falls back to the default preset's ops for an unknown key", () => {
    const filter = makeFakeFilter();
    applyLutPreset(filter, "totally-unknown-key");
    const defaultFilter = makeFakeFilter();
    applyLutPreset(defaultFilter, DEFAULT_LUT_KEY);
    expect(filter.calls).toEqual(defaultFilter.calls);
  });

  it("every preset has at least a tint and covers all four required moods", () => {
    expect(Object.keys(LUT_PRESETS).sort()).toEqual(["arid_heat", "cold_overcast", "night", "warm_dusk"]);
    for (const preset of Object.values(LUT_PRESETS)) {
      expect(preset.ops.some((op) => op.op === "tint")).toBe(true);
    }
  });
});
