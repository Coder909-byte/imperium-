"use client";

// The scene player (PRD §8.3/§12, M4): letterbox, captions, controls,
// keyboard nav, and the Pixi engine underneath (SceneRenderer, Camera,
// BeatDirector, ParallaxPlane). Routing-agnostic — `onExit` is a plain
// callback so this component doesn't know "/atlas" exists, matching the
// engine's generalise-to-other-civilisations goal. No content imports:
// `region` arrives already adapted to engine/scene/types.ts's shapes.
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { BeatDirector } from "./BeatDirector";
import { Camera } from "./Camera";
import { SceneRenderer } from "./SceneRenderer";
import { ParallaxPlane } from "./layers/ParallaxPlane";
import { computePlaceholderBand } from "./layers/placeholderBand";
import { createPlaceholderTexture } from "./layers/placeholderTexture";
import type { SceneRegion } from "./types";
import styles from "./ScenePlayer.module.css";

// Planes render larger than the stage so panning, handheld drift, and
// pointer parallax never reveal empty canvas past a plane's edge — a
// placeholder-art concern only; real forged backgrounds (M7) will be
// composed with their own margin already baked in.
const PLANE_OVERSCAN = 1.35;

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export interface ScenePlayerProps {
  region: SceneRegion;
  /** Called on Escape or the exit control. Routing lives outside this component. */
  onExit: () => void;
}

export function ScenePlayer({ region, onExit }: ScenePlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<SceneRenderer | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const planesRef = useRef<Map<string, ParallaxPlane>>(new Map());
  // A lazy useState initializer, not a ref: the linter (correctly) forbids
  // reading a ref's `.current` during render — a `useState` value that's
  // never actually re-set is the sanctioned way to construct one
  // long-lived non-React object per mount and still use it directly in
  // render/deps arrays, same shape as `[cache] = useState(() => new Map())`.
  const [beatDirector] = useState(() => new BeatDirector(region.beats));

  const [engineReady, setEngineReady] = useState(false);
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

    void renderer.init().then(() => {
      if (cancelled || renderer.getStatus() !== "ready") return;

      const camera = new Camera(renderer.cameraContainer, renderer.getTicker(), () => renderer.getStageSize());
      camera.setReducedMotion(reducedMotion);
      cameraRef.current = camera;

      const stage = renderer.getStageSize();
      const overscanWidth = stage.width * PLANE_OVERSCAN;
      const overscanHeight = stage.height * PLANE_OVERSCAN;
      const planes = new Map<string, ParallaxPlane>();
      region.planes.forEach((planeDef, index) => {
        // Bottom-anchored, depth-scaled band, not a full-bleed rect —
        // see placeholderBand.ts: a same-size opaque rectangle per plane
        // made every plane but the frontmost invisible, defeating the
        // entire point of depth-scaled parallax (confirmed via a real
        // screenshot, not assumed).
        const band = computePlaceholderBand(planeDef.depth, overscanWidth, overscanHeight);
        const texture = createPlaceholderTexture({ id: planeDef.id, depth: planeDef.depth, index, width: band.width, height: band.height });
        const plane = new ParallaxPlane({ id: planeDef.id, depth: planeDef.depth, texture, tint: planeDef.tint, blur: planeDef.blur });
        plane.setSize(band.width, band.height, band.baseOffsetY);
        renderer.cameraContainer.addChild(plane.container);
        planes.set(planeDef.id, plane);
      });
      planesRef.current = planes;
      setEngineReady(true);
    });

    return () => {
      cancelled = true;
      cameraRef.current?.destroy();
      cameraRef.current = null;
      for (const plane of planesRef.current.values()) plane.destroy();
      planesRef.current = new Map();
      renderer.destroy();
      rendererRef.current = null;
      setEngineReady(false);
    };
    // region is treated as stable for this component's lifetime — a
    // caller that swaps regions (e.g. /dev/scene-lab) remounts via key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region]);

  // Keeps the camera's reduced-motion flag (cuts vs. tweens) current,
  // and snaps any live pointer-parallax offset back to zero the instant
  // reduced motion turns on — it shouldn't linger at whatever offset the
  // pointer happened to be at.
  useEffect(() => {
    cameraRef.current?.setReducedMotion(reducedMotion);
    if (reducedMotion) {
      for (const plane of planesRef.current.values()) plane.setPointerOffset(0, 0);
    }
  }, [reducedMotion, engineReady]);

  // Applies the current beat's camera move and layer visibility.
  useEffect(() => {
    if (!engineReady) return;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    if (!camera || !renderer) return;

    camera.animateTo(beat.camera, renderer.getStageSize());
    const visible = new Set(beat.visibleLayers);
    const fadeMs = reducedMotion ? 0 : beat.camera.durationMs;
    for (const [id, plane] of planesRef.current) {
      plane.setVisible(visible.has(id), fadeMs);
    }
  }, [engineReady, beat, reducedMotion]);

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
        onExit();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [beatDirector, onExit]);

  return (
    <div className={styles.player} data-testid="scene-player">
      <div ref={containerRef} className={styles.canvasHost} />
      <div className={styles.topBar} />

      <button type="button" className={styles.exitButton} onClick={onExit}>
        ← Return to the map
      </button>

      <div className={styles.bottomBar}>
        <div className={styles.captionBlock} aria-live="polite">
          <p className={styles.eyebrow}>{beat.year}</p>
          <h2 className={styles.headline}>{beat.headline}</h2>
          <p className={styles.body}>{beat.body}</p>
        </div>

        <div className={styles.controls}>
          <button
            type="button"
            className={styles.navButton}
            onClick={() => beatDirector.previous()}
            disabled={beatState.index === 0}
            aria-label="Previous beat"
          >
            ‹
          </button>

          <div className={styles.pips} role="tablist" aria-label="Beats">
            {region.beats.map((b, index) => (
              <button
                key={b.id}
                type="button"
                className={styles.pip}
                role="tab"
                aria-current={index === beatState.index}
                aria-label={`Go to beat ${index + 1}: ${b.headline}`}
                onClick={() => beatDirector.jumpTo(index)}
              />
            ))}
          </div>

          <button
            type="button"
            className={styles.navButton}
            onClick={() => beatDirector.next()}
            disabled={beatState.index === region.beats.length - 1}
            aria-label="Next beat"
          >
            ›
          </button>

          <button
            type="button"
            className={styles.autoplayButton}
            aria-pressed={beatState.autoplay}
            onClick={() => beatDirector.setAutoplay(!beatState.autoplay)}
          >
            {beatState.autoplay ? "⏸ Autoplay" : "▶ Autoplay"}
          </button>
        </div>
      </div>
    </div>
  );
}
