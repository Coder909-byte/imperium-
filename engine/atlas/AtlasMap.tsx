"use client";

// The interactive atlas SVG. Held regions are a pure function of the
// selected year (PRD §8.1) — there is no per-era snapshot state, just a
// `heldIds` set recomputed from `eraOrder[0]`'s year on every render.
// No content imports — everything arrives as props (engine/ hard rule).
//
// Era switches animate via MorphBorders (M2) — GSAP + MorphSVGPlugin,
// lazy-loaded on idle after mount so it never lands in the initial atlas
// bundle (PRD §11 / CLAUDE.md budget). `eraOrder` itself still updates
// synchronously on click: insets and interactivity (aria-label, click,
// keyboard) cut instantly, per PRD §8.1 — only the main map's *visual*
// fill/stroke/scale/opacity/path is owned by the transition, and only
// for its ~900ms (or 150ms under prefers-reduced-motion) duration.
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { AtlasFilters } from "./AtlasFilters";
import { AtlasFrame } from "./AtlasFrame";
import { AtlasInsets } from "./AtlasInsets";
import { isHeld } from "./heldRegions";
import type { AtlasMapProps } from "./types";
import type { BorderMorph, ProvinceMorphElement } from "./MorphBorders";
import { useTransitionStore } from "@/engine/transition/transitionStore";
import styles from "./AtlasMap.module.css";

function formatYear(year: number): string {
  return year < 0 ? `${-year} BC` : `${year} AD`;
}

export function AtlasMap({ width, height, physical, provinces, cities, seas, eras }: AtlasMapProps) {
  const router = useRouter();
  const requestSweep = useTransitionStore((s) => s.requestSweep);
  const [eraOrder, setEraOrder] = useState<number[]>(() => eras.map((_, i) => i));
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  // Lazy initializer, not an effect — reducedMotion never affects render
  // output (only the imperative transition), so there's nothing for a
  // server/first-client-render mismatch to catch here.
  const [reducedMotion, setReducedMotion] = useState<boolean>(() =>
    typeof window === "undefined" ? false : window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  const pathRefs = useRef<Map<string, SVGPathElement>>(new Map());
  const heldOverlayRefs = useRef<Map<string, SVGPathElement>>(new Map());
  const labelRefs = useRef<Map<string, SVGTextElement>>(new Map());
  const eraLabelRef = useRef<SVGTextElement | null>(null);
  const borderMorphRef = useRef<BorderMorph | null>(null);
  const morphModuleRef = useRef<Promise<typeof import("./MorphBorders")> | null>(null);

  const mainEra = eras[eraOrder[0]];
  const heldIds = useMemo(
    () => new Set(provinces.filter((p) => isHeld(mainEra.year, p)).map((p) => p.id)),
    [provinces, mainEra.year],
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Warm the morph module on idle so it's already cached by the time a
  // user actually clicks — keeps it out of the initial bundle (it's
  // still a dynamic import, still code-split) without paying a visible
  // network stall on the typical first interaction.
  useEffect(() => {
    const win = window as Window & {
      requestIdleCallback?: (callback: () => void) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    if (win.requestIdleCallback) {
      const handle = win.requestIdleCallback(() => void loadMorphModule());
      return () => win.cancelIdleCallback?.(handle);
    }
    const timeout = window.setTimeout(() => void loadMorphModule(), 200);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    return () => borderMorphRef.current?.kill();
  }, []);

  function loadMorphModule() {
    if (!morphModuleRef.current) {
      morphModuleRef.current = import("./MorphBorders");
    }
    return morphModuleRef.current;
  }

  async function runBorderTransition(prevHeldIds: ReadonlySet<string>, nextHeldIds: ReadonlySet<string>) {
    const mod = await loadMorphModule();
    if (!borderMorphRef.current) {
      borderMorphRef.current = new mod.BorderMorph();
    }

    const elements: ProvinceMorphElement[] = provinces.flatMap((province) => {
      const path = pathRefs.current.get(province.id);
      const heldOverlay = heldOverlayRefs.current.get(province.id);
      if (!path || !heldOverlay) return [];
      return [
        {
          id: province.id,
          path,
          heldOverlay,
          label: labelRefs.current.get(province.id) ?? null,
          d: province.d,
          heldBefore: prevHeldIds.has(province.id),
          heldAfter: nextHeldIds.has(province.id),
        },
      ];
    });

    borderMorphRef.current.transition({
      provinces: elements,
      eraLabelEl: eraLabelRef.current,
      reducedMotion,
    });
  }

  function swapToMain(slotIndex: number) {
    const nextEra = eras[eraOrder[slotIndex]];
    const nextHeldIds = new Set(provinces.filter((p) => isHeld(nextEra.year, p)).map((p) => p.id));
    const prevHeldIds = heldIds;

    setEraOrder((order) => {
      const next = [...order];
      const main = next[0];
      next[0] = next[slotIndex];
      next[slotIndex] = main;
      return next;
    });

    void runBorderTransition(prevHeldIds, nextHeldIds);
  }

  function goToScene(regionId: string) {
    requestSweep(() => router.push(`/scene/${regionId}`));
  }

  // Raw onClick + router.push doesn't get the prefetch-on-viewport
  // behaviour <Link> gives you for free — do it on hover instead, so
  // the RSC payload is usually already warm by the time someone clicks.
  // CloudSweep's hold is forgiving either way, but this is most of what
  // keeps it forgiving.
  function handleProvinceHover(regionId: string) {
    setHoveredId(regionId);
    router.prefetch(`/scene/${regionId}`);
  }

  function handleProvinceKeyDown(event: KeyboardEvent<SVGPathElement>, regionId: string) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      goToScene(regionId);
    }
  }

  const hovered = hoveredId ? (provinces.find((p) => p.id === hoveredId) ?? null) : null;
  const teaser = hovered
    ? `${hovered.latinName} — held ${formatYear(hovered.heldFrom)} to ${
        hovered.heldTo === null ? "at least 486 AD" : formatYear(hovered.heldTo)
      }`
    : "";

  return (
    <div className={styles.wrap}>
      <svg viewBox={`0 0 ${width} ${height}`} className={styles.svg} role="img" aria-label={`Roman Empire, ${mainEra.label}`}>
        <AtlasFilters />
        <rect x={0} y={0} width={width} height={height} fill="url(#parchmentBase)" filter="url(#paperGrain)" />

        <g filter="url(#inkEdges)">
          {physical.ocean.map((d, i) => (
            <path key={`ocean-${i}`} d={d} className={styles.ocean} />
          ))}
          {physical.lakes.map((d, i) => (
            <path key={`lake-${i}`} d={d} className={styles.lake} />
          ))}
          {physical.rivers.map((d, i) => (
            <path key={`river-${i}`} d={d} className={styles.river} />
          ))}
          {physical.coastline.map((d, i) => (
            <path key={`coast-${i}`} d={d} className={styles.coastline} />
          ))}
        </g>

        <g filter="url(#inkEdges)">
          {/* .provinceBase is *always* the faint "unheld" look (fill:none,
              stroke-opacity:0.25, constant) and owns all interactivity.
              It never animates fill-opacity/stroke-opacity itself — see
              AtlasMap.module.css's comment on why that used to force a
              full repaint of this whole filtered group, both here and in
              MorphBorders.ts. Whether a province currently *reads* as
              held is entirely the two overlays below. */}
          {provinces.map((province) => {
            const held = heldIds.has(province.id);
            return (
              <path
                key={province.id}
                ref={(el) => {
                  if (el) pathRefs.current.set(province.id, el);
                  else pathRefs.current.delete(province.id);
                }}
                d={province.d}
                className={[styles.provinceBase, held ? styles.provinceInteractive : ""].filter(Boolean).join(" ")}
                role={held ? "button" : undefined}
                tabIndex={held ? 0 : undefined}
                aria-label={held ? `${province.name} — open scene` : undefined}
                onMouseEnter={held ? () => handleProvinceHover(province.id) : undefined}
                onMouseLeave={held ? () => setHoveredId(null) : undefined}
                onClick={held ? () => goToScene(province.id) : undefined}
                onKeyDown={held ? (event) => handleProvinceKeyDown(event, province.id) : undefined}
              />
            );
          })}
          {/* Always mounted for all 24 provinces (like the labels below),
              not conditional on `held` — MorphBorders needs a stable ref
              to fade this in/out for gained/lost provinces, and an
              element that might not exist yet on the very render it's
              needed is exactly the kind of edge case worth not having. */}
          {provinces.map((province) => (
            <path
              key={`held-overlay-${province.id}`}
              ref={(el) => {
                if (el) heldOverlayRefs.current.set(province.id, el);
                else heldOverlayRefs.current.delete(province.id);
              }}
              d={province.d}
              data-held-overlay={province.id}
              className={[styles.heldOverlay, heldIds.has(province.id) ? styles.heldOverlayActive : ""].filter(Boolean).join(" ")}
              aria-hidden="true"
              pointerEvents="none"
            />
          ))}
          {/* Hover brightening — stacks on .heldOverlay, not .provinceBase
              (see AtlasMap.module.css's .hoverFill comment for the exact
              math). Same fix, same reason: constant own fill-opacity,
              only outer opacity toggles. */}
          {provinces.map((province) => (
            <path
              key={`hover-fill-${province.id}`}
              d={province.d}
              data-hover-fill={province.id}
              className={[styles.hoverFill, hoveredId === province.id ? styles.hoverFillActive : ""].filter(Boolean).join(" ")}
              aria-hidden="true"
              pointerEvents="none"
            />
          ))}
        </g>

        {provinces.map((province) => (
          <text
            key={`label-${province.id}`}
            ref={(el) => {
              if (el) labelRefs.current.set(province.id, el);
              else labelRefs.current.delete(province.id);
            }}
            x={province.labelX}
            y={province.labelY}
            textAnchor="middle"
            className={[styles.provinceLabel, heldIds.has(province.id) ? styles.labelHeld : styles.labelUnheld].join(" ")}
          >
            {province.name}
          </text>
        ))}

        {cities.map((city) => (
          <g key={city.id} transform={`translate(${city.x} ${city.y})`}>
            <circle r={2.5} className={styles.cityMark} />
            <text x={5} y={3} className={styles.cityLabel}>
              {city.latinName}
            </text>
          </g>
        ))}

        {seas.map((sea) => (
          <text
            key={sea.id}
            x={sea.x}
            y={sea.y}
            transform={`rotate(${sea.rotation} ${sea.x} ${sea.y})`}
            textAnchor="middle"
            className={styles.seaLabel}
          >
            {sea.text}
          </text>
        ))}

        <AtlasInsets
          width={width}
          height={height}
          physical={physical}
          provinces={provinces}
          eras={eras}
          eraOrder={eraOrder}
          onSelect={swapToMain}
        />
        <AtlasFrame width={width} height={height} eraLabel={mainEra.label} eraLabelRef={eraLabelRef} />
        <rect x={0} y={0} width={width} height={height} fill="url(#vignette)" pointerEvents="none" />
      </svg>

      <div className={styles.teaser} aria-live="polite">
        {teaser}
      </div>
    </div>
  );
}
