import { describe, expect, it } from "vitest";
import { loadRig } from "./rigLoader";
import type { RigDef } from "./types";

function part(overrides: Partial<RigDef["parts"][number]> & { id: string; parent: string | null }): RigDef["parts"][number] {
  return {
    texture: "limb",
    pivot: [0, 0],
    size: [10, 10],
    zOrder: 0,
    rest: { x: 0, y: 0, rotation: 0, scale: 1 },
    ...overrides,
  };
}

describe("loadRig", () => {
  it("orders parts root-first, so every part's parentIndex refers to an already-seen entry", () => {
    // Deliberately out of order in the source array — a leaf and a
    // mid-tree part both listed before their ancestors.
    const def: RigDef = {
      id: "test",
      parts: [
        part({ id: "grandchild", parent: "child" }),
        part({ id: "child", parent: "root" }),
        part({ id: "root", parent: null }),
      ],
      clips: [],
    };
    const rig = loadRig(def);
    const indexOf = (id: string) => rig.parts.findIndex((p) => p.id === id);
    expect(indexOf("root")).toBeLessThan(indexOf("child"));
    expect(indexOf("child")).toBeLessThan(indexOf("grandchild"));
    expect(rig.parts[indexOf("root")].parentIndex).toBe(-1);
    expect(rig.parts[indexOf("child")].parentIndex).toBe(indexOf("root"));
  });

  it("throws for zero roots", () => {
    const def: RigDef = { id: "test", parts: [part({ id: "a", parent: "b" }), part({ id: "b", parent: "a" })], clips: [] };
    expect(() => loadRig(def)).toThrow(/root/i);
  });

  it("throws for more than one root", () => {
    const def: RigDef = { id: "test", parts: [part({ id: "a", parent: null }), part({ id: "b", parent: null })], clips: [] };
    expect(() => loadRig(def)).toThrow(/root/i);
  });

  it("throws for a cyclical ancestor chain", () => {
    const def: RigDef = {
      id: "test",
      parts: [part({ id: "root", parent: null }), part({ id: "a", parent: "b" }), part({ id: "b", parent: "a" })],
      clips: [],
    };
    expect(() => loadRig(def)).toThrow(/cyclical|dangling/i);
  });

  it("resolves clip tracks to part indices and pre-parses eases into callables", () => {
    const def: RigDef = {
      id: "test",
      parts: [part({ id: "root", parent: null })],
      clips: [
        {
          id: "wave",
          durationMs: 1000,
          loop: true,
          tracks: { root: [{ t: 0, rot: 0, ease: "power1.inOut" }, { t: 1, rot: 45, ease: "power1.inOut" }] },
        },
      ],
    };
    const rig = loadRig(def);
    const clip = rig.clips.get("wave")!;
    const track = clip.trackByPartIndex[0]!;
    expect(track.partIndex).toBe(0);
    expect(typeof track.keyframes[0].easeFn).toBe("function");
    expect(track.keyframes[0].easeFn(0.5)).toBeGreaterThan(0);
    expect(track.keyframes[1].rotRad).toBeCloseTo((45 * Math.PI) / 180);
  });

  it("throws a clear error for a clip track referencing an unknown part", () => {
    const def: RigDef = {
      id: "test",
      parts: [part({ id: "root", parent: null })],
      clips: [{ id: "wave", durationMs: 1000, loop: false, tracks: { ghost: [{ t: 0, rot: 0, ease: "none" }] } }],
    };
    expect(() => loadRig(def)).toThrow(/ghost/);
  });
});
