import type { RefObject, KeyboardEvent } from "react";
import { AtlasFilters } from "./AtlasFilters";
import { AtlasFrame } from "./AtlasFrame";
import type { AtlasMapProps } from "./types";
import styles from "./AtlasMap.module.css";

interface AtlasCanvasProps extends Omit<AtlasMapProps, "eras"> {
  eraLabel: string;
  heldIds: ReadonlySet<string>;
  hoveredId: string | null;
  pathRefs: RefObject<Map<string, SVGPathElement>>;
  heldOverlayRefs: RefObject<Map<string, SVGPathElement>>;
  labelRefs: RefObject<Map<string, SVGTextElement>>;
  eraLabelRef: RefObject<SVGTextElement | null>;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  handleProvinceKeyDown: (event: KeyboardEvent<SVGPathElement>, id: string) => void;
}

export function AtlasCanvas({ width, height, physical, provinces, cities, seas, eraLabel, heldIds, hoveredId, pathRefs, heldOverlayRefs, labelRefs, eraLabelRef, onHover, onSelect, handleProvinceKeyDown }: AtlasCanvasProps) {
  return (
      <svg viewBox={`0 0 ${width} ${height}`} className={styles.svg} data-relief={Boolean(physical.reliefUrl)} role="group" aria-label={`Roman Empire, ${eraLabel}`}>
        <AtlasFilters />
        <rect x={0} y={0} width={width} height={height} fill="url(#parchmentBase)" />

        {physical.reliefUrl && <image href={physical.reliefUrl} x={0} y={0} width={width} height={height} preserveAspectRatio="none" aria-hidden="true" />}
        {physical.graticule && <path d={physical.graticule} className={styles.graticule} pointerEvents="none" aria-hidden="true" />}
        <g filter="url(#inkEdges)">
          {physical.ocean.map((d, i) => (
            <path key={`ocean-${i}`} d={d} className={physical.reliefUrl ? styles.reliefOcean : styles.ocean} />
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

        <rect x={0} y={0} width={width} height={height} filter="url(#paperGrain)" pointerEvents="none" />
        <g filter="url(#inkEdges)">
          {/* Keep paint properties constant inside this filtered group;
              held/hover animation belongs to the overlays' opacity. */}
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
                data-region-id={province.id}
                data-scene-status={province.scene ? "preview" : "coming-soon"}
                className={[styles.provinceBase, held ? styles.provinceInteractive : ""].filter(Boolean).join(" ")}
                role={held ? "button" : undefined}
                tabIndex={held ? 0 : undefined}
                aria-label={held ? `${province.name} — ${province.scene ? "open scene preview" : "coming soon"}` : undefined}
                onMouseEnter={held ? () => onHover(province.id) : undefined}
                onMouseLeave={held ? () => onHover(null) : undefined}
                onFocus={held ? () => onHover(province.id) : undefined}
                onBlur={held ? () => onHover(null) : undefined}
                onClick={held ? () => onSelect(province.id) : undefined}
                onKeyDown={held ? (event) => handleProvinceKeyDown(event, province.id) : undefined}
              />
            );
          })}
          {/* MorphBorders needs stable refs for gained/lost provinces. */}
          {provinces.map((province) => (
            <path
              key={`held-overlay-${province.id}`}
              ref={(el) => {
                if (el) heldOverlayRefs.current.set(province.id, el);
                else heldOverlayRefs.current.delete(province.id);
              }}
              d={province.d}
              data-held-overlay={province.id}
              className={[
                styles.heldOverlay,
                province.scene ? styles.previewOverlay : styles.comingSoonOverlay,
                heldIds.has(province.id) ? styles.heldOverlayActive : "",
              ].filter(Boolean).join(" ")}
              aria-hidden="true"
              pointerEvents="none"
            />
          ))}
          {/* Hover also animates outer opacity, never filtered paint. */}
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
            aria-hidden={!heldIds.has(province.id)}
            className={[styles.provinceLabel, heldIds.has(province.id) ? styles.labelHeld : styles.labelUnheld].join(" ")}
          >
            {province.name}
          </text>
        ))}

        {cities.map((city) => (
          <g key={city.id} transform={`translate(${city.x} ${city.y})`}>
            <circle r={2.5} className={styles.cityMark} />
            <text x={5} y={11} className={styles.cityLabel}>
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

        <AtlasFrame width={width} height={height} eraLabel={eraLabel} eraLabelRef={eraLabelRef} />
        <rect x={0} y={0} width={width} height={height} fill="url(#vignette)" pointerEvents="none" />
      </svg>
  );
}
