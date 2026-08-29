"use client";

// The interactive atlas SVG. Held regions are a pure function of the
// selected year (PRD §8.1) — there is no per-era snapshot state, just a
// `heldIds` set recomputed from `eraOrder[0]`'s year on every render.
// No content imports — everything arrives as props (engine/ hard rule).
import { useMemo, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { AtlasFilters } from "./AtlasFilters";
import { AtlasFrame } from "./AtlasFrame";
import { AtlasInsets } from "./AtlasInsets";
import { isHeld } from "./heldRegions";
import type { AtlasMapProps } from "./types";
import styles from "./AtlasMap.module.css";

function formatYear(year: number): string {
  return year < 0 ? `${-year} BC` : `${year} AD`;
}

export function AtlasMap({ width, height, physical, provinces, cities, seas, eras }: AtlasMapProps) {
  const router = useRouter();
  const [eraOrder, setEraOrder] = useState<number[]>(() => eras.map((_, i) => i));
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const mainEra = eras[eraOrder[0]];
  const heldIds = useMemo(
    () => new Set(provinces.filter((p) => isHeld(mainEra.year, p)).map((p) => p.id)),
    [provinces, mainEra.year],
  );

  function swapToMain(slotIndex: number) {
    setEraOrder((order) => {
      const next = [...order];
      const main = next[0];
      next[0] = next[slotIndex];
      next[slotIndex] = main;
      return next;
    });
  }

  function goToScene(regionId: string) {
    router.push(`/scene/${regionId}`);
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
          {provinces.map((province) => {
            const held = heldIds.has(province.id);
            return (
              <path
                key={province.id}
                d={province.d}
                className={[styles.province, held ? styles.held : styles.unheld, held && hoveredId === province.id ? styles.hovered : ""]
                  .filter(Boolean)
                  .join(" ")}
                role={held ? "button" : undefined}
                tabIndex={held ? 0 : undefined}
                aria-label={held ? `${province.name} — open scene` : undefined}
                onMouseEnter={held ? () => setHoveredId(province.id) : undefined}
                onMouseLeave={held ? () => setHoveredId(null) : undefined}
                onClick={held ? () => goToScene(province.id) : undefined}
                onKeyDown={held ? (event) => handleProvinceKeyDown(event, province.id) : undefined}
              />
            );
          })}
        </g>

        {provinces
          .filter((p) => heldIds.has(p.id))
          .map((p) => (
            <text key={`label-${p.id}`} x={p.labelX} y={p.labelY} textAnchor="middle" className={styles.provinceLabel}>
              {p.name}
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
        <AtlasFrame width={width} height={height} eraLabel={mainEra.label} />
        <rect x={0} y={0} width={width} height={height} fill="url(#vignette)" pointerEvents="none" />
      </svg>

      <div className={styles.teaser} aria-live="polite">
        {teaser}
      </div>
    </div>
  );
}
