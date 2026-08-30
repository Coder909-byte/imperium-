"use client";

// The atlas<->scene transition (PRD §8.2, M3). Mounted once in the root
// layout so it survives the actual page swap — engine/atlas and
// engine/transition never unmount it, they just call requestSweep()
// (transitionStore.ts) from wherever the user happens to be.
//
// Render approach is CSS/SVG, not WebGL (see docs/adr/004): two cloud
// "masses" are plain divs with a static feTurbulence+feDisplacementMap
// edge (the same technique AtlasFilters.tsx already uses for inkEdges)
// and an off-white-to-parchment gradient, moved by writing `transform`
// directly to refs on every animation frame — never through React state,
// and never re-evaluating the filter — so the only per-frame cost is
// compositor work. Verified with a real Chrome trace, not assumed: see
// docs/adr/004-cloud-transition-render-approach.md.
//
// No content imports.
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { useTransitionStore } from "./transitionStore";
import { generatePuffs, puffLocalProgress, type Puff } from "./generatePuffs";
import { ProgressTween, easeInExpo, easeOutExpo, linear, wait } from "./sweepTween";
import styles from "./CloudSweep.module.css";

const PUFF_COUNT = 14;
const IN_DURATION_MS = 820;
const HOLD_MIN_MS = 250;
const OUT_DURATION_MS = 950;
const REDUCED_HALF_MS = 100; // 200ms cross-fade, split evenly
const POPSTATE_COVER_MS = 120; // no advance warning for a back-button press — snap, don't sweep

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(callback: () => void): () => void {
  const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

function getReducedMotionSnapshot(): boolean {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function getReducedMotionServerSnapshot(): boolean {
  return false;
}
const READY_SAFETY_TIMEOUT_MS = 3000; // never hold the screen covered forever on a stuck navigation
const OFFSCREEN_VW = 65; // how far past each edge a mass starts from, in vw

function applyMassTransform(el: HTMLDivElement | null, side: "left" | "right", occlusion: number) {
  if (!el) return;
  const offset = OFFSCREEN_VW * (1 - occlusion);
  el.style.transform = `translateX(${side === "left" ? -offset : offset}vw)`;
}

function applyPuffTransform(el: HTMLDivElement | null, puff: Puff, occlusion: number) {
  if (!el) return;
  const local = puffLocalProgress(occlusion, puff.startDelay);
  const offset = OFFSCREEN_VW * puff.depthMultiplier * (1 - local);
  el.style.transform = `translate(${puff.side === "left" ? -offset : offset}vw, ${puff.verticalOffset}px)`;
  el.style.opacity = String(puff.baseOpacity * local);
}

export function CloudSweep() {
  const request = useTransitionStore((s) => s.request);
  const pathname = usePathname();

  // Unlike M2's AtlasMap (where reducedMotion only gates an imperative
  // transition, never render output), this value picks between two
  // structurally different subtrees below — masses/puffs/svg vs. a
  // plain crossfade div. A lazy `matchMedia` initializer (M2's pattern)
  // would read the *client's* real preference on first render while the
  // server always rendered `false` — a genuine hydration mismatch,
  // caught via the dev overlay, not assumed. useSyncExternalStore is
  // the React-native fix for exactly this shape of problem: its
  // getServerSnapshot lets the server and first client render agree on
  // `false` on purpose, then react to the real value once mounted,
  // without a manual setState-in-effect.
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, getReducedMotionSnapshot, getReducedMotionServerSnapshot);
  const [active, setActive] = useState(false); // discrete — flips at phase boundaries only, safe to render on

  const tweenRef = useRef<ProgressTween>(new ProgressTween(0));
  const runIdRef = useRef(0);
  const handledRequestId = useRef<number | null>(null);
  const pathnameRef = useRef(pathname);
  const pathWaitersRef = useRef<Array<{ from: string; resolve: () => void }>>([]);

  const massLeftRef = useRef<HTMLDivElement | null>(null);
  const massRightRef = useRef<HTMLDivElement | null>(null);
  const crossfadeRef = useRef<HTMLDivElement | null>(null);
  const puffRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  // Generated client-side only, after mount — not useMemo(() =>
  // generatePuffs(...), []). This is a client component, but Next still
  // renders it once on the server for the initial HTML; Math.random()
  // during that render vs. during client hydration produced two
  // different puff fields and a real hydration mismatch (caught via the
  // dev overlay, not assumed). Starting from [] keeps server and first-
  // client-render identical — nothing needs to be visible yet anyway,
  // since occlusion is 0 at mount — then this effect fills in the real
  // per-session random field once hydration is safely behind us.
  const [puffs, setPuffs] = useState<Puff[]>([]);
  useEffect(() => {
    // Deliberate exception to react-hooks/set-state-in-effect: there is
    // no external store to subscribe to here (unlike reducedMotion,
    // above) — this is a one-time client-only random draw with no
    // narrower tool that fits, and the empty-array default above is
    // exactly what keeps it hydration-safe.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPuffs(generatePuffs(PUFF_COUNT));
  }, []);

  useEffect(() => {
    pathnameRef.current = pathname;
    const waiters = pathWaitersRef.current;
    pathWaitersRef.current = waiters.filter((w) => {
      if (w.from !== pathname) {
        w.resolve();
        return false;
      }
      return true;
    });
  }, [pathname]);

  function waitForPathnameChange(from: string): Promise<void> {
    if (pathnameRef.current !== from) return Promise.resolve();
    return new Promise((resolve) => {
      pathWaitersRef.current.push({ from, resolve });
    });
  }

  const paintFrame = useCallback(
    (occlusion: number) => {
      if (reducedMotion) {
        if (crossfadeRef.current) crossfadeRef.current.style.opacity = String(occlusion);
        return;
      }
      applyMassTransform(massLeftRef.current, "left", occlusion);
      applyMassTransform(massRightRef.current, "right", occlusion);
      for (const puff of puffs) {
        applyPuffTransform(puffRefs.current.get(puff.id) ?? null, puff, occlusion);
      }
    },
    [reducedMotion, puffs],
  );

  const runSweep = useCallback(
    async (navigate: (() => void) | null) => {
      const runId = ++runIdRef.current;
      const tween = tweenRef.current;
      setActive(true);

      const inDuration = reducedMotion ? REDUCED_HALF_MS : navigate === null ? POPSTATE_COVER_MS : IN_DURATION_MS;
      const outDuration = reducedMotion ? REDUCED_HALF_MS : OUT_DURATION_MS;
      const holdMin = reducedMotion ? 0 : HOLD_MIN_MS;
      const inEase = reducedMotion ? linear : easeOutExpo;
      const outEase = reducedMotion ? linear : easeInExpo;

      const fromPath = pathnameRef.current;

      await tween.animateTo(1, inDuration, inEase, paintFrame);
      if (runIdRef.current !== runId) return; // superseded while covering

      navigate?.();
      const readyPromise = navigate ? waitForPathnameChange(fromPath) : Promise.resolve();
      await Promise.race([Promise.all([wait(holdMin), readyPromise]), wait(holdMin + READY_SAFETY_TIMEOUT_MS)]);
      if (runIdRef.current !== runId) return; // superseded during the hold

      await tween.animateTo(0, outDuration, outEase, paintFrame);
      if (runIdRef.current !== runId) return;
      setActive(false);
    },
    [reducedMotion, paintFrame],
  );

  useEffect(() => {
    if (!request || request.id === handledRequestId.current) return;
    handledRequestId.current = request.id;
    void runSweep(request.navigate);
  }, [request, runSweep]);

  useEffect(() => {
    function handlePopState() {
      // The browser already changed history by the time this fires —
      // there's no advance warning the way a click gives us, so this
      // covers fast (POPSTATE_COVER_MS) instead of racing an 820ms
      // sweep-in against Next's own re-render.
      void runSweep(null);
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [runSweep]);

  return (
    <div className={styles.overlay} data-active={active} data-testid="cloud-sweep" aria-hidden="true">
      {reducedMotion ? (
        <div ref={crossfadeRef} className={styles.crossfade} style={{ opacity: 0 }} />
      ) : (
        <>
          <svg width="0" height="0" className={styles.defs}>
            <defs>
              <filter id="cloudEdge" x="-30%" y="-30%" width="160%" height="160%">
                <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves={3} seed={5} result="n" />
                <feDisplacementMap in="SourceGraphic" in2="n" scale={70} xChannelSelector="R" yChannelSelector="G" />
              </filter>
            </defs>
          </svg>
          <div ref={massLeftRef} className={styles.mass} data-side="left" style={{ transform: `translateX(-${OFFSCREEN_VW}vw)` }}>
            <div className={styles.blob} data-blob="1" />
            <div className={styles.blob} data-blob="2" />
            <div className={styles.blob} data-blob="3" />
          </div>
          <div ref={massRightRef} className={styles.mass} data-side="right" style={{ transform: `translateX(${OFFSCREEN_VW}vw)` }}>
            <div className={styles.blob} data-blob="1" />
            <div className={styles.blob} data-blob="2" />
            <div className={styles.blob} data-blob="3" />
          </div>
          {puffs.map((puff) => (
            <div
              key={puff.id}
              ref={(el) => {
                if (el) puffRefs.current.set(puff.id, el);
                else puffRefs.current.delete(puff.id);
              }}
              className={styles.puff}
              data-side={puff.side}
              style={{
                width: puff.size,
                height: puff.size * 0.7,
                top: `calc(50% + ${puff.verticalOffset}px)`,
                opacity: 0,
                transform: `translateX(${puff.side === "left" ? -OFFSCREEN_VW : OFFSCREEN_VW}vw)`,
              }}
            />
          ))}
        </>
      )}
    </div>
  );
}
