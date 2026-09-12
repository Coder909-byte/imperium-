// Composes PuppetActor and CrowdField into one thing ScenePlayer mounts
// and drives (PRD §3/§10, M6) — same split SceneEffects.ts already
// established for post/particles, kept separate so ScenePlayer.tsx
// stays React wiring, not engine orchestration.
//
// Eager, unlike M5's atmosphere split (CLAUDE.md's M6 design note):
// actors are structural beat content, not "arrives a beat late" polish
// — a legionary popping in after a beat's camera move has already
// settled would read as a bug. All rigs a region's beats might
// reference are resolved (rigLoader.loadRig + a shared per-rig texture
// cache) synchronously in the constructor.
//
// Reconciliation is deliberately the simple kind: applyBeat() destroys
// every actor from the PREVIOUS beat and builds the current beat's from
// scratch, rather than diffing and reusing instances across beats. A
// scene has at most 10 beats and actor construction only happens on a
// beat change (human-paced, never inside the per-frame tick), so the
// "no per-frame allocation" discipline this milestone cares about is
// untouched — only tick() itself is on the hot path, and it only ever
// mutates already-built PuppetActor/CrowdField instances.
import type { Container, Texture } from "pixi.js";
import type { FrameTicker } from "./deviceTier";
import { createCrowdMarchFrames } from "./layers/crowdTexture";
import { CrowdField, type CrowdUnitState } from "./layers/CrowdField";
import { PuppetActor } from "./layers/PuppetActor";
import { buildPartTextureCache } from "./layers/puppetTextures";
import { loadRig } from "./puppet/rigLoader";
import type { LoadedRig, RigDef } from "./puppet/types";
import type { SceneActor } from "./types";

const MAX_TICK_MS = 100; // same stall-clamp rationale as SceneEffects' MAX_TICK_SECONDS
const DEFAULT_CROWD_CYCLE_MS = 800;
// A distant crowd's scatter footprint, scaled by the actor entry's own
// `scale` — tuned by eye against the placeholder region, not measured
// (same honesty as HANDHELD_DRIFT/PARALLAX_STRENGTH_PX: expect this to
// move once real art gives a real sense of "distant" scale to judge against).
const CROWD_SPREAD_X = 260;
const CROWD_SPREAD_Y = 70;

interface RigEntry {
  rig: LoadedRig;
  textures: Map<string, Texture>;
}

export interface SceneActorsOptions {
  /** Sortable-by-zIndex container shared with planes (ScenePlayer sets
   *  each plane's container.zIndex to its depth too) — see
   *  content/schema.ts's actor `depth` comment for why actors need to
   *  interleave with planes rather than always sit on top of them. */
  layersContainer: Container;
  ticker: FrameTicker;
  rigDefs: readonly RigDef[];
}

export class SceneActors {
  private readonly ticker: FrameTicker;
  private readonly layersContainer: Container;
  private readonly rigs = new Map<string, RigEntry>();
  private readonly crowdFrames = createCrowdMarchFrames();
  private puppets: PuppetActor[] = [];
  private crowds: CrowdField[] = [];
  private reducedMotion = false;
  private lastTickTime = performance.now();
  private destroyed = false;

  private readonly tick = (): void => {
    const now = performance.now();
    const dtMs = Math.min(MAX_TICK_MS, now - this.lastTickTime);
    this.lastTickTime = now;
    for (const puppet of this.puppets) puppet.tick(dtMs);
    for (const crowd of this.crowds) crowd.tick(dtMs);
  };

  constructor(options: SceneActorsOptions) {
    this.ticker = options.ticker;
    this.layersContainer = options.layersContainer;
    for (const def of options.rigDefs) {
      const rig = loadRig(def);
      this.rigs.set(def.id, { rig, textures: buildPartTextureCache(rig) });
    }
    this.ticker.add(this.tick);
  }

  /** Rebuilds the live actor set for the current beat — see this file's
   *  header for why full rebuild-not-diff is the right amount of
   *  cleverness here. Reduced motion is read from whatever
   *  setReducedMotion() last set, not taken as a parameter — see
   *  ScenePlayer.tsx's call site for why threading it through here too
   *  would cause a bare reduced-motion toggle to rebuild every actor. */
  applyBeat(actors: readonly SceneActor[]): void {
    for (const puppet of this.puppets) puppet.destroy();
    for (const crowd of this.crowds) crowd.destroy();
    this.puppets = [];
    this.crowds = [];

    for (const actor of actors) {
      const entry = this.rigs.get(actor.rig);
      if (!entry) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(`SceneActors: beat references unknown rig "${actor.rig}" — skipped`);
        }
        continue;
      }

      if (actor.count > 1) {
        this.crowds.push(this.buildCrowd(actor, entry));
      } else {
        const puppet = new PuppetActor({
          rig: entry.rig,
          textures: entry.textures,
          clipId: actor.clip,
          x: actor.x,
          y: actor.y,
          scale: actor.scale,
          flip: actor.flip,
          phaseMs: actor.phase,
          reducedMotion: this.reducedMotion,
        });
        puppet.container.zIndex = actor.depth;
        this.layersContainer.addChild(puppet.container);
        this.puppets.push(puppet);
      }
    }
  }

  private buildCrowd(actor: SceneActor, entry: RigEntry): CrowdField {
    const cycleMs = entry.rig.clips.get(actor.clip)?.durationMs ?? DEFAULT_CROWD_CYCLE_MS;
    const spreadX = CROWD_SPREAD_X * actor.scale;
    const spreadY = CROWD_SPREAD_Y * actor.scale;
    const spawn = (rand: () => number): CrowdUnitState => ({
      x: actor.x + (rand() - 0.5) * 2 * spreadX,
      y: actor.y + (rand() - 0.5) * 2 * spreadY,
      scale: actor.scale * (0.85 + rand() * 0.3),
      // Seeded, per-unit, NOT derived from the unit's index — a
      // `phase = index / count` ramp reads as a Mexican wave rippling
      // through the crowd rather than independently-marching units.
      phaseMs: rand() * cycleMs,
    });
    const crowd = new CrowdField({ frames: this.crowdFrames, count: actor.count, cycleMs, flip: actor.flip, spawn });
    crowd.setReducedMotion(this.reducedMotion);
    crowd.container.zIndex = actor.depth;
    this.layersContainer.addChild(crowd.container);
    return crowd;
  }

  setReducedMotion(reducedMotion: boolean): void {
    if (reducedMotion === this.reducedMotion) return;
    this.reducedMotion = reducedMotion;
    for (const puppet of this.puppets) puppet.setReducedMotion(reducedMotion);
    for (const crowd of this.crowds) crowd.setReducedMotion(reducedMotion);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.ticker.remove(this.tick);
    for (const puppet of this.puppets) puppet.destroy();
    for (const crowd of this.crowds) crowd.destroy();
    this.puppets = [];
    this.crowds = [];
    // Part/crowd textures are tiny procedural canvases (like M5's
    // particle textures) — left for SceneRenderer's whole-context
    // `removeView: true` teardown to reclaim rather than destroyed
    // individually here, same precedent ParticleField.destroy() set.
  }
}
