import type { ProjectedProvince } from "./types";
import styles from "./AtlasWorkspace.module.css";

export function AtlasSceneCatalog({
  provinces,
  onSelect,
}: {
  provinces: readonly ProjectedProvince[];
  onSelect: (regionId: string) => void;
}) {
  const previews = provinces.filter((province) => province.scene !== null);

  return (
    <section id="stories" className={styles.catalog} aria-label="Available scene previews">
      <div>
        <p className={styles.catalogEyebrow}>Beyond the map</p>
        <h2 className={styles.catalogTitle}>Step into a story.</h2>
        <p className={styles.catalogIntro}>
          {previews.length ? "Explore the available stories and work-in-progress previews. More campaigns are being written." : "Campaigns are coming soon."}
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
            <span>{province.name}<span aria-hidden="true"> →</span></span>
            <span className={styles.previewDetail}>
              {province.scene?.year} · {province.scene?.beatCount} beats · Preview artwork
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
