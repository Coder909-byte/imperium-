import { useCallback, useEffect, useRef, useState } from "react";
import type { SceneRegion } from "../scene/types";
import type { BeatDirector } from "../scene/BeatDirector";
import type { NarrationStatus } from "./NarrationTrack";
import { AudioDirector, AMBIENCE_STORAGE_KEY, MUTE_STORAGE_KEY, NARRATION_STORAGE_KEY } from "./AudioDirector";

function storedFlag(key: string, fallback: boolean): boolean {
  try { const value = localStorage.getItem(key); return value === null ? fallback : value === "true"; } catch { return fallback; }
}
function persist(key: string, value: boolean): void {
  try { localStorage.setItem(key, String(value)); } catch { /* Storage may be disabled. */ }
}

export function useSceneAudio(region: SceneRegion, beatDirector: BeatDirector) {
  const directorRef = useRef<AudioDirector | null>(null);
  const [muted, setMuted] = useState(() => storedFlag(MUTE_STORAGE_KEY, false));
  const [narrationEnabled, setNarration] = useState(() => storedFlag(NARRATION_STORAGE_KEY, true));
  const [ambienceEnabled, setAmbience] = useState(() => storedFlag(AMBIENCE_STORAGE_KEY, true));
  const [failed, setFailed] = useState(false);
  const [narrationStatus, setNarrationStatus] = useState<NarrationStatus>("fallback");

  useEffect(() => {
    const director = new AudioDirector(region.audio?.assets ?? {}, region.audio?.ambientBed ?? "none", muted,
      () => setFailed(true), (id, status) => {
        if (!id) return;
        beatDirector.setNarrationStatus(id, status);
        setNarrationStatus(status);
      });
    directorRef.current = director;
    director.setNarrationEnabled(narrationEnabled);
    director.setAmbienceEnabled(ambienceEnabled);
    const applyBeat = () => {
      const beat = region.beats[beatDirector.getSnapshot().index];
      director.applyBeat(beat.id, beat.audio);
    };
    applyBeat();
    // Cancel/replace audio synchronously when the index changes, including
    // timer-driven autoplay, before React paints the next caption.
    const unsubscribe = beatDirector.subscribe(applyBeat);
    // Bubble after button handlers: an initial navigation click must not
    // briefly start the old beat while it is activating the new one.
    const activate = (event: Event) => { if (event.isTrusted) director.activate(); };
    window.addEventListener("click", activate);
    return () => {
      unsubscribe();
      window.removeEventListener("click", activate);
      director.destroy();
      directorRef.current = null;
    };
    // Preferences mutate the scene-owned director through their controls.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region, beatDirector]);

  const activate = (event: { isTrusted: boolean }) => {
    if (event.isTrusted) directorRef.current?.activate();
  };
  const toggleMute = (event: { isTrusted: boolean }) => {
    const next = !muted;
    persist(MUTE_STORAGE_KEY, next);
    setMuted(next);
    if (!next) setFailed(false);
    directorRef.current?.setMuted(next);
    activate(event);
  };
  const toggleNarration = (event: { isTrusted: boolean }) => {
    const next = !narrationEnabled;
    persist(NARRATION_STORAGE_KEY, next);
    setNarration(next);
    directorRef.current?.setNarrationEnabled(next);
    activate(event);
  };
  const toggleAmbience = (event: { isTrusted: boolean }) => {
    const next = !ambienceEnabled;
    persist(AMBIENCE_STORAGE_KEY, next);
    setAmbience(next);
    if (next) setFailed(false);
    directorRef.current?.setAmbienceEnabled(next);
    activate(event);
  };
  const stop = useCallback(() => directorRef.current?.destroy(), []);
  const narrationAvailable = region.beats.some(beat => beat.audio?.narration && region.audio?.assets[beat.audio.narration.asset]);
  return { muted, toggleMute, stop, failed, activate, narrationEnabled, ambienceEnabled, narrationStatus,
    toggleNarration, toggleAmbience, narrationAvailable, narrationPending: region.audio?.narrationPending,
    available: Object.keys(region.audio?.assets ?? {}).length > 0 };
}
