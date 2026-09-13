// Texture.WHITE needs no real canvas/renderer to construct a Sprite
// from (same call ParallaxPlane.test.ts already made) — PuppetActor
// itself only ever builds plain Sprites/Containers, never a filter, so
// unlike ParticleField/CrowdField (which need a real ParticleContainer,
// and so a real renderer) it's fully unit-testable here.
import { describe, expect, it } from "vitest";
import { Texture } from "pixi.js";
import { loadRig } from "../puppet/rigLoader";
import type { RigDef } from "../puppet/types";
import { PuppetActor } from "./PuppetActor";

// root -> child -> grandchild: a rotation TRACKED ON "child" only moves
// "child"'s own sprite.rotation directly — its position is unaffected
// by its own rotation, only by its parent's. "grandchild" is the part
// that actually has to move for "rotating a parent carries its
// children" to mean anything observable at the render-object level.
const RIG: RigDef = {
  id: "test",
  parts: [
    { id: "root", parent: null, texture: "t", pivot: [0, 0], size: [10, 10], zOrder: 0, rest: { x: 0, y: 0, rotation: 0, scale: 1 } },
    { id: "child", parent: "root", texture: "t", pivot: [0, 0], size: [10, 10], zOrder: 1, rest: { x: 0, y: 10, rotation: 0, scale: 1 } },
    { id: "grandchild", parent: "child", texture: "t", pivot: [0, 0], size: [10, 10], zOrder: 2, rest: { x: 0, y: 10, rotation: 0, scale: 1 } },
  ],
  clips: [
    {
      id: "wave",
      durationMs: 1000,
      loop: true,
      tracks: { child: [{ t: 0, rot: 0, ease: "none" }, { t: 0.5, rot: 90, ease: "none" }, { t: 1, rot: 0, ease: "none" }] },
    },
    { id: "settle", durationMs: 500, loop: false, tracks: { child: [{ t: 0, rot: 0, ease: "none" }, { t: 1, rot: 45, ease: "none" }] } },
  ],
};

function makeTextures(rig: ReturnType<typeof loadRig>): Map<string, Texture> {
  return new Map(rig.parts.map((part) => [part.id, Texture.WHITE]));
}

describe("PuppetActor", () => {
  it("constructs one sprite per rig part, positioned at its rest pose", () => {
    const rig = loadRig(RIG);
    const actor = new PuppetActor({ rig, textures: makeTextures(rig), clipId: "wave", x: 5, y: 7, scale: 1, flip: false, phaseMs: 0 });
    expect(actor.container.children).toHaveLength(3);
    // root at rest: placement (5,7) + its own rest offset (0,0).
    expect(actor.container.children[0].x).toBeCloseTo(5);
    expect(actor.container.children[0].y).toBeCloseTo(7);
  });

  it("tick() carries a child to a new world position as its parent's rotation changes — the transform-hierarchy acceptance criterion, exercised through the real render objects", () => {
    const rig = loadRig(RIG);
    const actor = new PuppetActor({ rig, textures: makeTextures(rig), clipId: "wave", x: 0, y: 0, scale: 1, flip: false, phaseMs: 0 });
    const before = { x: actor.container.children[2].x, y: actor.container.children[2].y };
    actor.tick(250); // quarter into the 1000ms loop -> partway through the 0->90deg swing
    const after = { x: actor.container.children[2].x, y: actor.container.children[2].y };
    expect(after).not.toEqual(before);
  });

  it("all clips are playable and looping ones repeat — ticking a full loop period returns to the starting pose", () => {
    const rig = loadRig(RIG);
    for (const clipId of ["wave", "settle"]) {
      const actor = new PuppetActor({ rig, textures: makeTextures(rig), clipId, x: 0, y: 0, scale: 1, flip: false, phaseMs: 0 });
      expect(() => actor.tick(16)).not.toThrow();
    }
    const looping = new PuppetActor({ rig, textures: makeTextures(rig), clipId: "wave", x: 0, y: 0, scale: 1, flip: false, phaseMs: 0 });
    looping.tick(300);
    const midLoop = { x: looping.container.children[2].x, y: looping.container.children[2].y };
    looping.tick(1000); // exactly one full loop period later
    const oneLoopLater = { x: looping.container.children[2].x, y: looping.container.children[2].y };
    expect(oneLoopLater.x).toBeCloseTo(midLoop.x, 4);
    expect(oneLoopLater.y).toBeCloseTo(midLoop.y, 4);
  });

  it("a non-looping clip holds its final pose rather than resetting", () => {
    const rig = loadRig(RIG);
    const actor = new PuppetActor({ rig, textures: makeTextures(rig), clipId: "settle", x: 0, y: 0, scale: 1, flip: false, phaseMs: 0 });
    actor.tick(500); // exactly the clip's duration
    const atEnd = { x: actor.container.children[2].x, y: actor.container.children[2].y };
    actor.tick(2000); // long past it
    const wellPast = { x: actor.container.children[2].x, y: actor.container.children[2].y };
    expect(wellPast).toEqual(atEnd);
  });

  it("reduced motion holds the rest pose and ignores further ticks", () => {
    const rig = loadRig(RIG);
    const actor = new PuppetActor({ rig, textures: makeTextures(rig), clipId: "wave", x: 0, y: 0, scale: 1, flip: false, phaseMs: 0 });
    actor.tick(300); // mid-swing — not at rest
    const restX = actor.container.children[2].x; // captured before reduced motion, for a same-object reference below

    actor.setReducedMotion(true);
    const atRest = { x: actor.container.children[2].x, y: actor.container.children[2].y };
    actor.tick(9999); // must be a no-op now
    expect(actor.container.children[2].x).toBe(atRest.x);
    expect(actor.container.children[2].y).toBe(atRest.y);
    // Sanity: the rest pose actually differs from the mid-swing pose
    // ticked above — otherwise this test couldn't tell "held" from
    // "coincidentally already there".
    expect(atRest.x).not.toBe(restX);
  });

  it("setClip resets elapsed time and falls back to rest for parts the new clip doesn't track", () => {
    const rig = loadRig(RIG);
    const actor = new PuppetActor({ rig, textures: makeTextures(rig), clipId: "wave", x: 0, y: 0, scale: 1, flip: false, phaseMs: 0 });
    actor.tick(300);
    actor.setClip("settle");
    // settle's own t:0 keyframe is rot:0 (== rest), same shape as fresh
    // construction — confirms the switch actually re-evaluated rather
    // than carrying over "wave"'s mid-swing pose.
    const rootRig = loadRig(RIG);
    const fresh = new PuppetActor({ rig: rootRig, textures: makeTextures(rootRig), clipId: "settle", x: 0, y: 0, scale: 1, flip: false, phaseMs: 0 });
    expect(actor.container.children[2].x).toBeCloseTo(fresh.container.children[2].x, 4);
    expect(actor.container.children[2].y).toBeCloseTo(fresh.container.children[2].y, 4);
  });

  it("a keyframe's dx/dy translates the sprite on top of rotation (ADR 007) — the whole clipPlayer->jointSolver pipeline, not just the math in isolation", () => {
    const rigWithBob: RigDef = {
      ...RIG,
      clips: [
        ...RIG.clips,
        { id: "bob", durationMs: 1000, loop: true, tracks: { root: [{ t: 0, rot: 0, dx: 0, dy: 0, ease: "none" }, { t: 0.5, rot: 0, dx: 0, dy: -20, ease: "none" }, { t: 1, rot: 0, dx: 0, dy: 0, ease: "none" }] } },
      ],
    };
    const rig = loadRig(rigWithBob);
    const actor = new PuppetActor({ rig, textures: makeTextures(rig), clipId: "bob", x: 0, y: 100, scale: 1, flip: false, phaseMs: 0 });
    const atStart = actor.container.children[0].y;
    actor.tick(500); // exactly the bob's peak (t: 0.5)
    expect(actor.container.children[0].y).toBeCloseTo(atStart - 20);
  });

  it("destroy() doesn't throw and leaves the container destroyed", () => {
    const rig = loadRig(RIG);
    const actor = new PuppetActor({ rig, textures: makeTextures(rig), clipId: "wave", x: 0, y: 0, scale: 1, flip: false, phaseMs: 0 });
    expect(() => actor.destroy()).not.toThrow();
    expect(actor.container.destroyed).toBe(true);
  });
});
