import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { easeInExpo, easeOutExpo, linear, ProgressTween, wait } from "./sweepTween";

describe("easings", () => {
  it("linear is the identity function", () => {
    expect(linear(0)).toBe(0);
    expect(linear(0.42)).toBe(0.42);
    expect(linear(1)).toBe(1);
  });

  it("easeOutExpo starts fast and decelerates into 1 — front-loaded", () => {
    expect(easeOutExpo(0)).toBe(0);
    expect(easeOutExpo(1)).toBe(1);
    // more progress in the first half than the second — deceleration
    expect(easeOutExpo(0.2)).toBeGreaterThan(0.5);
  });

  it("easeInExpo starts slow and accelerates out of 0 — back-loaded", () => {
    expect(easeInExpo(0)).toBe(0);
    expect(easeInExpo(1)).toBe(1);
    expect(easeInExpo(0.8)).toBeLessThan(0.5);
  });
});

describe("ProgressTween", () => {
  // The vitest config runs in plain "node", which has no
  // requestAnimationFrame at all (not even a real one to fake) — same
  // gap as jsdom's missing SVG geometry APIs hit in M2. Stand in a
  // minimal setTimeout-backed rAF so fake timers can drive it
  // deterministically, rather than adding jsdom as a dependency for
  // one file.
  let nextHandle: number;
  let timeoutsByHandle: Map<number, ReturnType<typeof setTimeout>>;

  beforeEach(() => {
    vi.useFakeTimers();
    nextHandle = 1;
    timeoutsByHandle = new Map();
    // performance.now() isn't tied to vitest's fake Date/setTimeout clock
    // by default — route it through Date.now() so elapsed-time math
    // inside ProgressTween actually advances when timers do.
    vi.stubGlobal("performance", { now: () => Date.now() });
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      const handle = nextHandle++;
      const timeoutId = setTimeout(() => {
        timeoutsByHandle.delete(handle);
        callback(performance.now());
      }, 16);
      timeoutsByHandle.set(handle, timeoutId);
      return handle;
    });
    vi.stubGlobal("cancelAnimationFrame", (handle: number) => {
      const timeoutId = timeoutsByHandle.get(handle);
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
        timeoutsByHandle.delete(handle);
      }
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("animates from 0 to a target over the given duration", async () => {
    const tween = new ProgressTween(0);
    const updates: number[] = [];
    const done = tween.animateTo(1, 100, linear, (v) => updates.push(v));

    // The rAF stand-in steps at a fixed 16ms, so the completing tick
    // (elapsed >= 100ms) lands at 112ms, not exactly 100 — advance past
    // that boundary rather than exactly to the duration.
    await vi.advanceTimersByTimeAsync(120);
    await done;

    expect(tween.value).toBe(1);
    expect(updates[updates.length - 1]).toBe(1);
    expect(updates.length).toBeGreaterThan(1);
  });

  it("resolves immediately when duration is 0", async () => {
    const tween = new ProgressTween(0.3);
    const updates: number[] = [];
    await tween.animateTo(0.9, 0, linear, (v) => updates.push(v));
    expect(tween.value).toBe(0.9);
    expect(updates).toEqual([0.9]);
  });

  it("continues from the current live value when interrupted, not from the target's own start", async () => {
    const tween = new ProgressTween(0);
    const firstUpdates: number[] = [];
    let firstResolved = false;
    // Start a slow tween toward 1 and let it run partway.
    void tween.animateTo(1, 1000, linear, (v) => firstUpdates.push(v)).then(() => {
      firstResolved = true;
    });
    await vi.advanceTimersByTimeAsync(300);
    const midFlightValue = tween.value;
    expect(midFlightValue).toBeGreaterThan(0);
    expect(midFlightValue).toBeLessThan(1);

    // Interrupt with a new tween toward 0 — same discipline as
    // MorphBorders' timeline-kill-and-restart (M2): it must start from
    // wherever the first tween had actually reached, not from 1.
    const secondUpdates: number[] = [];
    const done = tween.animateTo(0, 200, linear, (v) => secondUpdates.push(v));
    // Synchronously, before the new tween's first frame has fired, the
    // live value is untouched — animateTo doesn't snap it back to the
    // target's own start point.
    expect(tween.value).toBeCloseTo(midFlightValue, 5);

    await vi.advanceTimersByTimeAsync(16);
    expect(secondUpdates[0]).toBeCloseTo(midFlightValue, 1);

    await vi.advanceTimersByTimeAsync(200);
    await done;
    expect(tween.value).toBe(0);

    // The interrupted first tween's promise must never resolve — it
    // stays permanently pending rather than firing a stray onComplete
    // after being superseded. Advancing well past its original 1000ms
    // duration is the point: if it were still ticking independently,
    // it would have resolved by now.
    await vi.advanceTimersByTimeAsync(1000);
    expect(firstResolved).toBe(false);
  });

  it("cancel() stops the animation wherever it currently is", async () => {
    const tween = new ProgressTween(0);
    const updates: number[] = [];
    void tween.animateTo(1, 1000, linear, (v) => updates.push(v));
    await vi.advanceTimersByTimeAsync(200);
    const stoppedAt = tween.value;
    tween.cancel();

    await vi.advanceTimersByTimeAsync(500);
    expect(tween.value).toBe(stoppedAt);
  });
});

describe("wait", () => {
  it("resolves after the given delay", async () => {
    vi.useFakeTimers();
    let resolved = false;
    void wait(50).then(() => {
      resolved = true;
    });
    await vi.advanceTimersByTimeAsync(50);
    expect(resolved).toBe(true);
    vi.useRealTimers();
  });

  it("resolves synchronously for a zero or negative delay", async () => {
    const start = Date.now();
    await wait(0);
    await wait(-10);
    expect(Date.now() - start).toBeLessThan(20);
  });
});
