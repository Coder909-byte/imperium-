// Composes the post chain, particle emitters, and device-tier
// degradation (PRD §4/§10/§11, M5) into one thing ScenePlayer mounts
// and drives — kept separate from ScenePlayer.tsx so that file stays
// React wiring, not engine orchestration (CLAUDE.md: files under ~300
// lines). Screen shake stays Camera's own concern (its `animateTo`
// gained a `shakeActive` option) since it's a camera transform, not a
// stage filter or a particle — nothing here duplicates it.
//
// Split (post-M5, before M6 — CLAUDE.md's session note): the eager
// pieces (device tier, PostChain's LUT+Vignette) are still built
// synchronously in the constructor, exactly as before. Everything else
// — PostChain's bloom/godray/grain/chromatic aberration and all six
// particle fields — is "atmosphere": loaded via loadDeferred() right
// after construction, but never awaited by ScenePlayer before the scene
// counts as interactive. `applyBeat()` remembers the current beat's fx
// so a late-arriving particle field starts in the right visible/hidden
// state instead of defaulting to hidden until the *next* beat change.
import type { Container } from "pixi.js";
import { DeviceTierController, type DeviceTier, type FrameTicker } from "./deviceTier";
import { loadParticleSystem } from "./particles/loadParticleSystem";
import type { ParticleField } from "./particles/ParticleField";
import type { EmitterBounds, ParticleFxKind } from "./particles/types";
import { PostChain } from "./post/PostChain";

// Long tab-switch/stall gaps shouldn't be replayed as one giant physics
// step (a respawned dust mote teleporting across the frame) — clamp the
// per-tick delta the same way a lot of game loops do.
const MAX_TICK_SECONDS = 0.1;

interface FieldEntry {
  field: ParticleField;
  baseCount: number;
}

type ResolveParticleCount = (baseCount: number, tier: DeviceTier, reducedMotion: boolean) => number;

export interface SceneEffectsOptions {
  /** Whole-stage post chain target (PRD §4: "applied to the whole stage"). */
  stage: Container;
  /** Particle containers live alongside planes so they pan/scale/rotate with the camera. */
  cameraContainer: Container;
  ticker: FrameTicker;
  lutKey: string;
  getBounds: () => EmitterBounds;
  forcedTier?: DeviceTier;
}

export class SceneEffects {
  readonly postChain: PostChain;
  readonly deviceTier: DeviceTierController;
  private readonly ticker: FrameTicker;
  private readonly fields = new Map<ParticleFxKind, FieldEntry>();
  private reducedMotion = false;
  private lastTickTime = performance.now();
  /** The most recent applyBeat() call's fx set — replayed onto particle
   *  fields that finish loading after that call already happened. */
  private lastFx: readonly string[] = [];
  private resolveParticleCount: ResolveParticleCount | null = null;
  private destroyed = false;

  private readonly tick = (): void => {
    const now = performance.now();
    const dtSeconds = Math.min(MAX_TICK_SECONDS, (now - this.lastTickTime) / 1000);
    this.lastTickTime = now;
    this.postChain.tick(dtSeconds * 1000);
    for (const { field } of this.fields.values()) {
      if (field.container.visible) field.tick(dtSeconds);
    }
  };

  constructor(private readonly options: SceneEffectsOptions) {
    this.ticker = options.ticker;
    this.deviceTier = new DeviceTierController(options.ticker, { forcedTier: options.forcedTier });
    this.postChain = new PostChain(options.stage, options.lutKey, this.deviceTier.getSnapshot().tier);

    this.deviceTier.subscribe(() => this.applyTierChange());
    this.ticker.add(this.tick);

    void this.loadDeferred();
  }

  /** Fetches and constructs the atmosphere chunk — PostChain's four
   *  extra filters plus all six particle fields. Fire-and-forget from
   *  the constructor; guarded against a destroy() that lands while the
   *  dynamic import is still in flight. */
  private async loadDeferred(): Promise<void> {
    const [, particleSystem] = await Promise.all([this.postChain.loadAtmosphere(), loadParticleSystem()]);
    if (this.destroyed) return;

    const { EMITTER_CONFIGS, resolveParticleCount, ParticleField } = particleSystem;
    this.resolveParticleCount = resolveParticleCount;
    const tier = this.deviceTier.getSnapshot().tier;
    const active = new Set(this.lastFx);

    for (const config of Object.values(EMITTER_CONFIGS)) {
      const field = new ParticleField({
        config,
        getBounds: this.options.getBounds,
        count: resolveParticleCount(config.baseCount, tier, this.reducedMotion),
      });
      // Starts in whatever visibility the current beat already calls
      // for — otherwise a field that finishes loading mid-beat would
      // sit hidden until the *next* beat change picked it up.
      field.container.visible = active.has(config.id);
      this.options.cameraContainer.addChild(field.container);
      this.fields.set(config.id, { field, baseCount: config.baseCount });
    }
  }

  /** Which particle fields are visible/ticking, and whether Godray is
   *  eligible — call once per beat change. */
  applyBeat(fx: readonly string[], lightSource: boolean): void {
    this.lastFx = fx;
    const active = new Set(fx);
    for (const [kind, entry] of this.fields) {
      entry.field.container.visible = active.has(kind);
    }
    this.postChain.setLightSourceActive(lightSource);
  }

  setLutPreset(key: string): void {
    this.postChain.setLutPreset(key);
  }

  /** Whole-chain kill switch — for the chain-on/chain-off comparison only. */
  setChainEnabled(enabled: boolean): void {
    this.postChain.setChainEnabled(enabled);
  }

  setReducedMotion(reducedMotion: boolean): void {
    if (reducedMotion === this.reducedMotion) return;
    this.reducedMotion = reducedMotion;
    this.recountParticles();
  }

  private applyTierChange(): void {
    this.postChain.setTier(this.deviceTier.getSnapshot().tier);
    this.recountParticles();
  }

  private recountParticles(): void {
    if (!this.resolveParticleCount) return; // particle system hasn't loaded yet — nothing to recount
    const tier = this.deviceTier.getSnapshot().tier;
    for (const { field, baseCount } of this.fields.values()) {
      field.setCount(this.resolveParticleCount(baseCount, tier, this.reducedMotion));
    }
  }

  destroy(): void {
    this.destroyed = true;
    this.ticker.remove(this.tick);
    this.deviceTier.destroy();
    this.postChain.destroy();
    for (const { field } of this.fields.values()) field.destroy();
  }
}
