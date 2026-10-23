import { afterEach, describe, expect, it, vi } from "vitest";
import { AudioDirector, AUDIO_FADE_MS } from "./AudioDirector";

const { instances } = vi.hoisted(() => ({ instances: [] as {
  options: { src: string[]; loop: boolean; onloaderror: () => void; onplayerror: () => void; onplay?: () => void; onend?: () => void }; play: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>; unload: ReturnType<typeof vi.fn>;
  fade: ReturnType<typeof vi.fn>; mute: ReturnType<typeof vi.fn>;
  volume: ReturnType<typeof vi.fn>;
}[] }));
vi.mock("howler", () => ({
  Howl: class {
    play = vi.fn(() => { this.active = true; return 1; });
    stop = vi.fn(() => { this.active = false; });
    unload = vi.fn(); fade = vi.fn(); mute = vi.fn(); off = vi.fn();
    active = false;
    volume = vi.fn(() => 0.5);
    playing = () => this.active;
    constructor(public options: typeof instances[number]["options"]) { instances.push(this); }
  },
}));
afterEach(() => { instances.length = 0; vi.useRealTimers(); });
const assets = { wind: "/assets/audio/wind.mp3", battle: "/assets/audio/battle.mp3", horn: "/assets/audio/horn.mp3" };

describe("scene audio lifecycle", () => {
  it("ducks beds and cues under a single narrator while ambience and narration remain independently controllable", () => {
    const director = new AudioDirector({ ...assets, voice: "/voice.wav" }, "wind");
    director.applyBeat("a", { cue: "horn", cueVolume: 0.2, bedIntensity: 0.5, narration: { asset: "voice", durationMs: 30_000 } });
    director.activate();
    const narrator = instances.find(sound => sound.options.src[0] === "/voice.wav")!;
    const wind = instances.find(sound => sound.options.src[0] === assets.wind)!;
    const cue = instances.find(sound => sound.options.src[0] === assets.horn)!;
    expect(wind.fade).toHaveBeenLastCalledWith(0.5, 0.09, AUDIO_FADE_MS);
    expect(cue.volume).toHaveBeenLastCalledWith(0.2 * 0.18);
    director.setAmbienceEnabled(false);
    expect(wind.mute).toHaveBeenLastCalledWith(true);
    expect(narrator.stop).not.toHaveBeenCalled();
    director.setNarrationEnabled(false);
    expect(narrator.stop).toHaveBeenCalledOnce();
    expect(wind.mute).toHaveBeenLastCalledWith(true);
    director.setAmbienceEnabled(true);
    expect(wind.fade).toHaveBeenLastCalledWith(0.5, 0.5, AUDIO_FADE_MS);
    director.setNarrationEnabled(true);
    const restarted = instances.at(-1)!;
    director.setMuted(true);
    expect(restarted.stop).toHaveBeenCalledOnce();
    director.destroy();
    expect(restarted.unload).toHaveBeenCalledOnce();
  });
  it("plays cues at their authored level once per beat entry and never replays one on unmute", () => {
    const director = new AudioDirector(assets, "wind");
    const audio = { cue: "horn", cueVolume: 0.18, bedIntensity: 0.45 };
    director.applyBeat("work", audio);
    director.activate();
    const cue = instances[1];
    expect(cue.options.loop).toBe(false);
    expect(cue.volume).toHaveBeenLastCalledWith(0.18);
    expect(cue.play).toHaveBeenCalledOnce();
    director.applyBeat("work", audio);
    director.setMuted(true);
    director.setMuted(false);
    expect(cue.play).toHaveBeenCalledOnce();
    director.applyBeat("quiet", { bedIntensity: 0.15 });
    director.applyBeat("work", audio);
    expect(cue.play).toHaveBeenCalledTimes(2);
    director.destroy();
    expect(cue.stop).toHaveBeenCalled();
    expect(cue.unload).toHaveBeenCalledOnce();
  });

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

  it.each(["onloaderror", "onplayerror"] as const)("retries a failed sound only after an explicit unmute (%s)", (event) => {
    const onError = vi.fn();
    const director = new AudioDirector(assets, "wind", false, onError);
    director.applyBeat("one", { bedIntensity: 0.2 });
    director.activate();
    const failed = instances[0];
    failed.options[event]();
    expect(onError).toHaveBeenCalledOnce();
    expect(failed.stop).toHaveBeenCalledOnce();
    expect(failed.unload).toHaveBeenCalledOnce();
    director.applyBeat("two", { bedIntensity: 0.6 });
    expect(instances).toHaveLength(1);
    director.setMuted(true);
    director.setMuted(false);
    expect(instances).toHaveLength(2);
    expect(instances[1].play).toHaveBeenCalledOnce();
    expect(instances[1].fade).toHaveBeenLastCalledWith(0.5, 0.6, AUDIO_FADE_MS);
    // Late callbacks from the discarded Howl cannot poison the retry.
    failed.options[event]();
    expect(onError).toHaveBeenCalledOnce();
    expect(instances[1].unload).not.toHaveBeenCalled();
    director.destroy();
    instances[1].options[event]();
    expect(onError).toHaveBeenCalledOnce();
  });

  it("cancels crossfade stops and unloads both beds when exiting mid-transition", () => {
    vi.useFakeTimers();
    const director = new AudioDirector(assets, "wind");
    director.activate();
    director.applyBeat("battle", { bed: "battle", bedIntensity: 0.8 });
    expect(vi.getTimerCount()).toBe(1);
    director.destroy();
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(AUDIO_FADE_MS);
    for (const sound of instances) {
      expect(sound.stop).toHaveBeenCalledOnce();
      expect(sound.unload).toHaveBeenCalledOnce();
    }
  });
});
