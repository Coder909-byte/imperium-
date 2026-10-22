import playerStyles from "@/engine/scene/ScenePlayer.module.css";
import styles from "./NotYetWritten.module.css";
import { BackToAtlasButton } from "./BackToAtlasButton";

export function NotYetWritten({ name, latinName }: { name: string; latinName: string | null }) {
  return (
    <div className={styles.shell} data-testid="not-yet-written">
      <div className={styles.center}>
        <div className={playerStyles.captionBlock}>
          <p className={playerStyles.eyebrow}>Coming soon</p>
          <h1 className={playerStyles.headline}>{name}</h1>
          {latinName ? <p className={styles.latinName}>{latinName}</p> : null}
          <p className={playerStyles.body}>
            This province doesn&apos;t have a scene yet. Return to the map to explore the available scene previews.
          </p>
          <div className={styles.actions}>
            <BackToAtlasButton />
          </div>
        </div>
      </div>
    </div>
  );
}
