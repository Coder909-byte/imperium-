import { BeatSources } from "./BeatSources";
import type { SceneBeat, SceneRegion } from "./types";
import styles from "./ScenePlayer.module.css";

interface SceneCaptionsProps {
  region: SceneRegion;
  beat: SceneBeat;
  index: number;
  autoplay: boolean;
  audio: { muted: boolean; failed: boolean; available: boolean; toggleMute: (event: { isTrusted: boolean }) => void };
  previous: () => void;
  next: () => void;
  jumpTo: (index: number) => void;
  toggleAutoplay: () => void;
}

export function SceneCaptions({ region, beat, index: activeIndex, autoplay, audio, previous, next, jumpTo, toggleAutoplay }: SceneCaptionsProps) {
  return (
      <div className={styles.bottomBar}>
        <div className={styles.captionBlock} aria-live="polite">
          <p className={styles.eyebrow}>{beat.year}</p>
          <h2 className={styles.headline}>{beat.headline}</h2>
          <p className={styles.body}>{beat.body}</p>
        </div>

        <BeatSources key={beat.id} sources={beat.sources} />

        <div className={styles.controls}>
          <button
            type="button"
            className={styles.navButton}
            onClick={previous}
            disabled={activeIndex === 0}
            aria-label="Previous beat"
          >
            ‹
          </button>

          <div className={styles.pips} role="tablist" aria-label="Beats">
            {region.beats.map((b, index) => (
              <button
                key={b.id}
                type="button"
                className={styles.pip}
                role="tab"
                aria-current={index === activeIndex}
                aria-label={`Go to beat ${index + 1}: ${b.headline}`}
                onClick={() => jumpTo(index)}
              />
            ))}
          </div>

          <button
            type="button"
            className={styles.navButton}
            onClick={next}
            disabled={activeIndex === region.beats.length - 1}
            aria-label="Next beat"
          >
            ›
          </button>

          <button
            type="button"
            className={styles.autoplayButton}
            aria-pressed={autoplay}
            onClick={toggleAutoplay}
          >
            {autoplay ? "⏸ Autoplay" : "▶ Autoplay"}
          </button>
          <button type="button" className={styles.autoplayButton} aria-pressed={audio.muted} onClick={audio.toggleMute}>
            {audio.muted ? "Unmute" : "Mute"}
          </button>
          {!audio.available && <span className={styles.sources}>Audio pending</span>}
          {audio.failed && <span role="status" className={styles.sources}>Audio unavailable. Toggle sound to retry.</span>}
        </div>
      </div>
  );
}
