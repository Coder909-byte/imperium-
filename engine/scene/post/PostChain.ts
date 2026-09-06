// The whole-stage post-processing chain (PRD §4, M5):
//
//   ColorMatrixFilter (LUT)  -> AdvancedBloom -> Godray -> Noise (grain)
//     -> RGBSplit (chromatic aberration) -> Vignette
//
// Every filter is constructed exactly once, here, in the constructor.
// Nothing after that ever rebuilds a filter — beat/tier/lightSource
// changes only mutate properties on the existing instances, or change
// *which* already-built instances are currently assigned to
// `container.filters` (a cheap array swap, not a construction) — same
// discipline CLAUDE.md already states for Pixi filters generally and
// ParallaxPlane already follows for its own tint/blur filters.
//
// Bundling: this session bundled the whole chain into the existing scene
// chunk rather than lazy-loading it, on the call that measuring the real
// number matters more than pre-emptively splitting a problem that might
// not exist (see CLAUDE.md's M5 note for the measured before/after). If
// a split does turn out to be warranted, it should NOT separate the LUT
// from the rest — the grade is structural to how the frame reads, not
// atmosphere. `selectActiveFilterIds` below already group the six
// filters into "lut"/"vignette" (cheap, structural) vs. the rest
// (bloom/godray/grain/chromatic — additive atmosphere, and also exactly
// the tier-degradable set), which is the natural split boundary if one
// is ever needed.
import { AdvancedBloomFilter } from "pixi-filters/advanced-bloom";
import { GodrayFilter } from "pixi-filters/godray";
import { RGBSplitFilter } from "pixi-filters/rgb-split";
import { ColorMatrixFilter, NoiseFilter, type Container, type Filter } from "pixi.js";
import { applyLutPreset } from "./lut";
import { VignetteFilter } from "./VignetteFilter";
import type { DeviceTier } from "../deviceTier";

export type PostChainFilterId = "lut" | "bloom" | "godray" | "grain" | "chromaticAberration" | "vignette";

// Fixed left-to-right order per PRD §4 — selection below only ever
// filters this list down, never reorders it.
const CHAIN_ORDER: readonly PostChainFilterId[] = ["lut", "bloom", "godray", "grain", "chromaticAberration", "vignette"];

export interface PostChainState {
  tier: DeviceTier;
  /** Current beat's lightSource flag — Godray only renders with a light source in frame (PRD §4). */
  lightSourceActive: boolean;
  /** Whole-chain kill switch, not a tier — used for the chain-on/chain-off comparison and nothing else. */
  chainEnabled: boolean;
}

/** Pure — which of the six filters should be live for a given state.
 *  Exported for unit testing without constructing any real Pixi filter
 *  (which needs a WebGL-capable canvas — see ParallaxPlane.test.ts). */
export function selectActiveFilterIds(state: PostChainState): PostChainFilterId[] {
  if (!state.chainEnabled) return [];
  return CHAIN_ORDER.filter((id) => {
    if (id === "godray") return state.tier === "high" && state.lightSourceActive;
    // PRD §11 low-tier degrade: "no godrays or chromatic aberration".
    if (id === "chromaticAberration") return state.tier === "high";
    return true;
  });
}

const GODRAY_TIME_SPEED = 0.35; // cycles per second — slow, ambient drift, not a strobing effect

export class PostChain {
  private readonly lut: ColorMatrixFilter;
  private readonly bloom: AdvancedBloomFilter;
  private readonly godray: GodrayFilter;
  private readonly grain: NoiseFilter;
  private readonly chromaticAberration: RGBSplitFilter;
  private readonly vignette: VignetteFilter;
  private readonly byId: Record<PostChainFilterId, Filter>;
  private state: PostChainState;

  constructor(private readonly target: Container, initialLutKey: string, initialTier: DeviceTier) {
    this.lut = new ColorMatrixFilter();
    applyLutPreset(this.lut, initialLutKey);

    // Thresholds tuned for "fire, sun, metal" (PRD §4) — a subtle bloom
    // on ordinary painted colour, not a glow-everything effect.
    this.bloom = new AdvancedBloomFilter({ threshold: 0.55, bloomScale: 1.1, brightness: 1.0, blur: 6, quality: 4 });

    this.godray = new GodrayFilter({ angle: 25, gain: 0.4, lacunarity: 2.3, alpha: 0.35, parallel: true });

    // ~0.06 per PRD §4 — subtle grain, not visible static.
    this.grain = new NoiseFilter({ noise: 0.06 });

    // ~0.5px per PRD §4 — a near-invisible fringe at high-contrast edges,
    // not a glitch-art effect.
    this.chromaticAberration = new RGBSplitFilter({ red: { x: -0.5, y: 0 }, green: { x: 0, y: 0 }, blue: { x: 0.5, y: 0 } });

    this.vignette = new VignetteFilter();

    this.byId = {
      lut: this.lut,
      bloom: this.bloom,
      godray: this.godray,
      grain: this.grain,
      chromaticAberration: this.chromaticAberration,
      vignette: this.vignette,
    };

    this.state = { tier: initialTier, lightSourceActive: false, chainEnabled: true };
    this.applyFilters();
  }

  setLutPreset(key: string): void {
    applyLutPreset(this.lut, key);
  }

  setTier(tier: DeviceTier): void {
    if (tier === this.state.tier) return;
    this.state = { ...this.state, tier };
    this.applyFilters();
  }

  setLightSourceActive(active: boolean): void {
    if (active === this.state.lightSourceActive) return;
    this.state = { ...this.state, lightSourceActive: active };
    this.applyFilters();
  }

  /** Whole-chain on/off — for the chain-on/chain-off comparison only; not a tier. */
  setChainEnabled(enabled: boolean): void {
    if (enabled === this.state.chainEnabled) return;
    this.state = { ...this.state, chainEnabled: enabled };
    this.applyFilters();
  }

  /** Advances Godray's animated fractal-noise time. Cheap to call every
   *  frame regardless of whether Godray is currently active — it's a
   *  number assignment, not a render cost, and means Godray doesn't
   *  visibly "restart" every time a beat with a light source turns it
   *  back on. */
  tick(deltaMs: number): void {
    this.godray.time += (deltaMs / 1000) * GODRAY_TIME_SPEED;
  }

  private applyFilters(): void {
    const ids = selectActiveFilterIds(this.state);
    this.target.filters = ids.map((id) => this.byId[id]);
  }

  destroy(): void {
    this.target.filters = [];
    for (const filter of Object.values(this.byId)) filter.destroy();
  }
}
