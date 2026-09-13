// Rig-lint: a reusable, sampling-based check any content/rigs/*.json can
// be run through, once loaded (rigLoader.loadRig) — pure, no Pixi, same
// testability discipline as jointSolver/clipPlayer. Built after this
// session's manual pixel-measurement pass on the legionary rig caught
// (and, twice, mis-fixed) a hand-crossing bug — the point of this module
// is that the NEXT five rigs (M8) get that check for free, automatically,
// on every edit, instead of a bespoke script written by hand each time.
//
// Five checks, run per clip:
//  - continuity: a looping clip's authored t:0 and t:1 keyframe values
//    must match, or the loop visibly pops.
//  - midline crossing: no limb's end effector (a leaf part with a
//    definite left/right side) crosses the body centre line, unless the
//    clip explicitly exempts that part (RigClip.midlineExemptParts) —
//    crossing is always a stated author decision, never an accident.
//  - reach envelope: a non-root part's distance from its own parent
//    shouldn't grow much past its rest distance — rotation alone can
//    never do this (it preserves distance), so a violation means dx/dy
//    is being used to relocate a limb rather than displace it a little,
//    exactly the misuse ADR 007 flags as a risk.
//  - ground contact: for a clip marked `locomotion`, at least one
//    extremity that sits near the rig's own rest-pose ground line stays
//    near it throughout — otherwise the whole figure is airborne.
//  - L/R symmetry: for part pairs a clip declares symmetric
//    (RigClip.symmetricPairs), the two sides' rotation curves must show
//    a genuine mirror, checked under EITHER of two legitimate bilateral
//    conventions — same-instant (idle sway, a two-handed brace) or
//    half-cycle-shifted (a walk's alternating legs) — since a rig may
//    use either, and (found empirically fixing this session's own leg
//    sign bug) checking same-instant alone rejects a perfectly correct
//    alternating gait. A literal un-negated copy at either timing is
//    always flagged regardless of what it happens to correlate at —
//    correlation alone can be fooled by a curve with exact half-wave
//    symmetry, where a plain copy and a genuine shifted mirror compute
//    identically.
import { evaluateClipPose, resetToRestPose } from "./clipPlayer";
import { computeWorldTransforms, createTransformBuffer, type ActorPlacement } from "./jointSolver";
import type { LoadedClip, LoadedRig, WorldTransform } from "./types";

export interface RigLintIssue {
  clipId: string;
  check: "continuity" | "midline" | "reach" | "ground" | "symmetry";
  partId?: string;
  message: string;
}

const DEFAULT_SAMPLE_COUNT = 120;
// A bare rig, no scene placement — checks operate on the rig in
// isolation, the same way the rig inspector and this session's own
// manual verification script did.
const IDENTITY_PLACEMENT: ActorPlacement = { x: 0, y: 0, scale: 1, flip: false };

const ROT_CONTINUITY_TOL_RAD = (0.5 * Math.PI) / 180; // 0.5deg — looser than this reads as a visible pop, not rounding noise
const TRANSLATION_CONTINUITY_TOL_PX = 1;
const MIDLINE_EPSILON_PX = 2; // ignore a hair's-width cross right at the pivot — only flag a real, visible one
const GROUND_TOLERANCE_PX = 15; // how far a grounded extremity may lift before "nothing is down" reads as floating
const SYMMETRY_CORRELATION_MAX = -0.3; // must be meaningfully anti-correlated; 0 or positive reads as duplicated

interface ClipSample {
  fraction: number;
  localRot: Float32Array;
  localDx: Float32Array;
  localDy: Float32Array;
  world: WorldTransform[];
}

function sampleClip(rig: LoadedRig, clip: LoadedClip, sampleCount: number): ClipSample[] {
  const samples: ClipSample[] = [];
  for (let i = 0; i < sampleCount; i++) {
    const fraction = i / sampleCount;
    const rot = new Float32Array(rig.parts.length);
    const dx = new Float32Array(rig.parts.length);
    const dy = new Float32Array(rig.parts.length);
    // evaluateClipPose only writes TRACKED parts (see clipPlayer.ts) —
    // reset to rest first, exactly what PuppetActor does before ticking,
    // so an untracked part reads as its real rest pose, not zero.
    resetToRestPose(rig, rot, dx, dy);
    evaluateClipPose(rig, clip, fraction * clip.durationMs, rot, dx, dy);
    const world = createTransformBuffer(rig);
    computeWorldTransforms(rig, rot, dx, dy, IDENTITY_PLACEMENT, world);
    samples.push({ fraction, localRot: rot, localDx: dx, localDy: dy, world });
  }
  return samples;
}

/** Leaf parts — nothing else in the rig lists them as a parent. Used as
 *  the candidate set for both "end effector" (midline) and "grounded
 *  extremity" (ground contact) checks, so a rig doesn't need to name its
 *  hands/feet for this tool to find them. */
function findLeafIndices(rig: LoadedRig): number[] {
  const hasChildren = new Set<number>();
  for (const part of rig.parts) if (part.parentIndex !== -1) hasChildren.add(part.parentIndex);
  return rig.parts.map((_, i) => i).filter((i) => !hasChildren.has(i));
}

/** Which side of the body a part is structurally on: the sign of the
 *  first non-zero rest.x found walking up from the part to the root. A
 *  spine part (head, chest, pelvis — rest.x always 0) has no side, and
 *  "crossing the midline" isn't a meaningful concept for it. */
function findSide(rig: LoadedRig, partIndex: number): -1 | 0 | 1 {
  let i = partIndex;
  while (i !== -1) {
    const part = rig.parts[i];
    if (part.restX !== 0) return part.restX < 0 ? -1 : 1;
    i = part.parentIndex;
  }
  return 0;
}

function checkContinuity(rig: LoadedRig, clip: LoadedClip): RigLintIssue[] {
  if (!clip.loop) return [];
  const issues: RigLintIssue[] = [];
  for (let i = 0; i < rig.parts.length; i++) {
    const track = clip.trackByPartIndex[i];
    if (!track) continue;
    const first = track.keyframes[0];
    const last = track.keyframes[track.keyframes.length - 1];
    const rotDiff = Math.abs(first.rotRad - last.rotRad);
    const dxDiff = Math.abs(first.dx - last.dx);
    const dyDiff = Math.abs(first.dy - last.dy);
    if (rotDiff > ROT_CONTINUITY_TOL_RAD || dxDiff > TRANSLATION_CONTINUITY_TOL_PX || dyDiff > TRANSLATION_CONTINUITY_TOL_PX) {
      const partId = rig.parts[i].id;
      issues.push({
        clipId: clip.id,
        check: "continuity",
        partId,
        message: `"${partId}" doesn't return to its t:0 pose by t:1 (Δrot ${((rotDiff * 180) / Math.PI).toFixed(1)}°, Δdx ${dxDiff.toFixed(1)}px, Δdy ${dyDiff.toFixed(1)}px) — this loop will pop.`,
      });
    }
  }
  return issues;
}

function checkMidlineCrossing(rig: LoadedRig, clip: LoadedClip, leaves: number[], sides: Map<number, -1 | 1>, rootIndex: number, samples: ClipSample[]): RigLintIssue[] {
  const issues: RigLintIssue[] = [];
  for (const leafIndex of leaves) {
    const side = sides.get(leafIndex);
    if (side === undefined) continue; // no definite side (e.g. head) — not a midline-crossing candidate
    const partId = rig.parts[leafIndex].id;
    if (clip.midlineExemptParts.has(partId)) continue;
    // Report the WORST crossing, not the first one encountered scanning
    // forward from t=0 — an early, marginal graze can otherwise mask a
    // much larger crossing later in the same clip, understating exactly
    // how bad the problem is to whoever reads the message.
    let worst: { relativeX: number; fraction: number } | null = null;
    for (const sample of samples) {
      const relativeX = sample.world[leafIndex].x - sample.world[rootIndex].x;
      if (Math.abs(relativeX) > MIDLINE_EPSILON_PX && Math.sign(relativeX) !== side) {
        if (!worst || Math.abs(relativeX) > Math.abs(worst.relativeX)) worst = { relativeX, fraction: sample.fraction };
      }
    }
    if (worst) {
      issues.push({
        clipId: clip.id,
        check: "midline",
        partId,
        message: `"${partId}" crosses the body midline, worst at t≈${worst.fraction.toFixed(2)} (${worst.relativeX.toFixed(1)}px on the wrong side of the root) — add it to this clip's midlineExemptParts if that's intentional.`,
      });
    }
  }
  return issues;
}

function checkReachEnvelope(rig: LoadedRig, clip: LoadedClip, samples: ClipSample[]): RigLintIssue[] {
  const issues: RigLintIssue[] = [];
  for (let i = 0; i < rig.parts.length; i++) {
    const part = rig.parts[i];
    if (part.parentIndex === -1) continue; // the root's dx/dy is deliberate whole-body displacement (ADR 007), not a joint reach
    const restDist = Math.hypot(part.restX, part.restY);
    const maxAllowed = Math.max(restDist * 1.5, restDist + 20, 20);
    let worst: { dist: number; fraction: number } | null = null;
    for (const sample of samples) {
      const dist = Math.hypot(part.restX + sample.localDx[i], part.restY + sample.localDy[i]);
      if (dist > maxAllowed && (!worst || dist > worst.dist)) worst = { dist, fraction: sample.fraction };
    }
    if (worst) {
      issues.push({
        clipId: clip.id,
        check: "reach",
        partId: part.id,
        message: `"${part.id}" sits ${worst.dist.toFixed(0)}px from its parent at its worst (t≈${worst.fraction.toFixed(2)}), vs a ${restDist.toFixed(0)}px rest distance — dx/dy is stretching the joint rather than displacing it a little (ADR 007: not a positioning tool).`,
      });
    }
  }
  return issues;
}

interface GroundReference {
  groundY: number;
  candidates: number[];
}

/** The rig's own rest pose tells us where "the ground" is, without
 *  needing to know which parts are feet: whichever leaves sit lowest at
 *  rest (within a band of the very lowest) are the grounded-extremity
 *  candidates for every locomotion clip on this rig. */
function computeGroundReference(rig: LoadedRig, leaves: number[]): GroundReference | null {
  if (leaves.length === 0) return null;
  const rot = new Float32Array(rig.parts.length);
  const dx = new Float32Array(rig.parts.length);
  const dy = new Float32Array(rig.parts.length);
  resetToRestPose(rig, rot, dx, dy);
  const restWorld = createTransformBuffer(rig);
  computeWorldTransforms(rig, rot, dx, dy, IDENTITY_PLACEMENT, restWorld);
  const leafYs = leaves.map((i) => restWorld[i].y);
  const maxY = Math.max(...leafYs);
  const minY = Math.min(...leafYs);
  const band = Math.max((maxY - minY) * 0.25, 15);
  const candidates = leaves.filter((_, idx) => leafYs[idx] >= maxY - band);
  return { groundY: maxY, candidates };
}

function checkGroundContact(rig: LoadedRig, clip: LoadedClip, ground: GroundReference | null, samples: ClipSample[]): RigLintIssue[] {
  if (!ground || ground.candidates.length === 0) return [];
  for (const sample of samples) {
    // Y grows downward — the LOWEST (largest-Y) candidate is the one
    // closest to the ground at this instant.
    const closestToGroundY = Math.max(...ground.candidates.map((i) => sample.world[i].y));
    if (closestToGroundY < ground.groundY - GROUND_TOLERANCE_PX) {
      const names = ground.candidates.map((i) => rig.parts[i].id).join("/");
      return [
        {
          clipId: clip.id,
          check: "ground",
          message: `no grounded extremity (${names}) is within ${GROUND_TOLERANCE_PX}px of rest ground level at t≈${sample.fraction.toFixed(2)} — the figure is airborne.`,
        },
      ];
    }
  }
  return [];
}

/** Pearson correlation of two equal-length series, or null when either
 *  has ~zero variance (nothing to correlate against). */
function correlate(a: Float64Array, b: Float64Array): number | null {
  const n = a.length;
  let meanA = 0;
  let meanB = 0;
  for (let i = 0; i < n; i++) {
    meanA += a[i];
    meanB += b[i];
  }
  meanA /= n;
  meanB /= n;
  let num = 0;
  let denomA = 0;
  let denomB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    num += da * db;
    denomA += da * da;
    denomB += db * db;
  }
  if (denomA < 1e-6 || denomB < 1e-6) return null;
  return num / Math.sqrt(denomA * denomB);
}

/** Correlates `a` against `b` rotated by `shiftSamples` — i.e. against
 *  b's value `shiftSamples` samples later, wrapping. Used to test the
 *  half-cycle-shifted mirror convention below without a second copy of
 *  the correlation math. */
function correlateShifted(a: Float64Array, b: Float64Array, shiftSamples: number): number | null {
  const n = a.length;
  const shifted = new Float64Array(n);
  for (let i = 0; i < n; i++) shifted[i] = b[(i + shiftSamples) % n];
  return correlate(a, shifted);
}

/** Mean absolute difference between `a` and `b` rotated by `shiftSamples`.
 *  A literal copy-paste — R's track pasted from L's, whether left at the
 *  same t or merely re-timed to the other half of the cycle, but never
 *  actually mirrored (negated) — leaves this near zero. Correlation
 *  alone can't be trusted to catch that case: a curve with exact
 *  half-wave symmetry makes an un-negated half-cycle copy correlate at
 *  -1, indistinguishable from a genuine mirror by shape alone. This
 *  checks the literal numbers instead, as a direct backstop. */
function meanAbsDiffShifted(a: Float64Array, b: Float64Array, shiftSamples: number): number {
  const n = a.length;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += Math.abs(a[i] - b[(i + shiftSamples) % n]);
  return sum / n;
}

const LITERAL_MATCH_TOL_RAD = (1 * Math.PI) / 180; // 1deg average difference or less reads as an exact numeric match, not merely correlated

function checkSymmetry(rig: LoadedRig, clip: LoadedClip, samples: ClipSample[]): RigLintIssue[] {
  const issues: RigLintIssue[] = [];
  for (const [idL, idR] of clip.symmetricPairs) {
    const iL = rig.partIndexById.get(idL);
    const iR = rig.partIndexById.get(idR);
    if (iL === undefined || iR === undefined) continue; // unknown part id — content/schema.ts already rejects this at validate time
    const seriesL = Float64Array.from(samples, (s) => s.localRot[iL]);
    const seriesR = Float64Array.from(samples, (s) => s.localRot[iR]);
    const negatedR = Float64Array.from(seriesR, (v) => -v);
    const pairId = `${idL}/${idR}`;

    // A rig can legitimately mirror a pair either of two ways: the SAME
    // instant (idle sway, a two-handed brace — R(t) = -L(t)) or a
    // half-cycle-shifted anti-phase gait (a walk's alternating legs —
    // R(t) = -L(t - 0.5)). Both are true mirrors; only their timing
    // differs. Checking same-instant correlation alone is exactly what
    // let this session's own sign bug through validation once already
    // (legionary.json's march: thigh_L/thigh_R correlate at +0.94
    // same-instant — reads as duplicated — but at -1.0 once R is
    // compared against L half a cycle later, because that's the
    // relationship this rig's gait actually uses).
    const halfCycleShift = Math.round(samples.length / 2);

    // Checked in this order, and an earlier check short-circuits a
    // later one — a curve with exact half-wave symmetry (L(t+0.5) =
    // -L(t), which a simple back-and-forth swing often has) makes
    // "negated at shift 0" and "un-negated at the half-cycle shift"
    // numerically IDENTICAL, so a literal-copy backstop checked without
    // first ruling out a genuine negation match would misfire on
    // exactly that ordinary, correctly-authored case.
    //
    // 1. A genuine negation match (R ≈ -L) at EITHER shift always
    //    passes, however it correlates elsewhere.
    const negatedAtZero = meanAbsDiffShifted(seriesL, negatedR, 0);
    const negatedAtHalf = meanAbsDiffShifted(seriesL, negatedR, halfCycleShift);
    if (Math.min(negatedAtZero, negatedAtHalf) < LITERAL_MATCH_TOL_RAD) continue;

    // 2. Only once neither shift is a genuine negation: an un-negated
    //    copy at either shift is unambiguously a duplicate.
    const copyAtZero = meanAbsDiffShifted(seriesL, seriesR, 0);
    const copyAtHalf = meanAbsDiffShifted(seriesL, seriesR, halfCycleShift);
    if (Math.min(copyAtZero, copyAtHalf) < LITERAL_MATCH_TOL_RAD) {
      issues.push({
        clipId: clip.id,
        check: "symmetry",
        partId: pairId,
        message: `"${pairId}" carries the same rotation values as its counterpart (un-negated, ${copyAtZero <= copyAtHalf ? "same-instant" : "half-cycle-shifted"}) — copied, not mirrored.`,
      });
      continue;
    }

    // 3. Neither an exact match nor an exact copy (e.g. this rig's real
    //    forearms, whose mirror isn't perfectly numeric because a
    //    shared parent's own rotation contributes asymmetrically to
    //    each side) — fall back to correlation as a fuzzier shape test.
    const sameInstant = correlate(seriesL, seriesR);
    const halfCycle = correlateShifted(seriesL, seriesR, halfCycleShift);
    const candidates = [sameInstant, halfCycle].filter((c): c is number => c !== null);

    if (candidates.length === 0) {
      issues.push({
        clipId: clip.id,
        check: "symmetry",
        partId: pairId,
        message: `"${pairId}" can't be checked for mirroring — at least one side has no rotation variation in this clip.`,
      });
      continue;
    }
    const best = Math.min(...candidates);
    if (best > SYMMETRY_CORRELATION_MAX) {
      issues.push({
        clipId: clip.id,
        check: "symmetry",
        partId: pairId,
        message: `"${pairId}" correlate at ${sameInstant?.toFixed(2) ?? "n/a"} same-instant and ${halfCycle?.toFixed(2) ?? "n/a"} half-cycle-shifted (expected one well below ${SYMMETRY_CORRELATION_MAX}) — they read as duplicated, not mirrored, under either convention.`,
      });
    }
  }
  return issues;
}

/** Runs every check against every clip in `rig`. Pure and side-effect
 *  free — safe to call from a Node validate script, from a browser
 *  (the rig inspector, live, on every hot-reloaded edit), or from a
 *  unit test, with no renderer of any kind involved. */
export function lintRig(rig: LoadedRig, options?: { sampleCount?: number }): RigLintIssue[] {
  const sampleCount = options?.sampleCount ?? DEFAULT_SAMPLE_COUNT;
  const rootIndex = rig.parts.findIndex((part) => part.parentIndex === -1);
  const leaves = findLeafIndices(rig);
  const sides = new Map<number, -1 | 1>();
  for (const leaf of leaves) {
    const side = findSide(rig, leaf);
    if (side !== 0) sides.set(leaf, side);
  }
  const ground = computeGroundReference(rig, leaves);

  const issues: RigLintIssue[] = [];
  for (const clip of rig.clips.values()) {
    const samples = sampleClip(rig, clip, sampleCount);
    issues.push(...checkContinuity(rig, clip));
    if (rootIndex !== -1) issues.push(...checkMidlineCrossing(rig, clip, leaves, sides, rootIndex, samples));
    issues.push(...checkReachEnvelope(rig, clip, samples));
    if (clip.locomotion) issues.push(...checkGroundContact(rig, clip, ground, samples));
    issues.push(...checkSymmetry(rig, clip, samples));
  }
  return issues;
}
