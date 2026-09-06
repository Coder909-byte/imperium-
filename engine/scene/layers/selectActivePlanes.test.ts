import { describe, expect, it } from "vitest";
import { selectPlanesForTier } from "./selectActivePlanes";
import type { ScenePlane } from "../types";

function plane(id: string, depth: number): ScenePlane {
  return { id, depth, tint: "#000000", blur: 0 };
}

describe("selectPlanesForTier", () => {
  it("keeps every plane on high tier regardless of count", () => {
    const planes = [plane("a", 0), plane("b", 0.3), plane("c", 0.6), plane("d", 0.8), plane("e", 1)];
    expect(selectPlanesForTier(planes, "high")).toHaveLength(5);
  });

  it("keeps every plane on low tier when already at or under the cap", () => {
    const planes = [plane("sky", 0.05), plane("far_hills", 0.25), plane("mid_ground", 0.55), plane("foreground", 0.9)];
    const result = selectPlanesForTier(planes, "low");
    expect(result.map((p) => p.id).sort()).toEqual(["far_hills", "foreground", "mid_ground", "sky"]);
  });

  it("caps to 4 on low tier when there are more, spanning the full depth range", () => {
    const planes = [
      plane("sky", 0),
      plane("far_arch", 0.15),
      plane("mid_arch", 0.35),
      plane("mid_terrain", 0.5),
      plane("stage", 0.65),
      plane("near_terrain", 0.8),
      plane("foreground", 1),
    ];
    const result = selectPlanesForTier(planes, "low");
    expect(result).toHaveLength(4);
    // The nearest and farthest planes are never dropped — losing either
    // extreme would flatten the depth stack from the outside in.
    expect(result.some((p) => p.id === "sky")).toBe(true);
    expect(result.some((p) => p.id === "foreground")).toBe(true);
  });

  it("never mutates the input array", () => {
    const planes = [plane("a", 0), plane("b", 0.5), plane("c", 1)];
    const copy = [...planes];
    selectPlanesForTier(planes, "low");
    expect(planes).toEqual(copy);
  });
});
