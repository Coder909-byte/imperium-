import type { Era, PhysicalLayers, ProjectedProvince } from "./types";
import { isHeld } from "./heldRegions";
import styles from "./AtlasMap.module.css";

// Three corner inset mini-maps. They *are* the era switcher (PRD §8.1) —
// click one and it swaps with the main map. Each reuses the main map's
// already-projected paths (same viewBox, smaller <svg> box), so no
// re-projection happens per inset.

const INSET_SIZE = 130;
const INSET_MARGIN = 30;

interface Slot {
  key: string;
  x: number;
  y: number;
}

function slotsFor(width: number, height: number): Slot[] {
  return [
    { key: "top-left", x: INSET_MARGIN, y: INSET_MARGIN + 70 },
    { key: "top-right", x: width - INSET_MARGIN - INSET_SIZE, y: INSET_MARGIN + 70 },
    { key: "bottom-left", x: INSET_MARGIN, y: height - INSET_MARGIN - INSET_SIZE },
  ];
}

interface AtlasInsetsProps {
  width: number;
  height: number;
  physical: PhysicalLayers;
  provinces: ProjectedProvince[];
  eras: Era[];
  eraOrder: number[]; // eraOrder[0] = main; eraOrder[1..3] = these three slots
  onSelect: (slotIndex: number) => void;
}

function MiniMap({
  slot,
  era,
  physical,
  provinces,
  width,
  height,
  onSelect,
}: {
  slot: Slot;
  era: Era;
  physical: PhysicalLayers;
  provinces: ProjectedProvince[];
  width: number;
  height: number;
  onSelect: () => void;
}) {
  const heldIds = new Set(provinces.filter((p) => isHeld(era.year, p)).map((p) => p.id));

  return (
    <g
      className={styles.inset}
      role="button"
      tabIndex={0}
      aria-label={`Switch main map to ${era.label}`}
      transform={`translate(${slot.x} ${slot.y})`}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <svg width={INSET_SIZE} height={INSET_SIZE} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid slice">
        <rect x={0} y={0} width={width} height={height} fill="url(#parchmentBase)" />
        {physical.ocean.map((d, i) => (
          <path key={`o${i}`} d={d} className={styles.ocean} />
        ))}
        {physical.coastline.map((d, i) => (
          <path key={`c${i}`} d={d} className={styles.coastline} strokeWidth={1} />
        ))}
        {provinces.map((province) => (
          <path
            key={province.id}
            d={province.d}
            className={heldIds.has(province.id) ? styles.insetProvinceHeld : styles.insetProvinceUnheld}
          />
        ))}
      </svg>
      <rect x={0} y={0} width={INSET_SIZE} height={INSET_SIZE} className={styles.insetFrame} />
      <text x={INSET_SIZE / 2} y={INSET_SIZE + 16} textAnchor="middle" className={styles.insetLabel}>
        {era.label}
      </text>
    </g>
  );
}

export function AtlasInsets({ width, height, physical, provinces, eras, eraOrder, onSelect }: AtlasInsetsProps) {
  const slots = slotsFor(width, height);

  return (
    <g className={styles.insets}>
      {slots.map((slot, i) => {
        const slotIndex = i + 1; // eraOrder[0] is the main map
        const era = eras[eraOrder[slotIndex]];
        return (
          <MiniMap
            key={slot.key}
            slot={slot}
            era={era}
            physical={physical}
            provinces={provinces}
            width={width}
            height={height}
            onSelect={() => onSelect(slotIndex)}
          />
        );
      })}
    </g>
  );
}
