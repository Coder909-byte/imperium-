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
import { bakeCrowdFrames, type BakedCrowdFrames } from "./layers/bakeCrowdFrames";
import { CrowdField } from "./layers/CrowdField";
import { batchAdjacentActors, placeCrowdUnit } from "./layers/crowdPlacement";
import { mulberry32 } from "./prng";
import { PuppetActor } from "./layers/PuppetActor";
import { buildPartTextureCache } from "./layers/puppetTextures";
import { loadRig } from "./puppet/rigLoader";
import type { LoadedRig, RigDef } from "./puppet/types";
import type { SceneActor } from "./types";

const MAX_TICK_MS = 100; // same stall-clamp rationale as SceneEffects' MAX_TICK_SECONDS
const DEFAULT_CROWD_CYCLE_MS = 800;

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
  textures?: ReadonlyMap<string, Texture>;
  /** Actor JSON is authored against a 1280px-wide scene. */
  placementScale?: number;
}

export class SceneActors {
  private readonly ticker: FrameTicker;
  private readonly layersContainer: Container;
  private readonly rigs = new Map<string, RigEntry>();
  private readonly crowdFrames = createCrowdMarchFrames();
  private readonly paintedCrowds = new Map<string, BakedCrowdFrames>();
  private puppets: PuppetActor[] = [];
  private crowds: CrowdField[] = [];
  private reducedMotion = false;
  private lastTickTime = performance.now();
  private destroyed = false;
  private readonly placementScale: number;

  private readonly tick = (): void => {
    const now = performance.now();
    const dtMs = Math.min(MAX_TICK_MS, now - this.lastTickTime);
    this.lastTickTime = now;
    for (const puppet of this.puppets) puppet.tick(dtMs);
    for (const crowd of this.crowds) crowd.tick(dtMs);
  };

  constructor(options: SceneActorsOptions) {
    this.placementScale = options.placementScale ?? 1;
    this.ticker = options.ticker;
    this.layersContainer = options.layersContainer;
    for (const def of options.rigDefs) {
      const rig = loadRig(def);
      this.rigs.set(def.id, { rig, textures: buildPartTextureCache(rig, options.textures) });
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

    const placed = actors.map((actor) => ({ ...actor, x: actor.x * this.placementScale, y: actor.y * this.placementScale, scale: actor.scale * this.placementScale }));
    for (const batch of batchAdjacentActors(placed)) {
      const actor = batch[0];
      const entry = this.rigs.get(actor.rig);
      if (!entry) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(`SceneActors: beat references unknown rig "${actor.rig}" — skipped`);
        }
        continue;
      }

      if (actor.count > 1) {
        this.crowds.push(this.buildCrowd(batch, entry));
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

  private buildCrowd(actors: readonly SceneActor[], entry: RigEntry): CrowdField {
    const actor = actors[0];
    const cycleMs = entry.rig.clips.get(actor.clip)?.durationMs ?? DEFAULT_CROWD_CYCLE_MS;
    const painted = entry.rig.parts.every((part) => part.texture.startsWith("/assets/"));
    const key = `${actor.rig}:${actor.clip}`;
    let atlas = this.paintedCrowds.get(key);
    if (painted && !atlas) {
      atlas = bakeCrowdFrames(entry.rig, entry.textures, actor.clip);
      this.paintedCrowds.set(key, atlas);
    }
    const units = actors.flatMap((formation) => {
      const seed = [...`${formation.rig}:${formation.x}:${formation.y}:${formation.phase}`].reduce((value, character) => Math.imul(value, 31) + character.charCodeAt(0) | 0, 17);
      const rand = mulberry32(seed);
      return Array.from({ length: formation.count }, (_, index) => placeCrowdUnit(formation, index, rand, cycleMs, atlas?.scale));
    });
    const spawn = (_rand: () => number, index: number) => units[index];
    const crowd = new CrowdField({ frames: atlas?.frames ?? this.crowdFrames, anchorX: atlas?.anchorX, anchorY: atlas?.anchorY, count: units.length, cycleMs, flip: actor.flip, spawn });
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
    // ParticleContainer retains shader bindings until renderer teardown.
    // Release atlas references here; its context teardown owns GPU disposal.
    this.paintedCrowds.clear();
  }
}
