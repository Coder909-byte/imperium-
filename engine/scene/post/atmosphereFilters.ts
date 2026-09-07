// The deferred "atmosphere" half of the post chain (PRD §4) — bloom,
// godray, grain (noise), and chromatic aberration. Loaded as one chunk
// via PostChain.loadAtmosphere(), which SceneEffects calls right after
// construction but never awaits before the scene is considered
// interactive — see PostChain.ts's header and CLAUDE.md's M5
// bundle-split note for why this four (plus all six particle emitters,
// particles/loadParticleSystem.ts) is the deferred set and LUT+Vignette
// are not.
//
// Construction values are unchanged from the pre-split PostChain — this
// is a relocation, not a retune.
import { AdvancedBloomFilter } from "pixi-filters/advanced-bloom";
import { GodrayFilter } from "pixi-filters/godray";
import { RGBSplitFilter } from "pixi-filters/rgb-split";
import { NoiseFilter } from "pixi.js";

export interface AtmosphereFilters {
  bloom: AdvancedBloomFilter;
  godray: GodrayFilter;
  grain: NoiseFilter;
  chromaticAberration: RGBSplitFilter;
}

export function createAtmosphereFilters(): AtmosphereFilters {
  // Thresholds tuned for "fire, sun, metal" (PRD §4) — a subtle bloom
  // on ordinary painted colour, not a glow-everything effect.
  const bloom = new AdvancedBloomFilter({ threshold: 0.55, bloomScale: 1.1, brightness: 1.0, blur: 6, quality: 4 });

  const godray = new GodrayFilter({ angle: 25, gain: 0.4, lacunarity: 2.3, alpha: 0.35, parallel: true });

  // ~0.06 per PRD §4 — subtle grain, not visible static.
  const grain = new NoiseFilter({ noise: 0.06 });

  // ~0.5px per PRD §4 — a near-invisible fringe at high-contrast edges,
  // not a glitch-art effect.
  const chromaticAberration = new RGBSplitFilter({ red: { x: -0.5, y: 0 }, green: { x: 0, y: 0 }, blue: { x: 0.5, y: 0 } });

  return { bloom, godray, grain, chromaticAberration };
}
