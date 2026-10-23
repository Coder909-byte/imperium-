"use client";

// Historical interactivity updates immediately; only appearance waits
// for the lazy MorphBorders animation. Scene availability arrives from
// app/ as props and never changes which provinces the selected era holds.
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { AtlasCanvas } from "./AtlasCanvas";
import { AtlasViewport } from "./AtlasViewport";
import { AtlasInsets } from "./AtlasInsets";
import { AtlasSceneCatalog } from "./AtlasSceneCatalog";
import { isHeld } from "./heldRegions";
import type { AtlasMapProps } from "./types";
import type { BorderMorph, ProvinceMorphElement } from "./MorphBorders";
import { useTransitionStore } from "@/engine/transition/transitionStore";
import styles from "./AtlasWorkspace.module.css";

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
    setHoveredId(null);

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
    ? `${hovered.latinName} — ${hovered.scene ? `Scene preview: ${hovered.scene.year}` : "Coming soon"} · held ${formatYear(hovered.heldFrom)} to ${
        hovered.heldTo === null ? "at least 486 AD" : formatYear(hovered.heldTo)
      }`
    : "Choose a province to see its scene status.";

  return (
    <div className={styles.wrap}>
      <div className={styles.workspace}>
        <div className={styles.mapColumn}>
          <AtlasViewport>
            <AtlasCanvas
              width={width} height={height} physical={physical}
              provinces={provinces} cities={cities} seas={seas}
              eraLabel={mainEra.label} heldIds={heldIds} hoveredId={hoveredId}
              pathRefs={pathRefs} heldOverlayRefs={heldOverlayRefs}
              labelRefs={labelRefs} eraLabelRef={eraLabelRef}
              onHover={(id) => id ? handleProvinceHover(id) : setHoveredId(null)}
              onSelect={goToScene} handleProvinceKeyDown={handleProvinceKeyDown}
            />
          </AtlasViewport>
          <div className={styles.legend} role="group" aria-label="Scene status legend">
            <span><i className={styles.previewKey} aria-hidden="true" />Scene preview</span>
            <span><i className={styles.comingSoonKey} aria-hidden="true" />Coming soon</span>
          </div>
          <div className={styles.teaser} role="status" aria-label="Province details" aria-live="polite">{teaser}</div>
        </div>
        <aside className={styles.marginalia} aria-label="Atlas guide">
          <div className={styles.periodHeading}>
            <p aria-live="polite" aria-atomic="true">Selected period: {mainEra.label}</p>
            <span>Choose another era</span>
          </div>
          <AtlasInsets
            width={width} height={height} physical={physical}
            provinces={provinces} eras={eras} eraOrder={eraOrder} onSelect={swapToMain}
          />
          <AtlasSceneCatalog provinces={provinces} onSelect={goToScene} />
        </aside>
      </div>
    </div>
  );
}
