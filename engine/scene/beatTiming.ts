import { computeAutoplayDwellMs } from "./dwell";
import type { SceneBeat } from "./types";

// Layer reveals are independent of a slow camera move. Coupling them
// made Gallia's siege walls spend almost the entire beat translucent.
export const LAYER_REVEAL_MS = 600;

export function cameraForBeat(beat: Pick<SceneBeat, "body" | "camera">): SceneBeat["camera"] {
  return {
    ...beat.camera,
    durationMs: beat.camera.durationMode === "dwell"
      ? Math.max(beat.camera.durationMs, computeAutoplayDwellMs(beat.body))
      : beat.camera.durationMs,
  };
}
