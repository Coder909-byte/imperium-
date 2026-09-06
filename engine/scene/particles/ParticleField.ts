// Runtime particle pool for one emitter config (PRD §4/§10, M5), backed
// by a Pixi ParticleContainer for the "1000s of particles at great
// speed" cost profile CLAUDE.md's rendering rules call for — though our
// counts here are small (tens, not thousands), it's the same container
// type distant crowds (M6) will eventually share the discipline with.
//
// Needs a real WebGL-capable renderer to construct (ParticleContainer,
// like ColorMatrixFilter/BlurFilter — see ParallaxPlane.test.ts's note
// on the same constraint), so this class isn't unit-tested directly;
// its actual behaviour lives in EmitterConfig's pure spawn/update
// functions (emitterConfigs.test.ts), verified at runtime in e2e/
// dev-scene-lab. Construct once, mutate: the container and its texture
// are set up in the constructor and never rebuilt — only particle count
// and per-particle state change afterward.
//
// Each field generates its own procedural texture rather than sharing
// one across fields of the same textureKind — two tiny canvas draws per
// field is free, and it keeps each field's lifecycle self-contained.
//
// destroy() deliberately passes `texture: false` — ParticleContainer's
// dedicated GL render pipe caches a persistent per-container shader
// binding to its texture (`GlParticleContainerAdaptor`: `shader.
// resources.uTexture = container.texture._source`, built once and
// reused across frames, unlike a plain Sprite's per-frame batching).
// Destroying the texture here, before SceneRenderer.destroy() tears
// down the whole renderer (and every pipe's cache with it), logs Pixi's
// "[BindGroup] ... was destroyed while still bound to a shader" even
// though nothing else holds this field's own private texture — found by
// actually watching the browser console in e2e, not reasoned about in
// the abstract, exactly the discipline CLAUDE.md's M4 entry already
// used for its own Pixi lifecycle bugs. Leaving the texture undestroyed
// here is safe: it's a couple of tiny (64x64 / 192x32) canvases, and the
// real GPU memory is freed regardless the moment the WebGL context
// itself is destroyed (`removeView: true` in SceneRenderer's own
// DESTROY_OPTIONS) — a context teardown reclaims everything it owns,
// JS-side destroy() calls or not.
// The GL/GPU/Canvas particle render pipes are registered in
// SceneRenderer.ts, before Application is constructed — see that file's
// header for why it has to happen there and not here.
import { Particle, ParticleContainer, type Texture } from "pixi.js";
import { spawnAtRandomAge } from "./emitterConfigs";
import { createParticleTexture } from "./textures";
import type { EmitterBounds, EmitterConfig, ParticleState } from "./types";

interface Slot {
  particle: Particle;
  state: ParticleState;
}

export interface ParticleFieldOptions {
  config: EmitterConfig;
  /** Initial pool size — see engine/scene/deviceTier.ts's resolveParticleCount. */
  count: number;
  getBounds: () => EmitterBounds;
  /** Testing/determinism seam — defaults to Math.random. */
  rand?: () => number;
}

export class ParticleField {
  readonly container: ParticleContainer;
  private readonly config: EmitterConfig;
  private readonly texture: Texture;
  private readonly getBounds: () => EmitterBounds;
  private readonly rand: () => number;
  private slots: Slot[] = [];

  constructor(options: ParticleFieldOptions) {
    this.config = options.config;
    this.texture = createParticleTexture(options.config.textureKind);
    this.getBounds = options.getBounds;
    this.rand = options.rand ?? Math.random;

    // position: motion: always. rotation/vertex(scale)/color(tint+alpha):
    // every emitter here animates at least one of these over a
    // particle's lifetime (fade, growth, or a fixed-but-varied spawn
    // rotation), so all four are dynamic — the alternative is Pixi
    // silently not re-uploading a property this file is actively
    // mutating every frame.
    this.container = new ParticleContainer({
      texture: this.texture,
      dynamicProperties: { position: true, rotation: true, vertex: true, color: true },
    });

    this.setCount(options.count, /* staggerInitialAge */ true);
  }

  /** Grows or shrinks the live pool to `count` — how tier/reduced-motion
   *  degradation actually takes effect (see resolveParticleCount). Never
   *  rebuilds the container itself, only adds/removes particles in it. */
  setCount(count: number, staggerInitialAge = false): void {
    while (this.slots.length < count) {
      const bounds = this.getBounds();
      const state = staggerInitialAge ? spawnAtRandomAge(this.config, bounds, this.rand) : this.config.spawn(bounds, this.rand);
      const particle = new Particle({ texture: this.texture, anchorX: 0.5, anchorY: 0.5 });
      this.applyState(state, particle);
      this.container.addParticle(particle);
      this.slots.push({ particle, state });
    }
    while (this.slots.length > count) {
      const slot = this.slots.pop();
      if (slot) this.container.removeParticle(slot.particle);
    }
  }

  tick(dtSeconds: number): void {
    const bounds = this.getBounds();
    for (const slot of this.slots) {
      this.config.update(slot.state, dtSeconds, bounds);
      if (slot.state.age >= slot.state.life) {
        slot.state = this.config.spawn(bounds, this.rand);
      }
      this.applyState(slot.state, slot.particle);
    }
  }

  private applyState(state: ParticleState, particle: Particle): void {
    particle.x = state.x;
    particle.y = state.y;
    particle.rotation = state.rotation;
    particle.scaleX = state.scale;
    particle.scaleY = state.scale;
    particle.alpha = state.alpha;
    particle.tint = state.tint;
  }

  destroy(): void {
    this.container.destroy({ children: true, texture: false, textureSource: false });
  }
}
