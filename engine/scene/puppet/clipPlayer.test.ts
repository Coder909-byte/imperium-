import { describe, expect, it } from "vitest";
import { evaluateClipPose, resetToRestPose, resolveClipTimeMs } from "./clipPlayer";
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
      tracks: {
        root: [
          { t: 0, rot: 0, dx: 0, dy: 0, ease: "none" },
          { t: 0.5, rot: 90, dx: 8, dy: -4, ease: "none" },
          { t: 1, rot: 0, dx: 0, dy: 0, ease: "none" },
        ],
      },
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

function buffers(rig: ReturnType<typeof loadRig>) {
  return {
    rot: new Float32Array(rig.parts.length),
    dx: new Float32Array(rig.parts.length),
    dy: new Float32Array(rig.parts.length),
  };
}

describe("evaluateClipPose", () => {
  it("interpolates a tracked part's rotation between its surrounding keyframes", () => {
    const rig = loadRig(RIG);
    const clip = rig.clips.get("swing")!;
    const { rot, dx, dy } = buffers(rig);
    evaluateClipPose(rig, clip, 250, rot, dx, dy); // halfway through the first segment (0 -> 500ms)
    // rest(10deg) + halfway between 0 and 90 = rest + 45deg
    expect(rot[0]).toBeCloseTo((10 + 45) * DEG, 2);
  });

  it("interpolates a tracked part's dx/dy translation the same way as rot — same segment, same eased progress (ADR 007)", () => {
    const rig = loadRig(RIG);
    const clip = rig.clips.get("swing")!;
    const { rot, dx, dy } = buffers(rig);
    evaluateClipPose(rig, clip, 250, rot, dx, dy); // halfway between (dx:0,dy:0) and (dx:8,dy:-4)
    expect(dx[0]).toBeCloseTo(4, 2);
    expect(dy[0]).toBeCloseTo(-2, 2);
  });

  it("defaults dx/dy to 0 for a keyframe that omits them — a clip authored before ADR 007 plays back unchanged", () => {
    const rig = loadRig(RIG);
    const clip = rig.clips.get("settle")!;
    const { rot, dx, dy } = buffers(rig);
    evaluateClipPose(rig, clip, 250, rot, dx, dy);
    expect(dx[0]).toBe(0);
    expect(dy[0]).toBe(0);
  });

  it("leaves an untracked part's entries untouched", () => {
    const rig = loadRig(RIG);
    const clip = rig.clips.get("swing")!;
    const { rot, dx, dy } = buffers(rig);
    rot[1] = 12345; // a sentinel — untracked part must not be overwritten
    dx[1] = 12345;
    evaluateClipPose(rig, clip, 250, rot, dx, dy);
    expect(rot[1]).toBe(12345);
    expect(dx[1]).toBe(12345);
  });

  it("holds a non-looping clip's final pose past its own duration", () => {
    const rig = loadRig(RIG);
    const clip = rig.clips.get("settle")!;
    const { rot, dx, dy } = buffers(rig);
    evaluateClipPose(rig, clip, 5000, rot, dx, dy);
    expect(rot[0]).toBeCloseTo((10 + 60) * DEG, 2);
  });

  it("loops a looping clip's pose back toward its start past its duration", () => {
    const rig = loadRig(RIG);
    const clip = rig.clips.get("swing")!;
    const { rot, dx, dy } = buffers(rig);
    evaluateClipPose(rig, clip, 1000 + 250, rot, dx, dy); // one full loop plus 250ms
    expect(rot[0]).toBeCloseTo((10 + 45) * DEG, 2);
    expect(dx[0]).toBeCloseTo(4, 2);
  });
});

describe("resetToRestPose", () => {
  it("writes every part's rest rotation and zeroes translation, overwriting whatever was there", () => {
    const rig = loadRig(RIG);
    const { rot, dx, dy } = buffers(rig);
    rot.fill(999);
    dx.fill(999);
    dy.fill(999);
    resetToRestPose(rig, rot, dx, dy);
    expect(rot[0]).toBeCloseTo(10 * DEG);
    expect(rot[1]).toBeCloseTo(-5 * DEG);
    expect(dx[0]).toBe(0);
    expect(dy[0]).toBe(0);
  });
});
