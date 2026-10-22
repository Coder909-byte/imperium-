import { useCallback, useEffect, useRef, useState } from "react";
import type { SceneBeat, SceneRegion } from "../scene/types";
import { AudioDirector, MUTE_STORAGE_KEY } from "./AudioDirector";

export function useSceneAudio(region: SceneRegion, beat: SceneBeat) {
  const directorRef = useRef<AudioDirector | null>(null);
  const [muted, setMuted] = useState(() => {
    try { return localStorage.getItem(MUTE_STORAGE_KEY) === "true"; } catch { return false; }
  });
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const director = new AudioDirector(region.audio?.assets ?? {}, region.audio?.ambientBed ?? "none", muted, () => setFailed(true));
    directorRef.current = director;
    // Mount never constructs a Howl or starts playback. Only trusted
    // pointer/keyboard input activates the current scene's sounds.
    const activate = (event: Event) => { if (event.isTrusted) director.activate(); };
    window.addEventListener("pointerdown", activate);
    window.addEventListener("keydown", activate);
    return () => {
      window.removeEventListener("pointerdown", activate);
      window.removeEventListener("keydown", activate);
      director.destroy();
      directorRef.current = null;
    };
    // A region remount owns the audio lifecycle; mute changes mutate it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region]);

  useEffect(() => { directorRef.current?.applyBeat(beat.id, beat.audio); }, [beat]);
  useEffect(() => { directorRef.current?.setMuted(muted); }, [muted]);

  const toggleMute = () => {
    const next = !muted;
    try { localStorage.setItem(MUTE_STORAGE_KEY, String(next)); } catch { /* Storage may be disabled. */ }
    setMuted(next);
    // The click is itself a gesture, including keyboard activation.
    directorRef.current?.setMuted(next);
    directorRef.current?.activate();
  };
  const stop = useCallback(() => directorRef.current?.destroy(), []);
  return { muted, toggleMute, stop, failed, available: Object.keys(region.audio?.assets ?? {}).length > 0 };
}
