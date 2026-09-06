import { describe, expect, it } from "vitest";
import { selectActiveFilterIds, type PostChainState } from "./PostChain";

function state(overrides: Partial<PostChainState> = {}): PostChainState {
  return { tier: "high", lightSourceActive: false, chainEnabled: true, ...overrides };
}

describe("selectActiveFilterIds", () => {
  it("on high tier with a light source in frame, all six filters are active in PRD §4's fixed order", () => {
    expect(selectActiveFilterIds(state({ lightSourceActive: true }))).toEqual([
      "lut",
      "bloom",
      "godray",
      "grain",
      "chromaticAberration",
      "vignette",
    ]);
  });

  it("godray is excluded when no light source is in frame, even on high tier", () => {
    const ids = selectActiveFilterIds(state({ lightSourceActive: false }));
    expect(ids).not.toContain("godray");
    expect(ids).toEqual(["lut", "bloom", "grain", "chromaticAberration", "vignette"]);
  });

  it("low tier drops godray and chromatic aberration regardless of light source (PRD §11)", () => {
    const ids = selectActiveFilterIds(state({ tier: "low", lightSourceActive: true }));
    expect(ids).not.toContain("godray");
    expect(ids).not.toContain("chromaticAberration");
    expect(ids).toEqual(["lut", "bloom", "grain", "vignette"]);
  });

  it("chainEnabled: false is a total kill switch, independent of tier or light source", () => {
    expect(selectActiveFilterIds(state({ chainEnabled: false, lightSourceActive: true }))).toEqual([]);
    expect(selectActiveFilterIds(state({ chainEnabled: false, tier: "low" }))).toEqual([]);
  });

  it("never reorders the fixed PRD §4 chain order", () => {
    const ids = selectActiveFilterIds(state({ lightSourceActive: true }));
    const order = ["lut", "bloom", "godray", "grain", "chromaticAberration", "vignette"];
    const indices = ids.map((id) => order.indexOf(id));
    expect(indices).toEqual([...indices].sort((a, b) => a - b));
  });
});
