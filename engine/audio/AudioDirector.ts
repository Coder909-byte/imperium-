import { Howl } from "howler";

export interface BeatAudio {
  cue?: string;
  bed?: string;
  bedIntensity: number;
}

export const AUDIO_FADE_MS = 600;
export const MUTE_STORAGE_KEY = "imperium:audio-muted";

/** Scene-owned sounds only. No global Howler.unload/mute: another
 * mounted consumer must not lose its audio when this scene exits. */
export class AudioDirector {
  private readonly sounds = new Map<string, Howl>();
  private readonly stopTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly failedSounds = new Set<string>();
  private activated = false;
  private destroyed = false;
  private muted: boolean;
  private currentBed: string | undefined;
  private currentCue: string | undefined;
  private beatId: string | undefined;
  private audio: BeatAudio = { bedIntensity: 0.5 };

  constructor(
    private readonly assets: Readonly<Record<string, string>>,
    private readonly ambientBed: string,
    muted = false,
    private readonly onError: () => void = () => {},
  ) { this.muted = muted; }

  /** Caller invokes synchronously inside a trusted user gesture. */
  activate(): void {
    if (this.destroyed || this.activated) return;
    this.activated = true;
    if (!this.muted) this.playCurrent(true);
  }

  applyBeat(id: string, audio: BeatAudio = { bedIntensity: 0.5 }): void {
    if (this.destroyed) return;
    const changed = id !== this.beatId;
    this.beatId = id;
    this.audio = audio;
    if (changed) {
      if (this.currentCue) this.sounds.get(this.currentCue)?.stop();
      this.currentCue = undefined;
    }
    if (this.activated && !this.muted) this.playCurrent(changed);
  }

  setMuted(muted: boolean): void {
    if (this.destroyed || this.muted === muted) return;
    this.muted = muted;
    for (const sound of this.sounds.values()) sound.mute(muted);
    if (muted) {
      if (this.currentCue) this.sounds.get(this.currentCue)?.stop();
      this.currentCue = undefined;
    } else {
      this.failedSounds.clear();
      if (this.activated) this.playCurrent(false);
    }
  }

  private getSound(id: string, loop: boolean): Howl | undefined {
    const url = this.assets[id];
    if (!url || this.failedSounds.has(id)) return undefined;
    let sound = this.sounds.get(id);
    if (!sound) {
      sound = new Howl({
        src: [url], loop, volume: 0, autoplay: false,
        onloaderror: () => this.failSound(id, sound),
        // No retry loop that might escape the gesture policy or play a
        // stale cue. A later explicit sound toggle can retry the bed.
        onplayerror: () => this.failSound(id, sound),
      });
      this.sounds.set(id, sound);
    }
    return sound;
  }

  private failSound(id: string, sound: Howl | undefined): void {
    if (this.destroyed || !sound || this.sounds.get(id) !== sound) return;
    this.failedSounds.add(id);
    const timer = this.stopTimers.get(id);
    if (timer) clearTimeout(timer);
    this.stopTimers.delete(id);
    // Howler can remain in "loading" after HTTP/decoding errors. Reusing
    // it queues play forever, so a later explicit unmute needs a new Howl.
    sound.stop();
    sound.unload();
    this.sounds.delete(id);
    this.onError();
  }

  private playCurrent(playCue: boolean): void {
    const bedId = this.audio.bed ?? this.ambientBed;
    if (this.currentBed && this.currentBed !== bedId) {
      const previousId = this.currentBed;
      const previous = this.sounds.get(previousId);
      previous?.fade(previous.volume(), 0, AUDIO_FADE_MS);
      this.stopTimers.set(previousId, setTimeout(() => {
        previous?.stop();
        this.stopTimers.delete(previousId);
      }, AUDIO_FADE_MS));
    }
    this.currentBed = bedId;
    const timer = this.stopTimers.get(bedId);
    if (timer) clearTimeout(timer);
    this.stopTimers.delete(bedId);
    const bed = this.getSound(bedId, true);
    if (bed) {
      bed.mute(this.muted);
      if (!bed.playing()) bed.play();
      bed.fade(bed.volume(), this.audio.bedIntensity, AUDIO_FADE_MS);
    }
    if (playCue && this.audio.cue) {
      const cue = this.getSound(this.audio.cue, false);
      if (cue) {
        this.currentCue = this.audio.cue;
        cue.mute(false);
        cue.volume(1);
        cue.play();
      }
    }
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const timer of this.stopTimers.values()) clearTimeout(timer);
    this.stopTimers.clear();
    for (const sound of this.sounds.values()) { sound.stop(); sound.unload(); }
    this.sounds.clear();
  }
}
