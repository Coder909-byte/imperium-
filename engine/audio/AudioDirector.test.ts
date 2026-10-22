import { afterEach, describe, expect, it, vi } from "vitest";
import { AudioDirector, AUDIO_FADE_MS } from "./AudioDirector";

const { instances } = vi.hoisted(() => ({ instances: [] as {
  options: { src: string[]; loop: boolean }; play: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>; unload: ReturnType<typeof vi.fn>;
  fade: ReturnType<typeof vi.fn>; mute: ReturnType<typeof vi.fn>;
}[] }));
vi.mock("howler", () => ({
  Howl: class {
    play = vi.fn(() => { this.active = true; return 1; });
    stop = vi.fn(() => { this.active = false; });
    unload = vi.fn(); fade = vi.fn(); mute = vi.fn();
    active = false;
    volume = vi.fn(() => 0.5);
    playing = () => this.active;
    constructor(public options: { src: string[]; loop: boolean }) { instances.push(this); }
  },
}));
afterEach(() => { instances.length = 0; vi.useRealTimers(); });
const assets = { wind: "/assets/audio/wind.mp3", battle: "/assets/audio/battle.mp3", horn: "/assets/audio/horn.mp3" };

describe("scene audio lifecycle", () => {
  it("does not load or play before activation; starts the latest beat only", () => {
    const director = new AudioDirector(assets, "wind");
    director.applyBeat("one", { cue: "horn", bedIntensity: 0.1 });
    director.applyBeat("two", { bed: "battle", bedIntensity: 0.8 });
    expect(instances).toHaveLength(0);
    director.activate();
    expect(instances).toHaveLength(1);
    expect(instances[0].options.src).toEqual([assets.battle]);
    expect(instances[0].play).toHaveBeenCalledOnce();
    expect(instances[0].fade).toHaveBeenCalledWith(0.5, 0.8, AUDIO_FADE_MS);
    director.destroy();
  });

  it("crossfades beds, cancels stale stops on rapid back navigation, and stops previous cues", () => {
    vi.useFakeTimers();
    const director = new AudioDirector(assets, "wind");
    director.applyBeat("one", { cue: "horn", bedIntensity: 0.2 });
    director.activate();
    const [wind, horn] = instances;
    director.applyBeat("two", { bed: "battle", bedIntensity: 0.8 });
    expect(horn.stop).toHaveBeenCalledOnce();
    expect(wind.fade).toHaveBeenLastCalledWith(0.5, 0, AUDIO_FADE_MS);
    director.applyBeat("one", { bedIntensity: 0.2 });
    vi.advanceTimersByTime(AUDIO_FADE_MS);
    expect(wind.stop).not.toHaveBeenCalled();
    expect(instances[2].stop).toHaveBeenCalledOnce();
    director.destroy();
  });

  it("honours initial mute, resumes only the bed on unmute and unloads everything once on exit", () => {
    vi.useFakeTimers();
    const director = new AudioDirector(assets, "wind", true);
    director.applyBeat("one", { cue: "horn", bedIntensity: 0.4 });
    director.activate();
    expect(instances).toHaveLength(0);
    director.setMuted(false);
    expect(instances).toHaveLength(1); // stale cue must not play
    director.setMuted(true);
    expect(instances[0].mute).toHaveBeenLastCalledWith(true);
    director.destroy(); director.destroy(); director.activate();
    expect(instances[0].unload).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("leaves missing or unapproved assets silent", () => {
    const director = new AudioDirector({}, "wind");
    director.applyBeat("one", { cue: "horn", bedIntensity: 1 });
    director.activate();
    expect(instances).toHaveLength(0);
    director.destroy();
  });
});
