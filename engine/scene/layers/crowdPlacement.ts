import type { SceneActor } from "../types";
import type { CrowdUnitState } from "./CrowdField";

/** Adjacent formations may share one particle draw without changing
 * their unit order or crossing a puppet/plane-depth boundary. */
export function batchAdjacentActors(actors: readonly SceneActor[]): SceneActor[][] {
  const batches: SceneActor[][] = [];
  for (const actor of actors) {
    const batch = batches.at(-1);
    const previous = batch?.[0];
    if (batch && previous && actor.count > 1 && previous.count > 1
      && actor.rig === previous.rig && actor.clip === previous.clip
      && actor.flip === previous.flip && actor.depth === previous.depth) batch.push(actor);
    else batches.push([actor]);
  }
  return batches;
}

/** Formations preserve rows while leaving individuals slightly uneven.
 * Phases come from independent random samples, never the row/column. */
export function placeCrowdUnit(actor: SceneActor, index: number, rand: () => number, cycleMs: number, textureScale = 1): CrowdUnitState {
  const formation = actor.formation;
  const columns = formation ? Math.min(actor.count, formation.columns) : 1;
  const rows = Math.ceil(actor.count / columns);
  const x = formation
    ? (index % columns - (columns - 1) / 2 + (rand() - 0.5) * formation.jitter) * formation.spacing[0]
    : (rand() - 0.5) * 520;
  const y = formation
    ? (Math.floor(index / columns) - (rows - 1) / 2 + (rand() - 0.5) * formation.jitter) * formation.spacing[1]
    : (rand() - 0.5) * 140;
  return {
    x: actor.x + x * actor.scale,
    y: actor.y + y * actor.scale,
    scale: actor.scale * textureScale * (0.9 + rand() * 0.2),
    phaseMs: rand() * cycleMs,
  };
}
