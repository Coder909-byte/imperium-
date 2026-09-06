// Device-tier degradation (PRD §11, M5): "4 planes, halved particles, no
// godrays or chromatic aberration" on low-end. Two tiers only — PRD
// defines exactly one degraded state, not a gradient of them.
//
// A static heuristic alone is a starting guess, not a verdict: core
// count and device memory say nothing about thermal throttling, what
// else is running, or whether the browser is actually keeping up right
// now — the common real failure is a phone that starts fine and cooks
// after 90 seconds, which no signal read once at mount can catch. So
// this is two layers: `detectStartingTier` picks a first guess from free
// navigator signals (conservative — unknown/absent signals default to
// low, so a slow device never has to stutter for two seconds before
// self-correcting), and `DeviceTierController` then watches real frame
// time and downgrades — never upgrades, since oscillating between tiers
// reads far worse than sitting one tier low — if the rolling median
// frame time is sustained above budget. Every downgrade (and the
// starting-tier pick) is console-logged in dev with its reason, so it's
// possible to tell a heuristic call from a runtime one.
//
// Pure logic (detectStartingTier, computeMedian, recordFrameSample) is
// unit-tested directly; the stateful ticker-driven controller is
// verified in the browser (scene-lab, e2e) — same split Camera.ts
// already uses between computeDrift/computeCameraTarget and the class
// that drives them every frame.

export type DeviceTier = "low" | "high";

export interface DeviceTierSnapshot {
  tier: DeviceTier;
  /** True when a manual override (scene-lab) pins the tier — disables the runtime monitor entirely. */
  pinned: boolean;
}

// --- Starting-tier heuristic -------------------------------------------

export interface DeviceTierSignals {
  hardwareConcurrency?: number;
  deviceMemoryGb?: number;
}

const MIN_HIGH_TIER_CORES = 4;
const MIN_HIGH_TIER_MEMORY_GB = 4;

/** Pure. Conservative on purpose: any missing signal resolves to "low" — a
 *  real low-end device should never get the full chain because a signal
 *  happened to be unsupported in its browser. */
export function detectStartingTier(signals: DeviceTierSignals): DeviceTier {
  if (signals.hardwareConcurrency === undefined) return "low";
  if (signals.hardwareConcurrency < MIN_HIGH_TIER_CORES) return "low";
  if (signals.deviceMemoryGb !== undefined && signals.deviceMemoryGb < MIN_HIGH_TIER_MEMORY_GB) return "low";
  return "high";
}

// navigator.deviceMemory (Device Memory API) isn't in lib.dom's Navigator
// type — Chrome-only, unsupported browsers just don't have the field.
interface NavigatorWithDeviceMemory extends Navigator {
  deviceMemory?: number;
}

export function readNavigatorSignals(nav: Navigator | undefined = typeof navigator === "undefined" ? undefined : navigator): DeviceTierSignals {
  if (!nav) return {};
  return {
    hardwareConcurrency: nav.hardwareConcurrency,
    deviceMemoryGb: (nav as NavigatorWithDeviceMemory).deviceMemory,
  };
}

// --- Runtime frame-time monitor -----------------------------------------

export const FRAME_MONITOR = {
  /** Rolling window of recent frame samples considered for the median. */
  WINDOW_MS: 2000,
  /** Scene frame budget (PRD §11) plus headroom before it counts as "bad". */
  THRESHOLD_MS: 20,
  /** How long the median has to stay over threshold before downgrading. */
  SUSTAINED_MS: 2000,
} as const;

export interface FrameSample {
  t: number;
  ms: number;
}

export interface FrameMonitorState {
  samples: readonly FrameSample[];
  /** Timestamp the median first crossed the threshold, or null while under it. */
  badSince: number | null;
}

export const INITIAL_FRAME_MONITOR_STATE: FrameMonitorState = { samples: [], badSince: null };

/** Pure. Odd-length: the middle value. Even-length: average of the two middles. */
export function computeMedian(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export interface FrameMonitorResult {
  state: FrameMonitorState;
  shouldDowngrade: boolean;
  medianMs: number;
}

/** Pure. Feed it one frame sample at a time; it prunes the window,
 *  recomputes the median, and reports whether a sustained breach just
 *  completed. Callers should stop calling this once tier is already
 *  "low" — there's nothing further to degrade to. */
export function recordFrameSample(state: FrameMonitorState, now: number, frameMs: number): FrameMonitorResult {
  const samples = [...state.samples, { t: now, ms: frameMs }].filter((sample) => now - sample.t <= FRAME_MONITOR.WINDOW_MS);
  const medianMs = computeMedian(samples.map((sample) => sample.ms));
  const isBad = medianMs > FRAME_MONITOR.THRESHOLD_MS;
  const badSince = isBad ? (state.badSince ?? now) : null;
  const shouldDowngrade = badSince !== null && now - badSince >= FRAME_MONITOR.SUSTAINED_MS;
  return { state: { samples, badSince: shouldDowngrade ? null : badSince }, shouldDowngrade, medianMs };
}

// --- Stateful controller -------------------------------------------------

export interface FrameTicker {
  add: (fn: () => void) => unknown;
  remove: (fn: () => void) => unknown;
}

function isDevEnvironment(): boolean {
  return process.env.NODE_ENV !== "production";
}

export interface DeviceTierControllerOptions {
  /** Scene-lab's manual override — pins the tier and disables the runtime monitor entirely. */
  forcedTier?: DeviceTier;
  /** Testing seam — defaults to reading real navigator signals. */
  signals?: DeviceTierSignals;
}

/**
 * One instance per mounted scene. Ticks on the same Pixi ticker Camera
 * does, computing its own frame deltas from performance.now() (matching
 * Camera.ts's CameraTicker — no dependency on Pixi's Ticker type).
 */
export class DeviceTierController {
  private snapshot: DeviceTierSnapshot;
  private readonly listeners = new Set<() => void>();
  private monitorState: FrameMonitorState = INITIAL_FRAME_MONITOR_STATE;
  private lastFrameTime: number | null = null;

  private readonly tick = (): void => {
    const now = performance.now();
    const previous = this.lastFrameTime;
    this.lastFrameTime = now;
    if (previous === null || this.snapshot.pinned || this.snapshot.tier === "low") return;

    const result = recordFrameSample(this.monitorState, now, now - previous);
    this.monitorState = result.state;
    if (result.shouldDowngrade) this.downgrade(result.medianMs);
  };

  constructor(private readonly ticker: FrameTicker, options: DeviceTierControllerOptions = {}) {
    const pinned = options.forcedTier !== undefined;
    const startingTier = options.forcedTier ?? detectStartingTier(options.signals ?? readNavigatorSignals());
    this.snapshot = { tier: startingTier, pinned };

    if (isDevEnvironment()) {
      const reason = pinned ? "manual override, pinned" : "heuristic";
      console.log(`[deviceTier] starting tier: ${startingTier} (${reason})`);
    }

    this.ticker.add(this.tick);
  }

  getSnapshot = (): DeviceTierSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private downgrade(medianMs: number): void {
    this.snapshot = { ...this.snapshot, tier: "low" };
    if (isDevEnvironment()) {
      console.log(
        `[deviceTier] downgrading high -> low (reason: runtime, median frame time ${medianMs.toFixed(1)}ms ` +
          `sustained above ${FRAME_MONITOR.THRESHOLD_MS}ms for ${FRAME_MONITOR.SUSTAINED_MS}ms)`,
      );
    }
    for (const listener of this.listeners) listener();
  }

  destroy(): void {
    this.ticker.remove(this.tick);
    this.listeners.clear();
  }
}
