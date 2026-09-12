import { describe, expect, it } from "vitest";
import { computeWorldTransforms, createTransformBuffer } from "./jointSolver";
import { loadRig } from "./rigLoader";
import type { RigDef } from "./types";

// root -> child -> grandchild, a straight chain, matching the shape a
// leg (torso -> thigh -> shin) actually uses.
const CHAIN: RigDef = {
  id: "chain",
  parts: [
    { id: "root", parent: null, texture: "t", pivot: [0, 0], size: [10, 10], zOrder: 0, rest: { x: 100, y: 200, rotation: 0, scale: 1 } },
    { id: "child", parent: "root", texture: "t", pivot: [0, 0], size: [10, 10], zOrder: 0, rest: { x: 0, y: 10, rotation: 0, scale: 1 } },
    { id: "grandchild", parent: "child", texture: "t", pivot: [0, 0], size: [10, 10], zOrder: 0, rest: { x: 0, y: 10, rotation: 0, scale: 1 } },
  ],
  clips: [],
};

function localRotations(...values: number[]): Float32Array {
  return Float32Array.from(values);
}

describe("computeWorldTransforms", () => {
  it("places the root at the actor's placement plus its own rest offset", () => {
    const rig = loadRig(CHAIN);
    const out = createTransformBuffer(rig);
    computeWorldTransforms(rig, localRotations(0, 0, 0), { x: 5, y: 7, scale: 1, flip: false }, out);
    // root.rest = (100, 200); placement adds (5, 7).
    expect(out[0].x).toBeCloseTo(105);
    expect(out[0].y).toBeCloseTo(207);
  });

  it("rotating a parent carries its child to a new world position, not just a new rotation", () => {
    const rig = loadRig(CHAIN);
    const out = createTransformBuffer(rig);
    const atRest = createTransformBuffer(rig);
    computeWorldTransforms(rig, localRotations(0, 0, 0), { x: 0, y: 0, scale: 1, flip: false }, atRest);
    computeWorldTransforms(rig, localRotations(Math.PI / 2, 0, 0), { x: 0, y: 0, scale: 1, flip: false }, out);

    // Child's world position must move (carried by the parent's
    // rotation), not stay pinned where it was at rest.
    expect(out[1].x).not.toBeCloseTo(atRest[1].x);
    // A 90 degree parent rotation maps local (0, 10) to world (-10, 0)
    // relative to the parent, given this module's rotation convention.
    expect(out[1].x).toBeCloseTo(atRest[0].x - 10);
    expect(out[1].y).toBeCloseTo(atRest[0].y);
    // Child's own world rotation carries the parent's rotation too.
    expect(out[1].rotation).toBeCloseTo(Math.PI / 2);
  });

  it("a grandchild inherits rotation from both its parent and grandparent", () => {
    const rig = loadRig(CHAIN);
    const out = createTransformBuffer(rig);
    computeWorldTransforms(rig, localRotations(0.3, 0.4, 0.1), { x: 0, y: 0, scale: 1, flip: false }, out);
    expect(out[2].rotation).toBeCloseTo(0.3 + 0.4 + 0.1);
  });

  it("flip mirrors a child's x offset and the direction its own rotation is carried in", () => {
    // A root centred at its placement (rest 0,0) isolates the child's
    // OWN offset from the root's — CHAIN's root.rest.x (100) would
    // otherwise dominate the x comparison below.
    const zeroedRoot: RigDef = { ...CHAIN, parts: [{ ...CHAIN.parts[0], rest: { x: 0, y: 0, rotation: 0, scale: 1 } }, CHAIN.parts[1], CHAIN.parts[2]] };
    const rig = loadRig(zeroedRoot);
    const unflipped = createTransformBuffer(rig);
    const flipped = createTransformBuffer(rig);
    computeWorldTransforms(rig, localRotations(0, 0, 0), { x: 0, y: 0, scale: 1, flip: false }, unflipped);
    computeWorldTransforms(rig, localRotations(0, 0, 0), { x: 0, y: 0, scale: 1, flip: true }, flipped);
    // child.rest = (0, 10) — a pure y offset, so flip (which only
    // negates x) shouldn't move it sideways at rest...
    expect(flipped[1].x).toBeCloseTo(unflipped[1].x);

    // ...but a NONZERO local rotation on the root, under flip, should
    // carry the child to the mirror-image position of the unflipped case.
    const unflippedRotated = createTransformBuffer(rig);
    const flippedRotated = createTransformBuffer(rig);
    computeWorldTransforms(rig, localRotations(0.5, 0, 0), { x: 0, y: 0, scale: 1, flip: false }, unflippedRotated);
    computeWorldTransforms(rig, localRotations(0.5, 0, 0), { x: 0, y: 0, scale: 1, flip: true }, flippedRotated);
    expect(flippedRotated[1].x).toBeCloseTo(-unflippedRotated[1].x);
  });

  it("never allocates a new object per part — `out` entries are mutated in place", () => {
    const rig = loadRig(CHAIN);
    const out = createTransformBuffer(rig);
    const refs = out.map((t) => t);
    computeWorldTransforms(rig, localRotations(0.1, 0.2, 0.3), { x: 1, y: 2, scale: 1, flip: false }, out);
    out.forEach((t, i) => expect(t).toBe(refs[i]));
  });
});
