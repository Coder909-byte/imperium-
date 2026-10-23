import type { Era, PhysicalLayers, ProjectedProvince } from "./types";
import { isHeld } from "./heldRegions";
import mapStyles from "./AtlasMap.module.css";
import styles from "./AtlasWorkspace.module.css";

interface AtlasInsetsProps {
  width: number;
  height: number;
  physical: PhysicalLayers;
  provinces: ProjectedProvince[];
  eras: Era[];
  eraOrder: number[];
  onSelect: (slotIndex: number) => void;
}

export function AtlasInsets({ width, height, physical, provinces, eras, eraOrder, onSelect }: AtlasInsetsProps) {
  return (
    <div className={styles.insets}>
      {eraOrder.slice(1).map((eraIndex, index) => {
        const era = eras[eraIndex];
        return (
          <button type="button" key={index} className={styles.inset} aria-label={`Switch main map to ${era.label}`} onClick={() => onSelect(index + 1)}>
            <svg viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className={styles.insetMap}>
              <rect width={width} height={height} fill="#eee6d0" />
              {physical.reliefUrl && <image href={physical.reliefUrl} width={width} height={height} opacity={.65} />}
              {physical.ocean.map((d, i) => <path key={i} d={d} className={physical.reliefUrl ? mapStyles.reliefOcean : mapStyles.ocean} />)}
              {physical.coastline.map((d, i) => <path key={i} d={d} className={mapStyles.coastline} />)}
              {provinces.filter(province => isHeld(era.year, province)).map(province => <path key={province.id} d={province.d} className={mapStyles.insetProvinceHeld} />)}
            </svg>
            <span className={styles.insetLabel}>{era.label}<span aria-hidden="true">↗</span></span>
          </button>
        );
      })}
    </div>
  );
}
