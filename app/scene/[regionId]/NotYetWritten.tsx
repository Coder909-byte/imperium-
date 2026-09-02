// The state a province without authored content/regions/{id}.json gets
// (22 of 24, currently) — inside the same scene shell the real player
// uses, not a bare fallback page. Region name, Latin name, an honest
// "in progress" line, and a working return to the atlas.
import playerStyles from "@/engine/scene/ScenePlayer.module.css";
import styles from "./NotYetWritten.module.css";
import { BackToAtlasButton } from "./BackToAtlasButton";

export function NotYetWritten({ name, latinName }: { name: string; latinName: string | null }) {
  return (
    <div className={playerStyles.player} data-testid="not-yet-written">
      <div className={playerStyles.topBar} />
      <div className={styles.center}>
        <div className={playerStyles.captionBlock}>
          <p className={playerStyles.eyebrow}>Campaign in progress</p>
          <h1 className={playerStyles.headline}>{name}</h1>
          {latinName ? <p className={styles.latinName}>{latinName}</p> : null}
          <p className={playerStyles.body}>
            This campaign hasn&apos;t been written yet. Come back once it has, or return to the map to pick a
            province that&apos;s ready.
          </p>
          <div className={styles.actions}>
            <BackToAtlasButton />
          </div>
        </div>
      </div>
    </div>
  );
}
