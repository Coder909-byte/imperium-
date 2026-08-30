import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BeatDirector } from "./BeatDirector";
import type { SceneBeat } from "./types";

function makeBeat(id: string, wordCount: number): SceneBeat {
  return {
    id,
    year: "1 AD",
    headline: id,
    body: Array.from({ length: wordCount }, () => "word").join(" "),
    visibleLayers: [],
    camera: { x: 0, y: 0, scale: 1, durationMs: 1000, ease: "power2.inOut" },
  };
}

describe("BeatDirector", () => {
  it("starts at index 0, autoplay off", () => {
    const director = new BeatDirector([makeBeat("a", 10), makeBeat("b", 10)]);
    expect(director.getSnapshot()).toEqual({ index: 0, autoplay: false });
  });

  it("next/previous move the index and notify subscribers", () => {
    const director = new BeatDirector([makeBeat("a", 10), makeBeat("b", 10), makeBeat("c", 10)]);
    const listener = vi.fn();
    director.subscribe(listener);

    director.next();
    expect(director.getSnapshot().index).toBe(1);
    expect(listener).toHaveBeenCalledTimes(1);

    director.previous();
    expect(director.getSnapshot().index).toBe(0);
  });

  it("clamps at both ends instead of wrapping", () => {
    const director = new BeatDirector([makeBeat("a", 10), makeBeat("b", 10)]);
    director.previous(); // already at 0
    expect(director.getSnapshot().index).toBe(0);

    director.next();
    director.next(); // already at last
    expect(director.getSnapshot().index).toBe(1);
  });

  it("jumpTo goes straight to an index, ignores out-of-range", () => {
    const director = new BeatDirector([makeBeat("a", 10), makeBeat("b", 10), makeBeat("c", 10)]);
    director.jumpTo(2);
    expect(director.getSnapshot().index).toBe(2);
    director.jumpTo(99);
    expect(director.getSnapshot().index).toBe(2);
    director.jumpTo(-1);
    expect(director.getSnapshot().index).toBe(2);
  });

  it("getSnapshot returns a stable reference when nothing changed (useSyncExternalStore contract)", () => {
    const director = new BeatDirector([makeBeat("a", 10)]);
    expect(director.getSnapshot()).toBe(director.getSnapshot());
  });

  it("unsubscribe stops further notifications", () => {
    const director = new BeatDirector([makeBeat("a", 10), makeBeat("b", 10)]);
    const listener = vi.fn();
    const unsubscribe = director.subscribe(listener);
    unsubscribe();
    director.next();
    expect(listener).not.toHaveBeenCalled();
  });
});

describe("BeatDirector autoplay dwell", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("advances to the next beat after the computed dwell, using the *current* beat's body", () => {
    // 10 words -> floors at the 7000ms minimum dwell (dwell.test.ts covers the formula itself).
    const director = new BeatDirector([makeBeat("a", 10), makeBeat("b", 10)]);
    director.setAutoplay(true);

    vi.advanceTimersByTime(6999);
    expect(director.getSnapshot().index).toBe(0);

    vi.advanceTimersByTime(2);
    expect(director.getSnapshot().index).toBe(1);
  });

  it("turns autoplay off at the last beat instead of looping", () => {
    const director = new BeatDirector([makeBeat("a", 5), makeBeat("b", 5)]);
    director.jumpTo(1);
    director.setAutoplay(true);

    vi.advanceTimersByTime(7000);
    expect(director.getSnapshot()).toEqual({ index: 1, autoplay: false });
  });

  it("a longer body dwells longer before advancing", () => {
    const shortThenLong = new BeatDirector([makeBeat("a", 5), makeBeat("b", 5)]);
    const long = new BeatDirector([makeBeat("a", 200), makeBeat("b", 5)]);

    shortThenLong.setAutoplay(true);
    long.setAutoplay(true);

    vi.advanceTimersByTime(7000);
    expect(shortThenLong.getSnapshot().index).toBe(1); // short body already advanced
    expect(long.getSnapshot().index).toBe(0); // long body still dwelling
  });

  it("manually navigating resets the dwell timer for the new beat", () => {
    const director = new BeatDirector([makeBeat("a", 5), makeBeat("b", 5), makeBeat("c", 5)]);
    director.setAutoplay(true);

    vi.advanceTimersByTime(6000);
    director.next(); // now on beat "c", 1000ms into what would have been "a"'s dwell
    expect(director.getSnapshot().index).toBe(1);

    vi.advanceTimersByTime(6999);
    expect(director.getSnapshot().index).toBe(1); // full fresh 7000ms required, not 1000ms carried over
    vi.advanceTimersByTime(2);
    expect(director.getSnapshot().index).toBe(2);
  });

  it("turning autoplay off cancels the pending advance", () => {
    const director = new BeatDirector([makeBeat("a", 5), makeBeat("b", 5)]);
    director.setAutoplay(true);
    vi.advanceTimersByTime(5000);
    director.setAutoplay(false);
    vi.advanceTimersByTime(5000);
    expect(director.getSnapshot().index).toBe(0);
  });

  it("destroy() cancels the pending timer so it never fires after teardown", () => {
    const director = new BeatDirector([makeBeat("a", 5), makeBeat("b", 5)]);
    director.setAutoplay(true);
    director.destroy();
    vi.advanceTimersByTime(10000);
    expect(director.getSnapshot().index).toBe(0);
  });
});
