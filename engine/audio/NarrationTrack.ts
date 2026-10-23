import { Howl } from "howler";

export interface BeatNarration { asset: string; durationMs: number }
export type NarrationStatus = "fallback" | "loading" | "playing" | "ended" | "failed";
export const NARRATION_LOAD_TIMEOUT_MS = 8000;

/** One disposable Howl per beat visit. Unloading also removes queued
 * playback, so a slow previous download cannot become a second speaker. */
export class NarrationTrack {
  private sound: Howl | undefined;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private generation = 0;
  private beatId = "";
  private recording: BeatNarration | undefined;
  private activated = false;
  private enabled = true;
  private destroyed = false;

  constructor(private readonly assets: Readonly<Record<string, string>>,
    private readonly onStatus: (beatId: string, status: NarrationStatus) => void = () => {}) {}

  applyBeat(id: string, recording?: BeatNarration): void {
    if (this.destroyed || id === this.beatId) return;
    this.cancel();
    this.beatId = id;
    this.recording = recording;
    this.start();
  }

  activate(): void {
    if (this.destroyed || this.activated) return;
    this.activated = true;
    this.start();
  }

  setEnabled(enabled: boolean): void {
    if (this.destroyed || enabled === this.enabled) return;
    this.enabled = enabled;
    this.cancel();
    this.start();
  }

  private start(): void {
    const recording = this.recording;
    const url = recording && this.assets[recording.asset];
    if (!this.activated || !this.enabled || !recording || !url) {
      this.onStatus(this.beatId, "fallback");
      return;
    }
    const generation = this.generation;
    const current = () => !this.destroyed && generation === this.generation;
    const failed = () => {
      if (!current()) return;
      this.cancel();
      this.onStatus(this.beatId, "failed");
    };
    this.onStatus(this.beatId, "loading");
    this.timer = setTimeout(failed, NARRATION_LOAD_TIMEOUT_MS);
    const sound = new Howl({
      src: [url], loop: false, autoplay: false, volume: 1,
      onplay: () => {
        if (!current()) return;
        clearTimeout(this.timer);
        this.onStatus(this.beatId, "playing");
        // A lost end event must not suspend autoplay indefinitely.
        this.timer = setTimeout(failed, recording.durationMs + 5000);
      },
      onend: () => {
        if (!current()) return;
        this.cancel();
        this.onStatus(this.beatId, "ended");
      },
      onloaderror: failed,
      onplayerror: failed,
    });
    this.sound = sound;
    sound.play();
  }

  private cancel(): void {
    this.generation += 1;
    clearTimeout(this.timer);
    this.timer = undefined;
    this.sound?.off();
    this.sound?.stop();
    this.sound?.unload();
    this.sound = undefined;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.cancel();
  }
}
