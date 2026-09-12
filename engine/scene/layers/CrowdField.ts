// Distant crowd as instanced quads on a shared 4-frame march texture
// (PRD §3/§10, M6) — never individual rigs, so 500+ units stay cheap.
// Backed by a Pixi ParticleContainer, the same "thousands of particles
// at great speed" container M5's particles/ParticleField.ts already
// established the discipline for; `dynamicProperties.uvs` is the one
// addition, letting each unit's texture (one of the 4 march frames)
// change per frame while `position`/`vertex` (scale, for per-unit size
// variety) still update the same way M5's particles do.
//
// Construct once, mutate: the container and its 4 frames are built in
// the constructor and never rebuilt; only per-unit state changes after.
//
// Needs a real WebGL-capable renderer to construct a ParticleContainer
// (same constraint ParticleField.ts's own header already documents) —
// not unit-tested directly for that reason; verified in
// /dev/scene-lab (a real screenshot showed 8 units in independent
// march-cycle poses, scattered rather than gridded) and in e2e.
import { Particle, ParticleContainer, type Texture } from "pixi.js";

export interface CrowdUnitState {
  x: number;
  y: number;
  scale: number;
  /** Per-unit offset into the march cycle, ms — see SceneActors.ts for
   *  why this must come from a seeded RNG, not an instance's index (a
   *  linear phase-per-index produces a visible "wave" rippling through
   *  the crowd instead of it reading as independently-marching units). */
  phaseMs: number;
}

export interface CrowdFieldOptions {
  /** The 4-frame march cycle (crowdTexture.ts) — shared across every
   *  CrowdField instance, not owned or destroyed by this class. */
  frames: Texture[];
  count: number;
  cycleMs: number;
  flip: boolean;
  spawn: (rand: () => number, index: number) => CrowdUnitState;
  /** Testing/determinism seam — defaults to Math.random, same
   *  convention as ParticleField. */
  rand?: () => number;
}

interface Slot {
  particle: Particle;
  state: CrowdUnitState;
  frameIndex: number;
}

export class CrowdField {
  readonly container: ParticleContainer;
  private readonly frames: Texture[];
  private readonly cycleMs: number;
  private readonly flip: boolean;
  private readonly slots: Slot[] = [];
  private elapsedMs = 0;
  private reducedMotion = false;

  constructor(options: CrowdFieldOptions) {
    this.frames = options.frames;
    this.cycleMs = options.cycleMs;
    this.flip = options.flip;
    const rand = options.rand ?? Math.random;

    this.container = new ParticleContainer({
      texture: this.frames[0],
      dynamicProperties: { position: true, rotation: false, vertex: true, uvs: true, color: false },
    });

    for (let i = 0; i < options.count; i++) {
      const state = options.spawn(rand, i);
      const particle = new Particle({ texture: this.frames[0], x: state.x, y: state.y, scaleX: this.flip ? -state.scale : state.scale, scaleY: state.scale, anchorX: 0.5, anchorY: 1 });
      this.container.addParticle(particle);
      this.slots.push({ particle, state, frameIndex: 0 });
    }
  }

  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
    if (reduced) {
      for (const slot of this.slots) {
        if (slot.frameIndex !== 0) {
          slot.frameIndex = 0;
          slot.particle.texture = this.frames[0];
        }
      }
    }
  }

  tick(dtMs: number): void {
    if (this.reducedMotion) return;
    this.elapsedMs += dtMs;
    for (const slot of this.slots) {
      const local = (this.elapsedMs + slot.state.phaseMs) % this.cycleMs;
      const wrapped = local < 0 ? local + this.cycleMs : local;
      const frameIndex = Math.min(this.frames.length - 1, Math.floor((wrapped / this.cycleMs) * this.frames.length));
      if (frameIndex !== slot.frameIndex) {
        slot.frameIndex = frameIndex;
        slot.particle.texture = this.frames[frameIndex];
      }
    }
  }

  destroy(): void {
    // Frames are the caller's shared resource — never destroyed here.
    // Same rationale as ParticleField.destroy(): a ParticleContainer's
    // GL pipe caches a persistent shader binding to its texture, so
    // destroying it before the whole renderer tears down logs a
    // "destroyed while still bound to a shader" warning even when
    // nothing else references it — left for SceneRenderer's full
    // context teardown to reclaim instead.
    this.container.destroy({ children: true, texture: false, textureSource: false });
  }
}
