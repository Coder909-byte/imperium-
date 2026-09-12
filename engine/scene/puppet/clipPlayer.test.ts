import { describe, expect, it } from "vitest";
import { evaluateClipRotations, resetToRestRotations, resolveClipTimeMs } from "./clipPlayer";
import { loadRig } from "./rigLoader";
import type { RigDef } from "./types";

const RIG: RigDef = {
  id: "test",
  parts: [
    { id: "root", parent: null, texture: "t", pivot: [0, 0], size: [10, 10], zOrder: 0, rest: { x: 0, y: 0, rotation: 10, scale: 1 } },
    { id: "untracked", parent: "root", texture: "t", pivot: [0, 0], size: [10, 10], zOrder: 0, rest: { x: 0, y: 0, rotation: -5, scale: 1 } },
  ],
  clips: [
    {
      id: "swing",
      durationMs: 1000,
      loop: true,
      tracks: { root: [{ t: 0, rot: 0, ease: "none" }, { t: 0.5, rot: 90, ease: "none" }, { t: 1, rot: 0, ease: "none" }] },
    },
    {
      id: "settle",
      durationMs: 500,
      loop: false,
      tracks: { root: [{ t: 0, rot: 0, ease: "none" }, { t: 1, rot: 60, ease: "none" }] },
    },
  ],
};

const DEG = Math.PI / 180;

describe("resolveClipTimeMs", () => {
  it("wraps a looping clip's time modulo its duration", () => {
    const rig = loadRig(RIG);
    const clip = rig.clips.get("swing")!;
    expect(resolveClipTimeMs(clip, 1200)).toBeCloseTo(200);
    expect(resolveClipTimeMs(clip, 2000)).toBeCloseTo(0);
  });

  it("clamps a non-looping clip's time to its duration — it holds the final frame, not wraps", () => {
    const rig = loadRig(RIG);
    const clip = rig.clips.get("settle")!;
    expect(resolveClipTimeMs(clip, 5000)).toBe(500);
  });
});

describe("evaluateClipRotations", () => {
  it("interpolates a tracked part between its surrounding keyframes", () => {
    const rig = loadRig(RIG);
    const clip = rig.clips.get("swing")!;
    const out = new Float32Array(rig.parts.length);
    evaluateClipRotations(rig, clip, 250, out); // halfway through the first segment (0 -> 500ms)
    // rest(10deg) + halfway between 0 and 90 = rest + 45deg
    expect(out[0]).toBeCloseTo((10 + 45) * DEG, 2);
  });

  it("leaves an untracked part's entry untouched", () => {
    const rig = loadRig(RIG);
    const clip = rig.clips.get("swing")!;
    const out = new Float32Array(rig.parts.length);
    out[1] = 12345; // a sentinel — untracked part must not be overwritten
    evaluateClipRotations(rig, clip, 250, out);
    expect(out[1]).toBe(12345);
  });

  it("holds a non-looping clip's final pose past its own duration", () => {
    const rig = loadRig(RIG);
    const clip = rig.clips.get("settle")!;
    const out = new Float32Array(rig.parts.length);
    evaluateClipRotations(rig, clip, 5000, out);
    expect(out[0]).toBeCloseTo((10 + 60) * DEG, 2);
  });

  it("loops a looping clip's pose back toward its start past its duration", () => {
    const rig = loadRig(RIG);
    const clip = rig.clips.get("swing")!;
    const out = new Float32Array(rig.parts.length);
    evaluateClipRotations(rig, clip, 1000 + 250, out); // one full loop plus 250ms
    expect(out[0]).toBeCloseTo((10 + 45) * DEG, 2);
  });
});

describe("resetToRestRotations", () => {
  it("writes every part's rest rotation, overwriting whatever was there", () => {
    const rig = loadRig(RIG);
    const out = new Float32Array(rig.parts.length).fill(999);
    resetToRestRotations(rig, out);
    expect(out[0]).toBeCloseTo(10 * DEG);
    expect(out[1]).toBeCloseTo(-5 * DEG);
  });
});
