// Shared shapes for the particle system (PRD §4/§10, M5). Plain data —
// no Pixi imports here, so emitterConfigs.ts's spawn/update math stays
// unit-testable without a renderer, same split engine/scene/types.ts
// already draws for content shapes vs. the classes that render them.

/** Beat.fx values that are particle emitters — excludes 'shake' (camera-level,
 *  see Camera.ts) and 'flash' (unrendered this milestone, see types.ts). */
export type ParticleFxKind = "dust" | "smoke" | "embers" | "rain" | "fire" | "arrow_volley";

export function isParticleFxKind(value: string): value is ParticleFxKind {
  return value === "dust" || value === "smoke" || value === "embers" || value === "rain" || value === "fire" || value === "arrow_volley";
}

/** Which procedural texture (particles/textures.ts) an emitter's particles
 *  render with. Two shapes cover all six emitters — a soft dot for
 *  ambient/glow particles, a streak for fast-moving directional ones —
 *  variety comes from each config's own scale/tint/motion, not from a
 *  bespoke texture per fx kind (no raster assets, procedural only). */
export type ParticleTextureKind = "soft-dot" | "streak";

export interface EmitterBounds {
  width: number;
  height: number;
}

/** One live particle's simulation state. `tint` is a 0xRRGGBB packed
 *  colour (not a Pixi type) so this file has zero Pixi dependency. */
export interface ParticleState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  rotation: number;
  scale: number;
  alpha: number;
  tint: number;
}

export interface EmitterConfig {
  id: ParticleFxKind;
  /** Particle count at high tier / full motion — halved on low tier, capped under reduced motion. */
  baseCount: number;
  textureKind: ParticleTextureKind;
  /** Pure given `rand` (returns a uniform [0,1)) — never calls Math.random()
   *  directly, so a fixed rand sequence makes this fully deterministic to test. */
  spawn: (bounds: EmitterBounds, rand: () => number) => ParticleState;
  /** Mutates `state` in place for one tick, including advancing `age`.
   *  Pure otherwise — no I/O, no randomness. The caller respawns once `age >= life`. */
  update: (state: ParticleState, dtSeconds: number, bounds: EmitterBounds) => void;
}
