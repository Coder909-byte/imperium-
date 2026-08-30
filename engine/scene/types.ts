// Shared shapes passed into ScenePlayer and its subcomponents. Plain
// data — no Pixi imports, no content imports. app/scene/ adapts
// content/ JSON into these, the same split app/atlas/buildAtlasProps.ts
// already uses for engine/atlas.
//
// M4 deliberately carries only what the engine renders this milestone:
// camera + layer visibility + caption text. `actors`/`fx`/`audio`/
// `sources` exist in content/schema.ts's Beat today but belong to later
// milestones (puppets: M6, particles/post: M5, audio: M10) — adding
// unused fields here now would be plumbing with nothing on the other
// end of it.

export interface SceneCamera {
  /** Pan target, as a fraction of the current stage size — e.g. 0.3 pans
   *  30% of the stage width. Not pixels: recomputed against the live
   *  stage size at the start of every beat, so it stays sane across a
   *  resize mid-scene. */
  x: number;
  y: number;
  /** Multiplier on the camera's base fit scale. 1 = neutral. */
  scale: number;
  durationMs: number;
  /** A GSAP core ease name, e.g. "power2.inOut". */
  ease: string;
}

export interface SceneBeat {
  id: string;
  year: string;
  headline: string;
  body: string;
  visibleLayers: string[];
  camera: SceneCamera;
}

export interface ScenePlane {
  id: string;
  /** Depth 0 (far) – 1 (near). Pointer parallax offset and placeholder
   *  colour both scale with this. */
  depth: number;
  /** Hex colour, e.g. "#8a7a63" — applied once via ColorMatrixFilter
   *  (constructed once, mutated never rebuilt) so the same runtime path
   *  real alpha/character planes will use later (ADR 003) is genuinely
   *  exercised now, even though real colour backdrop planes will
   *  eventually take their consistency from the scene-level LUT (M5)
   *  instead of this per-plane tint. */
  tint: string;
  /** Gaussian blur strength in px. 0 (the common case) skips the filter
   *  entirely — a filter that does nothing is not free in Pixi. */
  blur: number;
}

export interface SceneRegion {
  id: string;
  name: string;
  planes: ScenePlane[];
  beats: SceneBeat[];
}
