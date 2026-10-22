import type { ProjectedProvince } from "./types";
import styles from "./AtlasMap.module.css";

export function AtlasSceneCatalog({
  provinces,
  onSelect,
}: {
  provinces: readonly ProjectedProvince[];
  onSelect: (regionId: string) => void;
}) {
  const previews = provinces.filter((province) => province.scene !== null);

  return (
    <section className={styles.catalog} aria-label="Available scene previews">
      <div>
        <h1 className={styles.catalogTitle}>Choose a campaign</h1>
        <p className={styles.catalogIntro}>
          {previews.length ? "Explore a scene preview, or choose a province on the period map." : "Campaigns are coming soon."}
        </p>
      </div>
      <div className={styles.previewList}>
        {previews.map((province) => (
          <button
            type="button"
            key={province.id}
            className={styles.previewButton}
            onClick={() => onSelect(province.id)}
            aria-label={`Open ${province.name} scene preview — ${province.scene?.year}`}
          >
            <span>{province.name}</span>
            <span className={styles.previewDetail}>
              {province.scene?.year} · {province.scene?.beatCount} beats · Preview artwork
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
