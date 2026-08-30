// Beat sequencing (PRD §8.3, M4). Owns only *which beat is current* and
// *autoplay on/off* — applying that state to the camera and layer
// visibility is ScenePlayer's job (a `useEffect` reacting to the index),
// kept separate so this class needs no Pixi/GSAP/DOM to test.
//
// Shaped as a subscribe/getSnapshot store on purpose, matching
// transitionStore.ts and CloudSweep's reducedMotion — the pairing
// useSyncExternalStore expects, without pulling in Zustand for
// something this small and locally owned (one instance per mounted
// scene, not cross-tree state).
import { computeAutoplayDwellMs } from "./dwell";
import type { SceneBeat } from "./types";

export interface BeatDirectorSnapshot {
  index: number;
  autoplay: boolean;
}

export class BeatDirector {
  private readonly beats: readonly SceneBeat[];
  private snapshot: BeatDirectorSnapshot;
  private readonly listeners = new Set<() => void>();
  private dwellTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(beats: readonly SceneBeat[]) {
    if (beats.length === 0) throw new Error("BeatDirector requires at least one beat");
    this.beats = beats;
    this.snapshot = { index: 0, autoplay: false };
  }

  getSnapshot = (): BeatDirectorSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  next(): void {
    if (this.snapshot.index >= this.beats.length - 1) return;
    this.applySnapshot({ index: this.snapshot.index + 1 });
  }

  previous(): void {
    if (this.snapshot.index <= 0) return;
    this.applySnapshot({ index: this.snapshot.index - 1 });
  }

  jumpTo(index: number): void {
    if (index < 0 || index >= this.beats.length || index === this.snapshot.index) return;
    this.applySnapshot({ index });
  }

  setAutoplay(autoplay: boolean): void {
    if (autoplay === this.snapshot.autoplay) return;
    this.applySnapshot({ autoplay });
  }

  /**
   * Cancels any pending dwell timer and drops all listeners. Deliberately
   * *not* a one-way "poisoned" flag that disables next()/previous()/etc.
   * forever after — ScenePlayer's owning component is created once via
   * `useState` so it survives React StrictMode's dev-only
   * mount->cleanup->mount, and that cleanup calls this same destroy()
   * on the very instance the following remount keeps using. An earlier
   * version gated every method on a permanent `destroyed` flag set here,
   * which left a BeatDirector that looked mounted but silently ignored
   * every next()/previous() call for the rest of its life — caught via
   * a real Playwright click that produced no state change, not guessed.
   * The timer clear is what actually prevents a leak (a stray dwell
   * firing into a beat that no longer has a live ScenePlayer around
   * it); nothing else here holds a resource worth protecting twice.
   */
  destroy(): void {
    this.clearDwellTimer();
    this.listeners.clear();
  }

  private applySnapshot(patch: Partial<BeatDirectorSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    this.clearDwellTimer();
    if (this.snapshot.autoplay) this.armDwellTimer();
    for (const listener of this.listeners) listener();
  }

  private armDwellTimer(): void {
    const beat = this.beats[this.snapshot.index];
    const dwellMs = computeAutoplayDwellMs(beat.body);
    this.dwellTimer = setTimeout(() => {
      // At the last beat there's nowhere left to advance to — stop
      // autoplay instead of silently doing nothing forever.
      if (this.snapshot.index >= this.beats.length - 1) {
        this.applySnapshot({ autoplay: false });
      } else {
        this.next();
      }
    }, dwellMs);
  }

  private clearDwellTimer(): void {
    if (this.dwellTimer !== null) {
      clearTimeout(this.dwellTimer);
      this.dwellTimer = null;
    }
  }
}
