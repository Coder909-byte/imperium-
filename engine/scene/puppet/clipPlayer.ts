// Pure clip evaluation: given a loaded clip and a time, what's each
// part's local rotation right now? Deliberately NOT a live GSAP
// Timeline per instance — Camera.ts already drew this line for
// per-frame-continuous effects (handheld drift is hand-rolled noise,
// not a GSAP tween, specifically because it runs every frame for the
// life of the scene). Forty PuppetActors times ~12 parts, ticked every
// frame, is the same shape of cost at higher multiplicity, so playback
// reuses GSAP only for its ease *math* (gsap.parseEase, resolved once
// by rigLoader.ts) — no Tween/Timeline object exists per instance.
import type { LoadedClip, LoadedRig } from "./types";

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Where in the clip's timeline `elapsedMs` (real elapsed time, already
 *  including the instance's phase offset) lands: looped modulo duration,
 *  or clamped to the end — a non-looping clip holds its final pose
 *  (PRD: "fall"/"thrust"/"raise" all end in a held pose, not a snap-back
 *  to rest) rather than needing a caller to stop ticking it manually. */
export function resolveClipTimeMs(clip: LoadedClip, elapsedMs: number): number {
  if (clip.durationMs <= 0) return 0;
  if (clip.loop) {
    const m = elapsedMs % clip.durationMs;
    return m < 0 ? m + clip.durationMs : m;
  }
  return Math.min(Math.max(elapsedMs, 0), clip.durationMs);
}

/**
 * Writes each part's current LOCAL pose — rotation (radians) into
 * `outRot`, translation (pixels, delta from rest) into `outDx`/`outDy`
 * — parallel to `rig.parts`. Parts with no track in this clip keep
 * whatever the `out` buffers already hold — callers reset them to rest
 * once when the active clip changes (see PuppetActor), not every frame,
 * since a part untracked by the new clip should fall back to rest, but
 * one still tracked has no need to be touched twice in the same tick.
 *
 * rot and dx/dy share one segment search and one eased progress value
 * (ADR 007: "interpolated like rot" means riding the same curve, not a
 * second independent one) — computed together in one pass rather than
 * two, since this runs for every part of every actor every frame.
 */
export function evaluateClipPose(rig: LoadedRig, clip: LoadedClip, elapsedMs: number, outRot: Float32Array, outDx: Float32Array, outDy: Float32Array): void {
  const timeMs = resolveClipTimeMs(clip, elapsedMs);
  const fraction = clip.durationMs > 0 ? timeMs / clip.durationMs : 0;

  for (let i = 0; i < rig.parts.length; i++) {
    const track = clip.trackByPartIndex[i];
    if (!track) continue;
    const keyframes = track.keyframes;
    const restRotationRad = rig.parts[i].restRotationRad;

    if (fraction <= keyframes[0].t) {
      const first = keyframes[0];
      outRot[i] = restRotationRad + first.rotRad;
      outDx[i] = first.dx;
      outDy[i] = first.dy;
      continue;
    }
    const last = keyframes[keyframes.length - 1];
    if (fraction >= last.t) {
      outRot[i] = restRotationRad + last.rotRad;
      outDx[i] = last.dx;
      outDy[i] = last.dy;
      continue;
    }

    // Keyframes are validated (content/schema.ts) to start at t:0, end
    // at t:1, and increase strictly — a linear scan is fine for the
    // handful of keyframes a hand-authored clip has.
    let segIndex = 0;
    while (segIndex < keyframes.length - 1 && keyframes[segIndex + 1].t < fraction) segIndex++;
    const from = keyframes[segIndex];
    const to = keyframes[segIndex + 1];
    const span = to.t - from.t;
    const segProgress = span > 0 ? (fraction - from.t) / span : 1;
    const eased = to.easeFn(segProgress);
    outRot[i] = restRotationRad + lerp(from.rotRad, to.rotRad, eased);
    outDx[i] = lerp(from.dx, to.dx, eased);
    outDy[i] = lerp(from.dy, to.dy, eased);
  }
}

/** Resets the pose buffers to every part's rest pose — rotation to
 *  restRotationRad, translation delta to 0 — call once when an actor's
 *  active clip changes, before per-frame evaluation resumes, so a part
 *  the new clip doesn't track doesn't keep the old clip's pose. */
export function resetToRestPose(rig: LoadedRig, outRot: Float32Array, outDx: Float32Array, outDy: Float32Array): void {
  for (let i = 0; i < rig.parts.length; i++) {
    outRot[i] = rig.parts[i].restRotationRad;
    outDx[i] = 0;
    outDy[i] = 0;
  }
}
