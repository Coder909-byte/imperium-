// The whole-stage post-processing chain (PRD §4, M5):
//
//   ColorMatrixFilter (LUT)  -> AdvancedBloom -> Godray -> Noise (grain)
//     -> RGBSplit (chromatic aberration) -> Vignette
//
// Split (post-M5, before M6 — see CLAUDE.md's session note): LUT and
// Vignette are eager, built synchronously in the constructor same as
// before — they're structural to how the frame reads, not atmosphere.
// The other four (bloom/godray/grain/chromatic aberration) live in
// ./atmosphereFilters.ts, a separate chunk loaded only via
// `loadAtmosphere()`, called by SceneEffects right after construction
// but never awaited by anything that gates first-beat-interactive. They
// arrive a beat late — measured, not assumed, to matter: this session's
// real CDP breakdown (CLAUDE.md) found first-beat-interactive already
// over PRD §11's 3.0s budget before accounting for M5's ~62.7KB, and
// that weight concentrates almost exactly in this atmosphere set.
//
// Every filter, eager or deferred, is still constructed exactly once.
// Nothing after construction ever rebuilds a filter — beat/tier/
// lightSource changes only mutate properties on the existing instances,
// or change *which* already-built instances are currently assigned to
// `container.filters` (a cheap array swap) — same discipline
// ParallaxPlane already follows for its own tint/blur filters.
import { ColorMatrixFilter, type Container, type Filter, type NoiseFilter } from "pixi.js";
import { applyLutPreset } from "./lut";
import { VignetteFilter } from "./VignetteFilter";
import type { AdvancedBloomFilter } from "pixi-filters/advanced-bloom";
import type { GodrayFilter } from "pixi-filters/godray";
import type { RGBSplitFilter } from "pixi-filters/rgb-split";
import type { DeviceTier } from "../deviceTier";

export type PostChainFilterId = "lut" | "bloom" | "godray" | "grain" | "chromaticAberration" | "vignette";

// Fixed left-to-right order per PRD §4 — selection below only ever
// filters this list down, never reorders it.
const CHAIN_ORDER: readonly PostChainFilterId[] = ["lut", "bloom", "godray", "grain", "chromaticAberration", "vignette"];

// The always-eager subset — structural to how the frame reads. Anything
// not in this set is atmosphere: excluded until loadAtmosphere() resolves,
// regardless of what tier/lightSource would otherwise select.
const EAGER_FILTER_IDS: ReadonlySet<PostChainFilterId> = new Set(["lut", "vignette"]);

export interface PostChainState {
  tier: DeviceTier;
  /** Current beat's lightSource flag — Godray only renders with a light source in frame (PRD §4). */
  lightSourceActive: boolean;
  /** Whole-chain kill switch, not a tier — used for the chain-on/chain-off comparison and nothing else. */
  chainEnabled: boolean;
  /** True once the deferred atmosphere filters have loaded and been constructed. */
  atmosphereLoaded: boolean;
}

/** Pure — which of the six filters should be live for a given state.
 *  Exported for unit testing without constructing any real Pixi filter
 *  (which needs a WebGL-capable canvas — see ParallaxPlane.test.ts). */
export function selectActiveFilterIds(state: PostChainState): PostChainFilterId[] {
  if (!state.chainEnabled) return [];
  return CHAIN_ORDER.filter((id) => {
    if (!state.atmosphereLoaded && !EAGER_FILTER_IDS.has(id)) return false;
    if (id === "godray") return state.tier === "high" && state.lightSourceActive;
    // PRD §11 low-tier degrade: "no godrays or chromatic aberration".
    if (id === "chromaticAberration") return state.tier === "high";
    return true;
  });
}

const GODRAY_TIME_SPEED = 0.35; // cycles per second — slow, ambient drift, not a strobing effect

export class PostChain {
  private readonly lut: ColorMatrixFilter;
  private readonly vignette: VignetteFilter;
  private bloom: AdvancedBloomFilter | null = null;
  private godray: GodrayFilter | null = null;
  private grain: NoiseFilter | null = null;
  private chromaticAberration: RGBSplitFilter | null = null;
  private state: PostChainState;
  private atmosphereLoadPromise: Promise<void> | null = null;
  private destroyed = false;

  constructor(private readonly target: Container, initialLutKey: string, initialTier: DeviceTier) {
    this.lut = new ColorMatrixFilter();
    applyLutPreset(this.lut, initialLutKey);
    this.vignette = new VignetteFilter();

    this.state = { tier: initialTier, lightSourceActive: false, chainEnabled: true, atmosphereLoaded: false };
    this.applyFilters();
  }

  /** Kicks off the deferred atmosphere chunk. Safe to call more than
   *  once — only the first call actually imports anything; later calls
   *  return the same promise. Resolves once bloom/godray/grain/chromatic
   *  aberration exist and (if the current state calls for any of them)
   *  are already live on `target.filters`. */
  loadAtmosphere(): Promise<void> {
    if (!this.atmosphereLoadPromise) {
      this.atmosphereLoadPromise = import("./atmosphereFilters").then(({ createAtmosphereFilters }) => {
        if (this.destroyed) return; // unmounted while the chunk was in flight
        const atmosphere = createAtmosphereFilters();
        this.bloom = atmosphere.bloom;
        this.godray = atmosphere.godray;
        this.grain = atmosphere.grain;
        this.chromaticAberration = atmosphere.chromaticAberration;
        this.state = { ...this.state, atmosphereLoaded: true };
        this.applyFilters();
      });
    }
    return this.atmosphereLoadPromise;
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
   *  frame regardless of whether Godray exists yet or is currently
   *  active — before atmosphere loads it's just a no-op guard. */
  tick(deltaMs: number): void {
    if (this.godray) this.godray.time += (deltaMs / 1000) * GODRAY_TIME_SPEED;
  }

  private applyFilters(): void {
    const ids = selectActiveFilterIds(this.state);
    const byId: Record<PostChainFilterId, Filter | null> = {
      lut: this.lut,
      bloom: this.bloom,
      godray: this.godray,
      grain: this.grain,
      chromaticAberration: this.chromaticAberration,
      vignette: this.vignette,
    };
    this.target.filters = ids.map((id) => byId[id]).filter((filter): filter is Filter => filter !== null);
  }

  destroy(): void {
    this.destroyed = true;
    this.target.filters = [];
    this.lut.destroy();
    this.vignette.destroy();
    this.bloom?.destroy();
    this.godray?.destroy();
    this.grain?.destroy();
    this.chromaticAberration?.destroy();
  }
}
