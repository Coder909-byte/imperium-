import type { SceneBeat } from "./types";
import styles from "./ScenePlayer.module.css";

export function BeatSources({ sources = [] }: { sources: SceneBeat["sources"] }) {
  return (
    <details className={styles.sources}>
      <summary>Sources ({sources.length})</summary>
      {sources.length === 0 ? <p>No sources supplied for this beat.</p> : (
        <ul>
          {sources.map((source, index) => (
            <li key={`${source.label}:${index}`}>
              {source.url ? <a href={source.url} target="_blank" rel="noreferrer">{source.label}</a> : source.label}
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}
