import { afterEach, describe, expect, it, vi } from "vitest";
import { NarrationTrack, NARRATION_LOAD_TIMEOUT_MS } from "./NarrationTrack";

const { sounds } = vi.hoisted(() => ({ sounds: [] as {
  options: { onplay: () => void; onend: () => void; onloaderror: () => void; onplayerror: () => void };
  play: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; unload: ReturnType<typeof vi.fn>;
}[] }));
vi.mock("howler", () => ({ Howl: class {
  play = vi.fn(); stop = vi.fn(); unload = vi.fn(); off = vi.fn();
  constructor(public options: typeof sounds[number]["options"]) { sounds.push(this); }
} }));
afterEach(() => { sounds.length = 0; vi.useRealTimers(); });
const recording = { asset: "one", durationMs: 30_000 };

describe("one scene-owned narrator", () => {
  it("waits for activation and starts only the latest beat", () => {
    const track = new NarrationTrack({ one: "/one.wav", two: "/two.wav" });
    track.applyBeat("a", recording);
    track.applyBeat("b", { ...recording, asset: "two" });
    expect(sounds).toHaveLength(0);
    track.activate();
    expect(sounds).toHaveLength(1);
    expect(sounds[0].play).toHaveBeenCalledOnce();
    track.destroy();
  });

  it("cancels loading audio before replacing it and ignores every stale callback, including on re-entry", () => {
    const events = vi.fn();
    const track = new NarrationTrack({ one: "/one.wav" }, events);
    track.applyBeat("a", recording); track.activate();
    const old = sounds[0];
    track.applyBeat("b", recording);
    expect(old.stop).toHaveBeenCalledOnce();
    expect(old.unload).toHaveBeenCalledOnce();
    expect(old.stop.mock.invocationCallOrder[0]).toBeLessThan(sounds[1].play.mock.invocationCallOrder[0]);
    track.applyBeat("a", recording);
    const count = events.mock.calls.length;
    old.options.onplay(); old.options.onend(); old.options.onloaderror();
    expect(events).toHaveBeenCalledTimes(count);
    track.destroy();
  });

  it("reports actual completion, never restarts on an unchanged beat, and cancels on disable/exit", () => {
    const events = vi.fn();
    const track = new NarrationTrack({ one: "/one.wav" }, events);
    track.applyBeat("a", recording); track.activate();
    const sound = sounds[0]; sound.options.onplay(); sound.options.onend();
    expect(events).toHaveBeenLastCalledWith("a", "ended");
    track.applyBeat("a", recording);
    expect(sound.play).toHaveBeenCalledOnce();
    track.setEnabled(false);
    expect(events).toHaveBeenLastCalledWith("a", "fallback");
    track.setEnabled(true);
    expect(sounds).toHaveLength(2);
    track.destroy(); track.destroy();
    expect(sounds[1].unload).toHaveBeenCalledOnce();
  });

  it("falls back on missing, failed or stalled narration and releases all timers", () => {
    vi.useFakeTimers();
    const events = vi.fn();
    const track = new NarrationTrack({ one: "/one.wav" }, events);
    track.applyBeat("missing", { ...recording, asset: "absent" }); track.activate();
    expect(events).toHaveBeenLastCalledWith("missing", "fallback");
    track.applyBeat("slow", recording);
    vi.advanceTimersByTime(NARRATION_LOAD_TIMEOUT_MS);
    expect(events).toHaveBeenLastCalledWith("slow", "failed");
    expect(sounds[0].unload).toHaveBeenCalledOnce();
    track.applyBeat("broken", recording); sounds[1].options.onplayerror();
    expect(events).toHaveBeenLastCalledWith("broken", "failed");
    track.destroy();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("cancels a stalled playing stream when its end event is lost", () => {
    vi.useFakeTimers();
    const events = vi.fn();
    const track = new NarrationTrack({ one: "/one.wav" }, events);
    track.applyBeat("a", recording); track.activate(); sounds[0].options.onplay();
    vi.advanceTimersByTime(recording.durationMs + 5000);
    expect(events).toHaveBeenLastCalledWith("a", "failed");
    expect(sounds[0].stop).toHaveBeenCalledOnce();
    track.destroy();
    expect(vi.getTimerCount()).toBe(0);
  });
});
