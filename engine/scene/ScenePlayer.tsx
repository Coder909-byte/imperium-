"use client";

// The scene player (PRD §8.3/§12, M4): letterbox, captions, controls,
// keyboard nav, and the Pixi engine underneath (SceneRenderer, Camera,
// BeatDirector, ParallaxPlane). Routing-agnostic — `onExit` is a plain
// callback so this component doesn't know "/atlas" exists, matching the
// engine's generalise-to-other-civilisations goal. No content imports:
// `region` arrives already adapted to engine/scene/types.ts's shapes.
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { BeatDirector } from "./BeatDirector";
import { useSceneAudio } from "../audio/useSceneAudio";
import { SceneCaptions } from "./SceneCaptions";
import { cameraForBeat, LAYER_REVEAL_MS } from "./beatTiming";
import { SCENE_SPACE } from "./sceneSpace";
import { Camera } from "./Camera";
import { detectStartingTier, readNavigatorSignals, type DeviceTier } from "./deviceTier";
import type { SceneActors } from "./SceneActors";
import { SceneLayers } from "./SceneLayers";
import { SceneRenderer } from "./SceneRenderer";
import { SceneEffects } from "./SceneEffects";
import type { ParallaxPlane } from "./layers/ParallaxPlane";
import { selectPlanesForTier } from "./layers/selectActivePlanes";
import type { SceneRegion } from "./types";
import styles from "./ScenePlayer.module.css";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export interface ScenePlayerProps {
  region: SceneRegion;
  /** Called on Escape or the exit control. Routing lives outside this component. */
  onExit: () => void;
  /** Dev-only overrides (scene-lab) — the real /scene/[regionId] route never sets these. */
  forcedTier?: DeviceTier;
  forcedLut?: string;
  forcedChainEnabled?: boolean;
}

export function ScenePlayer({ region, onExit, forcedTier, forcedLut, forcedChainEnabled }: ScenePlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<SceneRenderer | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const effectsRef = useRef<SceneEffects | null>(null);
  const actorsRef = useRef<SceneActors | null>(null);
  const planesRef = useRef<Map<string, ParallaxPlane>>(new Map());
  const hasAppliedBeatRef = useRef(false);
  const [tier, setTier] = useState<DeviceTier>(forcedTier ?? "high");
  // A lazy useState initializer, not a ref: the linter (correctly) forbids
  // reading a ref's `.current` during render — a `useState` value that's
  // never actually re-set is the sanctioned way to construct one
  // long-lived non-React object per mount and still use it directly in
  // render/deps arrays, same shape as `[cache] = useState(() => new Map())`.
  const [beatDirector] = useState(() => new BeatDirector(region.beats));

  const [engineReady, setEngineReady] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  // Lazy initializer, not an effect — mirrors AtlasMap.tsx: reducedMotion
  // only gates imperative Pixi/GSAP behaviour here, never which DOM
  // subtree renders, so there's no server/first-client-render mismatch
  // for a lazy matchMedia read to catch (unlike CloudSweep's crossfade
  // vs. cloud-shapes branch).
  const [reducedMotion, setReducedMotion] = useState<boolean>(() =>
    typeof window === "undefined" ? false : window.matchMedia(REDUCED_MOTION_QUERY).matches,
  );
  const beatState = useSyncExternalStore(beatDirector.subscribe, beatDirector.getSnapshot);
  const beat = region.beats[beatState.index];
  const audio = useSceneAudio(region, beat);
  const { stop: stopAudio } = audio;
  const exitScene = () => { stopAudio(); onExit(); };

  useEffect(() => {
    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    const handleChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => () => beatDirector.destroy(), [beatDirector]);

  // Mounts the Pixi engine. Safe under React StrictMode's dev-only
  // mount->cleanup->mount: SceneRenderer.init() checks its own status
  // before attaching anything if destroy() ran while it was still
  // awaiting init (see SceneRenderer.ts), so the "cancelled" flag below
  // exists only to stop *this* effect's own .then() from touching refs
  // a second, later mount has already replaced.
  useEffect(() => {
    const hostEl = containerRef.current;
    if (!hostEl) return;
    const renderer = new SceneRenderer(hostEl);
    rendererRef.current = renderer;
    let cancelled = false;
    let unsubscribeTier: (() => void) | null = null;
    const layers = new SceneLayers();

    void renderer.init().then(async () => {
      if (cancelled || renderer.getStatus() !== "ready") return;

      const camera = new Camera(renderer.cameraContainer, renderer.getTicker(), () => renderer.getStageSize());
      camera.setReducedMotion(reducedMotion);
      cameraRef.current = camera;

      // Deliberately the true visible stage size, NOT overscanned like
      // planes below — planes are oversized so camera drift never
      // reveals empty canvas past their edge, but particles are discrete
      // objects meant to be seen; positioning them against the
      // overscanned (1.35x larger) bounds put most of a beat's fx
      // sitting at or past the actual visible edge, invisible in every
      // screenshot despite spawning, ticking, and being visible=true the
      // whole time — caught by literally dumping live particle state via
      // console.log mid-tick, not by reasoning about the math again.
      // Read fresh every call so a resize stays correct on the next frame.
      const getBounds = () => SCENE_SPACE;

      // Planes are built and added to cameraContainer *before*
      // SceneEffects is constructed, deliberately — SceneEffects' own
      // constructor adds particle containers to the same cameraContainer,
      // and Pixi renders children in add-order. Building this the other
      // way round once put particles first, planes second, which put
      // every particle permanently behind an opaque plane rectangle —
      // confirmed invisible via an actual chain-on/chain-off screenshot,
      // not caught by any test (nothing asserts pixel content). The tier
      // used to pick which planes to build at all (PRD §11's 4-plane cap)
      // is computed here with the same pure heuristic SceneEffects'
      // DeviceTierController uses internally — calling it twice is free
      // and deterministic; only the controller actually constructed
      // below owns the live snapshot/runtime monitor/console log.
      const initialTierGuess = forcedTier ?? detectStartingTier(readNavigatorSignals());
      const planeDefs = selectPlanesForTier(region.planes, initialTierGuess);
      await layers.init(planeDefs, region.rigs, renderer.getTicker());
      if (cancelled) { layers.destroy(); return; }
      renderer.cameraContainer.addChild(layers.container);
      planesRef.current = layers.planes;
      actorsRef.current = layers.actors ?? null;

      const effects = new SceneEffects({
        stage: renderer.getStage(),
        cameraContainer: renderer.cameraContainer,
        ticker: renderer.getTicker(),
        lutKey: forcedLut ?? region.lut,
        getBounds,
        forcedTier,
      });
      if (forcedChainEnabled !== undefined) effects.setChainEnabled(forcedChainEnabled);
      effectsRef.current = effects;
      setTier(effects.deviceTier.getSnapshot().tier);

      // Includes approved image loading as well as graph construction.
      performance.mark("imperium:scene-graph-built");
      renderer.getTicker().addOnce(() => performance.mark("imperium:scene-first-frame"));

      // Tier only ever downgrades at runtime, never upgrades (deviceTier.ts) —
      // so this only ever needs to shrink the live plane set, never rebuild
      // dropped planes back in.
      unsubscribeTier = effects.deviceTier.subscribe(() => {
        const snapshot = effects.deviceTier.getSnapshot();
        setTier(snapshot.tier);
        if (snapshot.tier !== "low") return;
        const allowedIds = new Set(selectPlanesForTier(region.planes, "low").map((p) => p.id));
        for (const [id, plane] of planesRef.current) {
          if (!allowedIds.has(id)) {
            plane.destroy();
            planesRef.current.delete(id);
          }
        }
      });

      setEngineReady(true);
    }).catch(() => {
      layers.destroy();
      cameraRef.current?.destroy();
      cameraRef.current = null;
      renderer.destroy();
      if (!cancelled) setRenderError("Scene artwork could not load. Reload to retry; the text and sources remain available.");
    });

    return () => {
      cancelled = true;
      unsubscribeTier?.();
      cameraRef.current?.destroy();
      cameraRef.current = null;
      effectsRef.current?.destroy();
      effectsRef.current = null;
      layers.destroy();
      actorsRef.current = null;
      planesRef.current = new Map();
      renderer.destroy();
      rendererRef.current = null;
      hasAppliedBeatRef.current = false;
      setEngineReady(false);
    };
    // region/forcedTier/forcedLut/forcedChainEnabled are treated as stable
    // for this component's lifetime — a caller that changes them (e.g.
    // /dev/scene-lab) remounts via key, same as region already did in M4.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region]);

  // Keeps the camera's reduced-motion flag (cuts vs. tweens) current,
  // and snaps any live pointer-parallax offset back to zero the instant
  // reduced motion turns on — it shouldn't linger at whatever offset the
  // pointer happened to be at.
  useEffect(() => {
    cameraRef.current?.setReducedMotion(reducedMotion);
    effectsRef.current?.setReducedMotion(reducedMotion);
    actorsRef.current?.setReducedMotion(reducedMotion);
    if (reducedMotion) {
      for (const plane of planesRef.current.values()) plane.setPointerOffset(0, 0);
    }
  }, [reducedMotion, engineReady]);

  // Applies the current beat's camera move, layer visibility, fx
  // (particles/shake/lightSource — PRD §4/§10, M5), and actors (PRD
  // §3/§10, M6).
  useEffect(() => {
    if (!engineReady) return;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    if (!camera || !renderer) return;

    camera.animateTo(cameraForBeat(beat), { shakeActive: beat.fx.includes("shake") });
    effectsRef.current?.applyBeat(beat.fx, beat.lightSource);
    // Reduced-motion is NOT passed here — SceneActors tracks it via its
    // own setReducedMotion() (the effect above, which fires on the same
    // reducedMotion change and runs first). Threading it through here
    // too would rebuild every actor — destroying and reconstructing
    // Pixi objects and resetting each PuppetActor's phase — on a bare
    // reduced-motion toggle that didn't actually change the beat.
    actorsRef.current?.applyBeat(beat.actors);
    const visible = new Set(beat.visibleLayers);
    const fadeMs = reducedMotion || !hasAppliedBeatRef.current ? 0 : LAYER_REVEAL_MS;
    for (const [id, plane] of planesRef.current) {
      plane.setVisible(visible.has(id), fadeMs);
    }
    if (!hasAppliedBeatRef.current) renderer.afterNextRender(() => performance.mark("imperium:scene-presented"));
    hasAppliedBeatRef.current = true;
  }, [engineReady, beat, reducedMotion]);

  // Live LUT preview (scene-lab only) — the real /scene/[regionId] route
  // never passes forcedLut, so this only ever re-fires there on region
  // change, which already remounts the whole engine anyway.
  useEffect(() => {
    if (!engineReady || forcedLut === undefined) return;
    effectsRef.current?.setLutPreset(forcedLut);
  }, [engineReady, forcedLut]);

  // Pointer parallax — skipped entirely under reduced motion (PRD §12),
  // not just zeroed, so no listener cost is paid either.
  useEffect(() => {
    if (reducedMotion) return;
    const hostEl = containerRef.current;
    if (!hostEl) return;
    function handlePointerMove(event: PointerEvent) {
      const rect = hostEl!.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      for (const plane of planesRef.current.values()) plane.setPointerOffset(nx, ny);
    }
    hostEl.addEventListener("pointermove", handlePointerMove);
    return () => hostEl.removeEventListener("pointermove", handlePointerMove);
  }, [reducedMotion]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        beatDirector.next();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        beatDirector.previous();
      } else if (event.key === "Escape") {
        event.preventDefault();
        stopAudio();
        onExit();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [beatDirector, onExit, stopAudio]);

  return (
    <div
      className={styles.player}
      data-testid="scene-player"
      data-engine-ready={engineReady}
      data-device-tier={tier}
      data-active-fx={beat.fx.join(",")}
      data-active-actors={beat.actors.map((a) => `${a.rig}:${a.clip}:${a.count}`).join(",")}
    >
      <div ref={containerRef} className={styles.canvasHost} />
      {renderError && <p role="alert" className={styles.renderError}>{renderError}</p>}
      <div className={styles.topBar} />
      {(region.planes.some((plane) => !plane.assetUrl) || region.rigs.some((rig) => rig.parts.some((part) => !part.texture.startsWith("/assets/")))
        || region.beats.some((beat) => beat.actors.some((actor) => actor.count > 1))) && <span className={styles.artStatus}>Artwork in progress</span>}

      <button type="button" className={styles.exitButton} onClick={exitScene}>
        ← Return to the map
      </button>

      <SceneCaptions region={region} beat={beat} index={beatState.index} autoplay={beatState.autoplay} audio={audio}
        previous={() => beatDirector.previous()} next={() => beatDirector.next()} jumpTo={(index) => beatDirector.jumpTo(index)}
        toggleAutoplay={() => beatDirector.setAutoplay(!beatState.autoplay)} />
    </div>
  );
}
