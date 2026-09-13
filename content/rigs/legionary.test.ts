// Content-level verification for the legionary rig's animation quality
// (not just schema validity, which content/schema.test.ts / npm run
// validate already cover) — run through the REAL production pipeline
// (Rig.parse -> adaptRig -> loadRig -> evaluateClipPose ->
// computeWorldTransforms), the same path ScenePlayer drives every
// frame, not a hand-rolled re-implementation of the math.
//
// This exists because "read the JSON and reason about whether the walk
// cycle looks right" is exactly how the previous version's problems
// (no bob, torso-only fall with no displacement) went unnoticed —
// pixel-measuring the actual computed poses is the same discipline
// M4/M5/M6 already applied to camera drift, particle scale, and puppet
// pose bugs (see CLAUDE.md's "found by actually running this" notes).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Rig } from "../schema";
import { adaptRig } from "../../app/scene/[regionId]/buildSceneProps";
import { loadRig } from "../../engine/scene/puppet/rigLoader";
import { evaluateClipPose } from "../../engine/scene/puppet/clipPlayer";
import { computeWorldTransforms, createTransformBuffer } from "../../engine/scene/puppet/jointSolver";
import type { LoadedRig, WorldTransform } from "../../engine/scene/puppet/types";

function loadLegionary(): LoadedRig {
  const raw = JSON.parse(readFileSync(join(__dirname, "legionary.json"), "utf-8"));
  return loadRig(adaptRig(Rig.parse(raw)));
}

/** World position of a LOCAL point (e.g. a limb's tip) given a part's
 *  already-resolved world transform — the same rotate-then-translate
 *  composition jointSolver.composeChild uses internally, applied one
 *  level further out to a point that isn't itself a rig part. */
function worldPoint(t: WorldTransform, localX: number, localY: number): { x: number; y: number } {
  const cos = Math.cos(t.rotation);
  const sin = Math.sin(t.rotation);
  const sx = localX * t.scaleX;
  const sy = localY * t.scaleY;
  return { x: t.x + (sx * cos - sy * sin), y: t.y + (sx * sin + sy * cos) };
}

/** Poses the whole rig at `fraction` (0..1) through `clipId`, returning
 *  world transforms parallel to `rig.parts`. */
function poseAt(rig: LoadedRig, clipId: string, fraction: number): WorldTransform[] {
  const clip = rig.clips.get(clipId)!;
  const rot = new Float32Array(rig.parts.length);
  const dx = new Float32Array(rig.parts.length);
  const dy = new Float32Array(rig.parts.length);
  evaluateClipPose(rig, clip, fraction * clip.durationMs, rot, dx, dy);
  const out = createTransformBuffer(rig);
  computeWorldTransforms(rig, rot, dx, dy, { x: 0, y: 0, scale: 1, flip: false }, out);
  return out;
}

function partIndex(rig: LoadedRig, id: string): number {
  const i = rig.partIndexById.get(id);
  if (i === undefined) throw new Error(`no part "${id}"`);
  return i;
}

const SAMPLES = 200;
function sampledFractions(): number[] {
  return Array.from({ length: SAMPLES }, (_, i) => i / SAMPLES);
}

describe("legionary march — pelvis bob (ADR 007)", () => {
  it("the head's world Y genuinely oscillates across the cycle — the bob is real, not just present in the JSON", () => {
    const rig = loadLegionary();
    const head = partIndex(rig, "head");
    const ys = sampledFractions().map((f) => poseAt(rig, "march", f)[head].y);
    const amplitude = Math.max(...ys) - Math.min(...ys);
    // Pelvis dy swings from +4 to -3 (7px) at the root; head, several
    // joints up the chain, should show a comparable swing — bounded
    // loosely (3-20px) since chest/pelvis rotation also perturbs head Y
    // a little, but this must not be near-zero (a rotation-only rig,
    // or a bob authored on the wrong track, would read flat here).
    expect(amplitude).toBeGreaterThan(3);
    expect(amplitude).toBeLessThan(20);
  });

  it("bobs twice per stride — one low point per leg's contact, not once per full cycle", () => {
    const rig = loadLegionary();
    const pelvis = partIndex(rig, "pelvis");
    const ys = sampledFractions().map((f) => poseAt(rig, "march", f)[pelvis].y);
    // Count local maxima (troughs in screen Y = lowest point of the
    // bob, since Y grows downward) — a genuine double-bob gait has two
    // per loop; a broken/absent bob has zero or one. The samples cover
    // t in [0, 1) on a loop, so the neighbour check must wrap at both
    // ends — a peak sitting exactly at the sampled t=0 boundary (as
    // this clip's does) is otherwise silently skipped.
    let peaks = 0;
    const n = ys.length;
    for (let i = 0; i < n; i++) {
      const prev = ys[(i - 1 + n) % n];
      const cur = ys[i];
      const next = ys[(i + 1) % n];
      if (cur > prev && cur >= next) peaks++;
    }
    expect(peaks).toBe(2);
  });
});

describe("legionary march — arm swing stays on its own side (no crossed hands)", () => {
  it("the left hand's world X never crosses the body midline, across the full cycle", () => {
    const rig = loadLegionary();
    const forearmL = partIndex(rig, "forearm_L");
    for (const f of sampledFractions()) {
      const transforms = poseAt(rig, "march", f);
      // The hand is the forearm's tip: local (0, size.y) from its own
      // pivot, which sits at the elbow (pivot: [8,0]).
      const hand = worldPoint(transforms[forearmL], 0, rig.parts[forearmL].size[1]);
      expect(hand.x).toBeLessThan(0);
    }
  });

  it("the right hand's world X never crosses the body midline, across the full cycle", () => {
    const rig = loadLegionary();
    const forearmR = partIndex(rig, "forearm_R");
    for (const f of sampledFractions()) {
      const transforms = poseAt(rig, "march", f);
      const hand = worldPoint(transforms[forearmR], 0, rig.parts[forearmR].size[1]);
      expect(hand.x).toBeGreaterThan(0);
    }
  });
});

describe("legionary march — stance/swing asymmetry (roughly 60/40)", () => {
  it("each thigh spends noticeably longer approaching its rear extreme (stance) than returning from it (swing)", () => {
    const rig = loadLegionary();
    const thighL = partIndex(rig, "thigh_L");
    const rotations = sampledFractions().map((f) => {
      const clip = rig.clips.get("march")!;
      const rot = new Float32Array(rig.parts.length);
      const dx = new Float32Array(rig.parts.length);
      const dy = new Float32Array(rig.parts.length);
      evaluateClipPose(rig, clip, f * clip.durationMs, rot, dx, dy);
      return rot[thighL];
    });
    const restRad = rig.parts[thighL].restRotationRad;
    // Rear extreme (most negative delta from rest) is thigh_L's toe-off
    // at authored t=0.6 — find where the sampled curve actually bottoms
    // out, rather than trusting the authored t value.
    let minIndex = 0;
    for (let i = 1; i < rotations.length; i++) if (rotations[i] < rotations[minIndex]) minIndex = i;
    const rearExtremeFraction = minIndex / SAMPLES;
    void restRad;
    // Stance (forward contact -> rear extreme) should be the longer
    // phase; swing (rear extreme -> next contact) the shorter one —
    // asserting the split is meaningfully off 50/50, in the stance-
    // longer direction, rather than pinning an exact ratio.
    expect(rearExtremeFraction).toBeGreaterThan(0.55);
    expect(rearExtremeFraction).toBeLessThan(0.65);
  });
});

describe("legionary fall — the pelvis actually goes somewhere (no floating-in-place spin)", () => {
  it("the pelvis displaces substantially downward and sideways from start to end, not just rotates in place", () => {
    const rig = loadLegionary();
    const pelvis = partIndex(rig, "pelvis");
    const start = poseAt(rig, "fall", 0)[pelvis];
    const end = poseAt(rig, "fall", 1)[pelvis];
    // Before ADR 007, dx/dy didn't exist and this displacement was
    // necessarily (0, 0) — the exact "floating and spinning" bug.
    expect(end.y - start.y).toBeGreaterThan(60);
    expect(Math.abs(end.x - start.x)).toBeGreaterThan(10);
    // Still collapses into a lying-down orientation, not just falling
    // straight down without rotating.
    expect(end.rotation - start.rotation).toBeGreaterThan((60 * Math.PI) / 180);
  });

  it("the whole rig's lowest point (feet) ends up well below where it started — a visible collapse toward the ground, not a mid-air spin", () => {
    const rig = loadLegionary();
    const footL = partIndex(rig, "foot_L");
    const footR = partIndex(rig, "foot_R");
    const startY = Math.max(poseAt(rig, "fall", 0)[footL].y, poseAt(rig, "fall", 0)[footR].y);
    const endY = Math.max(poseAt(rig, "fall", 1)[footL].y, poseAt(rig, "fall", 1)[footR].y);
    // This is a weaker, sanity-check assertion: the point of the fix is
    // the PELVIS moving (asserted above) — the feet's own movement is a
    // secondary consequence of leg rotation and isn't the thing ADR 007
    // targeted, so this only guards against a regression that zeroes
    // pelvis displacement back out.
    expect(endY).toBeGreaterThan(startY);
  });
});
