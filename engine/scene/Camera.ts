// GSAP timeline on the root scene container's x/y/scale, plus permanent
// handheld drift (PRD §4/§10, M4). The two are layered rather than GSAP
// owning the container directly: `beatTarget` is a plain object GSAP
// tweens, and the ticker callback below adds the current drift offset on
// top of it every frame, writing the *combined* result to the container
// exactly once. That's what keeps drift running continuously and
// independently of beat transitions (it never depends on whether a
// tween is mid-flight) while still only ever touching container
// transform properties — Pixi's compositor-cheap path, same discipline
// CLAUDE.md already applies to the atlas's DOM transforms.
import { gsap } from "gsap";
import type { Container } from "pixi.js";
import { createNoise1D } from "./noise";
import type { SceneCamera } from "./types";

// Tuned by eye against the placeholder region, not measured — PRD §4
// gives 0.4Hz / 3–6px / 0.2° as estimates, not a spec to hit exactly.
// Expect these to move once real painted planes exist and the drift is
// judged against actual art rather than flat placeholder rectangles.
export const HANDHELD_DRIFT = {
  FREQUENCY_HZ: 0.4,
  TRANSLATE_X_PX: 5,
  TRANSLATE_Y_PX: 4,
  ROTATION_DEG: 0.2,
} as const;

// Screen shake (PRD §10/M5, fx: 'shake') — a beat-scoped effect layered
// on *top* of handheld drift the same way drift is layered on top of the
// beat tween: additive, never a replacement. Higher frequency and larger
// amplitude than drift so it reads as a distinct effect rather than
// "stronger drift". `intensity` (below) ramps 0->1/1->0 over FADE_MS
// rather than snapping, so a beat boundary that turns shake on or off
// doesn't pop. Also eyeballed, not measured — same honesty as
// HANDHELD_DRIFT above.
export const SCREEN_SHAKE = {
  FREQUENCY_HZ: 5,
  TRANSLATE_X_PX: 11,
  TRANSLATE_Y_PX: 9,
  ROTATION_DEG: 0.5,
  FADE_MS: 300,
} as const;

// Fractional camera.x/y (SceneCamera) are read as this fraction of the
// stage's *smaller* dimension — keeps a 0.3 pan visually similar in a
// wide or tall viewport, rather than stretching with aspect ratio.
const PAN_RANGE_FACTOR = 0.35;

export interface StageSize {
  width: number;
  height: number;
}

export interface CameraTarget {
  x: number;
  y: number;
  scale: number;
}

/** Pure — converts an authored beat camera into a pixel/scale target for
 *  the current stage size. Exported for unit testing without Pixi. */
export function computeCameraTarget(camera: SceneCamera, stage: StageSize): CameraTarget {
  const range = Math.min(stage.width, stage.height) * PAN_RANGE_FACTOR;
  return { x: camera.x * range, y: camera.y * range, scale: camera.scale };
}

export interface Drift {
  x: number;
  y: number;
  rotationDeg: number;
}

/** Pure — samples three decorrelated noise channels at `tSeconds`.
 *  Exported for unit testing without a running ticker. */
export function computeDrift(
  tSeconds: number,
  noiseX: (x: number) => number,
  noiseY: (x: number) => number,
  noiseRot: (x: number) => number,
): Drift {
  const phase = tSeconds * HANDHELD_DRIFT.FREQUENCY_HZ;
  return {
    x: noiseX(phase) * HANDHELD_DRIFT.TRANSLATE_X_PX,
    y: noiseY(phase) * HANDHELD_DRIFT.TRANSLATE_Y_PX,
    rotationDeg: noiseRot(phase) * HANDHELD_DRIFT.ROTATION_DEG,
  };
}

/** Pure — same shape as computeDrift, sampling separate noise channels
 *  at SCREEN_SHAKE's higher frequency/amplitude. Exported for unit
 *  testing without a running ticker. The raw shake magnitude only —
 *  Camera scales it by the current fade-in/out intensity itself. */
export function computeShake(
  tSeconds: number,
  noiseX: (x: number) => number,
  noiseY: (x: number) => number,
  noiseRot: (x: number) => number,
): Drift {
  const phase = tSeconds * SCREEN_SHAKE.FREQUENCY_HZ;
  return {
    x: noiseX(phase) * SCREEN_SHAKE.TRANSLATE_X_PX,
    y: noiseY(phase) * SCREEN_SHAKE.TRANSLATE_Y_PX,
    rotationDeg: noiseRot(phase) * SCREEN_SHAKE.ROTATION_DEG,
  };
}

const DEG_TO_RAD = Math.PI / 180;

/**
 * Owns the root scene container's transform. One instance per mounted
 * scene; `destroy()` removes its ticker callback and kills its tween —
 * both required for a leak-free unmount (an un-removed ticker callback
 * is exactly the kind of thing that would otherwise keep running,
 * forever, past every subsequent atlas<->scene round trip).
 */
export interface CameraTicker {
  add: (fn: () => void) => unknown;
  remove: (fn: () => void) => unknown;
}

export class Camera {
  private readonly container: Container;
  private readonly ticker: CameraTicker;
  private readonly getStageSize: () => StageSize;
  private readonly beatTarget: CameraTarget = { x: 0, y: 0, scale: 1 };
  private readonly noiseX = createNoise1D(11);
  private readonly noiseY = createNoise1D(29);
  private readonly noiseRot = createNoise1D(53);
  // Separate seeds so shake decorrelates from drift rather than reading
  // as "drift, but bigger" whenever both are active on the same beat.
  private readonly shakeNoiseX = createNoise1D(151);
  private readonly shakeNoiseY = createNoise1D(173);
  private readonly shakeNoiseRot = createNoise1D(191);
  private readonly shakeState = { intensity: 0 };
  private shakeTween: gsap.core.Tween | null = null;
  private readonly startTime = performance.now();
  private tween: gsap.core.Tween | null = null;
  private reducedMotion = false;
  private readonly tick = (): void => {
    const tSeconds = (performance.now() - this.startTime) / 1000;
    const drift = this.reducedMotion
      ? { x: 0, y: 0, rotationDeg: 0 }
      : computeDrift(tSeconds, this.noiseX, this.noiseY, this.noiseRot);

    // Additive with drift, scaled by the current fade intensity — never
    // replaces drift, per PRD's "screen shake composes with handheld
    // drift" requirement. reducedMotion zeroes it the same way it zeroes
    // drift, regardless of shakeState.intensity (setReducedMotion also
    // snaps intensity to 0, but this guard is what actually matters —
    // it can't render even mid-fade).
    const shakeRaw =
      this.reducedMotion || this.shakeState.intensity === 0
        ? { x: 0, y: 0, rotationDeg: 0 }
        : computeShake(tSeconds, this.shakeNoiseX, this.shakeNoiseY, this.shakeNoiseRot);
    const shake = {
      x: shakeRaw.x * this.shakeState.intensity,
      y: shakeRaw.y * this.shakeState.intensity,
      rotationDeg: shakeRaw.rotationDeg * this.shakeState.intensity,
    };

    // Planes are placed at local (0,0) — "scene centre" — so the
    // container itself has to sit at the stage's visual centre for that
    // to land in the middle of the canvas. beatTarget/drift/shake are
    // the *additional* pan on top of this rest position, so scale and
    // rotation pivot naturally around scene centre rather than the
    // canvas's top-left corner. Reading the stage size fresh every tick
    // (a cheap property read, not a recomputation) rather than caching
    // it means a resize is correct on the very next frame with no
    // separate resize listener/plumbing needed.
    const stage = this.getStageSize();
    this.container.x = stage.width / 2 + this.beatTarget.x + drift.x + shake.x;
    this.container.y = stage.height / 2 + this.beatTarget.y + drift.y + shake.y;
    this.container.scale.set(this.beatTarget.scale);
    this.container.rotation = (drift.rotationDeg + shake.rotationDeg) * DEG_TO_RAD;
  };

  constructor(container: Container, ticker: CameraTicker, getStageSize: () => StageSize) {
    this.container = container;
    this.ticker = ticker;
    this.getStageSize = getStageSize;
    this.ticker.add(this.tick);
  }

  setReducedMotion(value: boolean): void {
    this.reducedMotion = value;
    if (value) {
      // No shake at all under reduced motion (PRD §12), not just a
      // suppressed render — kill any inflight fade so it can't resume
      // partway once reduced motion turns back off mid-tween.
      this.shakeTween?.kill();
      this.shakeState.intensity = 0;
    }
  }

  /** Moves to a beat's camera target. Reduced motion makes this an
   *  instant cut (duration 0) rather than skipping the move — the
   *  camera still has to land on the beat's framing. */
  animateTo(camera: SceneCamera, stage: StageSize, options: { shakeActive?: boolean } = {}): void {
    this.tween?.kill();
    const target = computeCameraTarget(camera, stage);
    const duration = this.reducedMotion ? 0 : camera.durationMs / 1000;
    this.tween = gsap.to(this.beatTarget, { ...target, duration, ease: camera.ease });
    this.setShakeActive(options.shakeActive ?? false);
  }

  /** Fades shake's intensity in or out rather than snapping it, so a
   *  beat boundary that turns 'shake' fx on or off doesn't pop. A no-op
   *  under reduced motion — setReducedMotion already holds intensity at 0. */
  private setShakeActive(active: boolean): void {
    if (this.reducedMotion) return;
    this.shakeTween?.kill();
    this.shakeTween = gsap.to(this.shakeState, { intensity: active ? 1 : 0, duration: SCREEN_SHAKE.FADE_MS / 1000 });
  }

  destroy(): void {
    this.tween?.kill();
    this.shakeTween?.kill();
    this.ticker.remove(this.tick);
  }
}
