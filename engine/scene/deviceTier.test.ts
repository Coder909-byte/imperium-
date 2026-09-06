import { describe, expect, it } from "vitest";
import {
  computeMedian,
  detectStartingTier,
  FRAME_MONITOR,
  INITIAL_FRAME_MONITOR_STATE,
  recordFrameSample,
  type FrameMonitorState,
} from "./deviceTier";

describe("detectStartingTier", () => {
  it("defaults to low when hardwareConcurrency is unavailable — conservative on missing signals", () => {
    expect(detectStartingTier({})).toBe("low");
  });

  it("is low below the core-count floor", () => {
    expect(detectStartingTier({ hardwareConcurrency: 2 })).toBe("low");
  });

  it("is high at/above the core floor when memory is unknown", () => {
    expect(detectStartingTier({ hardwareConcurrency: 8 })).toBe("high");
  });

  it("is low when memory is known and below the floor, even with enough cores", () => {
    expect(detectStartingTier({ hardwareConcurrency: 8, deviceMemoryGb: 2 })).toBe("low");
  });

  it("is high when both signals clear their floors", () => {
    expect(detectStartingTier({ hardwareConcurrency: 8, deviceMemoryGb: 8 })).toBe("high");
  });
});

describe("computeMedian", () => {
  it("is 0 for an empty list", () => {
    expect(computeMedian([])).toBe(0);
  });

  it("picks the middle value for an odd-length list, order-independent", () => {
    expect(computeMedian([5, 1, 3])).toBe(3);
  });

  it("averages the two middle values for an even-length list", () => {
    expect(computeMedian([10, 20, 30, 40])).toBe(25);
  });
});

describe("recordFrameSample", () => {
  const GOOD_MS = 12; // well under FRAME_MONITOR.THRESHOLD_MS
  const BAD_MS = 30; // well over it

  // Mirrors how DeviceTierController actually drives this: it stops
  // feeding samples the instant shouldDowngrade fires (the real tier
  // flips to "low" and the caller stops calling in). Feeding samples
  // past that point — which none of these tests do, but a naive harness
  // could — would let badSince reset and require a second full
  // SUSTAINED_MS before firing again; that's a realistic property of the
  // reducer, not a bug, so the harness matches real usage instead of
  // masking it.
  function feed(state: FrameMonitorState, frames: { t: number; ms: number }[]) {
    let current = state;
    let last = { state, shouldDowngrade: false, medianMs: 0 };
    for (const frame of frames) {
      last = recordFrameSample(current, frame.t, frame.ms);
      current = last.state;
      if (last.shouldDowngrade) break;
    }
    return last;
  }

  it("never downgrades on consistently good frame times", () => {
    const frames = Array.from({ length: 20 }, (_, i) => ({ t: i * 100, ms: GOOD_MS }));
    const result = feed(INITIAL_FRAME_MONITOR_STATE, frames);
    expect(result.shouldDowngrade).toBe(false);
    expect(result.medianMs).toBeLessThanOrEqual(FRAME_MONITOR.THRESHOLD_MS);
  });

  it("does not downgrade on a brief spike that doesn't sustain", () => {
    const frames = [
      { t: 0, ms: GOOD_MS },
      { t: 100, ms: BAD_MS },
      { t: 200, ms: GOOD_MS },
      { t: 300, ms: GOOD_MS },
    ];
    const result = feed(INITIAL_FRAME_MONITOR_STATE, frames);
    expect(result.shouldDowngrade).toBe(false);
  });

  it("downgrades once the median frame time is sustained above threshold for SUSTAINED_MS", () => {
    // Bad frames every 16ms in real time, spanning past WINDOW_MS + SUSTAINED_MS.
    const frames: { t: number; ms: number }[] = [];
    const totalMs = FRAME_MONITOR.WINDOW_MS + FRAME_MONITOR.SUSTAINED_MS + 500;
    for (let t = 0; t <= totalMs; t += 16) frames.push({ t, ms: BAD_MS });
    const result = feed(INITIAL_FRAME_MONITOR_STATE, frames);
    expect(result.shouldDowngrade).toBe(true);
    expect(result.medianMs).toBeGreaterThan(FRAME_MONITOR.THRESHOLD_MS);
  });

  it("resets badSince if frame times recover before the sustained window elapses", () => {
    const frames: { t: number; ms: number }[] = [];
    // A brief spike — well under the median-flip time, let alone SUSTAINED_MS...
    const spikeMs = 200;
    for (let t = 0; t < spikeMs; t += 16) frames.push({ t, ms: BAD_MS });
    // ...then recovers for well over a full window, so the spike's samples
    // are both outnumbered (median flips good almost immediately — good
    // samples overtake the ~12 bad ones within a few frames) and, later,
    // fully aged out of the rolling window.
    for (let t = spikeMs; t < spikeMs + FRAME_MONITOR.WINDOW_MS + 500; t += 16) frames.push({ t, ms: GOOD_MS });
    const result = feed(INITIAL_FRAME_MONITOR_STATE, frames);
    expect(result.shouldDowngrade).toBe(false);
    expect(result.state.badSince).toBeNull();
  });

  it("prunes samples older than the rolling window rather than accumulating forever", () => {
    const frames = Array.from({ length: 500 }, (_, i) => ({ t: i * 16, ms: GOOD_MS }));
    const result = feed(INITIAL_FRAME_MONITOR_STATE, frames);
    expect(result.state.samples.every((s) => frames[frames.length - 1].t - s.t <= FRAME_MONITOR.WINDOW_MS)).toBe(true);
  });
});
