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
  private readonly startTime = performance.now();
  private tween: gsap.core.Tween | null = null;
  private reducedMotion = false;
  private readonly tick = (): void => {
    const drift = this.reducedMotion
      ? { x: 0, y: 0, rotationDeg: 0 }
      : computeDrift((performance.now() - this.startTime) / 1000, this.noiseX, this.noiseY, this.noiseRot);

    // Planes are placed at local (0,0) — "scene centre" — so the
    // container itself has to sit at the stage's visual centre for that
    // to land in the middle of the canvas. beatTarget/drift are the
    // *additional* pan on top of this rest position, so scale and
    // rotation pivot naturally around scene centre rather than the
    // canvas's top-left corner. Reading the stage size fresh every tick
    // (a cheap property read, not a recomputation) rather than caching
    // it means a resize is correct on the very next frame with no
    // separate resize listener/plumbing needed.
    const stage = this.getStageSize();
    this.container.x = stage.width / 2 + this.beatTarget.x + drift.x;
    this.container.y = stage.height / 2 + this.beatTarget.y + drift.y;
    this.container.scale.set(this.beatTarget.scale);
    this.container.rotation = drift.rotationDeg * DEG_TO_RAD;
  };

  constructor(container: Container, ticker: CameraTicker, getStageSize: () => StageSize) {
    this.container = container;
    this.ticker = ticker;
    this.getStageSize = getStageSize;
    this.ticker.add(this.tick);
  }

  setReducedMotion(value: boolean): void {
    this.reducedMotion = value;
  }

  /** Moves to a beat's camera target. Reduced motion makes this an
   *  instant cut (duration 0) rather than skipping the move — the
   *  camera still has to land on the beat's framing. */
  animateTo(camera: SceneCamera, stage: StageSize): void {
    this.tween?.kill();
    const target = computeCameraTarget(camera, stage);
    const duration = this.reducedMotion ? 0 : camera.durationMs / 1000;
    this.tween = gsap.to(this.beatTarget, { ...target, duration, ease: camera.ease });
  }

  destroy(): void {
    this.tween?.kill();
    this.ticker.remove(this.tick);
  }
}
