// A minimal single-value tween driver for CloudSweep. Not GSAP: this
// component has to be ready on the very first click (PRD §8.2 / M3),
// so it stays dependency-free — requestAnimationFrame is all it needs.
// No React, no content imports.

export type Easing = (t: number) => number;

export const linear: Easing = (t) => t;
// Decelerates into the meet: fast start, eases off approaching 1.
export const easeOutExpo: Easing = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
// Accelerates out of the part: slow start, speeds up approaching 1.
export const easeInExpo: Easing = (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10));

export function wait(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Drives a single 0..1 `value` toward a target over time. Always
 * animates from wherever `value` currently sits — calling `animateTo`
 * again mid-flight continues from the live value rather than the
 * target's own start point, the same discipline as MorphBorders'
 * timeline-kill-and-restart (M2). There is deliberately no per-caller
 * ownership tracking here; that lives in CloudSweep, which is the only
 * thing that knows whether a given call has been superseded.
 */
export class ProgressTween {
  value: number;
  private raf: number | null = null;

  constructor(initial = 0) {
    this.value = initial;
  }

  animateTo(target: number, durationMs: number, easing: Easing, onUpdate: (value: number) => void): Promise<void> {
    this.cancel();
    if (durationMs <= 0 || this.value === target) {
      this.value = target;
      onUpdate(this.value);
      return Promise.resolve();
    }

    const from = this.value;
    const delta = target - from;
    const start = performance.now();

    return new Promise((resolve) => {
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / durationMs);
        this.value = from + delta * easing(t);
        onUpdate(this.value);
        if (t < 1) {
          this.raf = requestAnimationFrame(tick);
        } else {
          this.raf = null;
          resolve();
        }
      };
      this.raf = requestAnimationFrame(tick);
    });
  }

  /** Stops the in-flight animation wherever it currently is. The
   *  returned promise from `animateTo` is left permanently pending —
   *  by design: a superseded call's `await` on it simply never
   *  advances, which is what stops it from running its own later
   *  phases (see CloudSweep's ownership guard for the rest of that). */
  cancel(): void {
    if (this.raf !== null) {
      cancelAnimationFrame(this.raf);
      this.raf = null;
    }
  }
}
