// Shared shapes passed into ScenePlayer and its subcomponents. Plain
// data — no Pixi imports, no content imports. app/scene/ adapts
// content/ JSON into these, the same split app/atlas/buildAtlasProps.ts
// already uses for engine/atlas.
//
// M4 carried only camera + layer visibility + caption text.
// M5 adds `lut` (region-level grade preset key), and `fx`/`lightSource`
// per beat (particles, screen shake, godray gating) — the post chain and
// particle emitters this milestone renders. M6 adds `actors` (rendered
// by SceneActors/PuppetActor/CrowdField) and the region's `rigs`.
// `audio`/`sources` still belong to a later milestone (M10).

// RigDef lives in puppet/types.ts (it's the input to rigLoader.loadRig),
// re-exported here so app/'s adapters only need one import path for
// every plain shape engine/scene hands back to content.
import type { RigDef } from "./puppet/types";
export type { RigDef } from "./puppet/types";

// Structurally mirrors content/schema.ts's Beat.fx enum, but declared
// independently — engine/ never imports content/ (CLAUDE.md), same
// split SceneCamera already uses against Beat.camera.
export type FxKind = "dust" | "smoke" | "embers" | "rain" | "arrow_volley" | "fire" | "shake" | "flash";

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
  /** Particle emitters and screen shake active for this beat's duration —
   *  see engine/scene/particles/ and Camera.ts's shake support. 'flash'
   *  is accepted (content/schema.ts already enumerates it) but unrendered
   *  this milestone; nothing here reads it yet. */
  fx: FxKind[];
  /** Gates the post chain's Godray filter (PRD §4). */
  lightSource: boolean;
  actors: SceneActor[];
}

export interface SceneActor {
  rig: string;
  clip: string;
  x: number;
  y: number;
  scale: number;
  /** >1 → rendered as a CrowdField (instanced quads), never individual
   *  PuppetActor rigs — see SceneActors.ts. */
  count: number;
  flip: boolean;
  /** Per-instance clip-time offset, ms. For a count>1 entry this is
   *  ignored (SceneActors assigns each crowd unit its own seeded-random
   *  phase instead — see CrowdField's phaseMs comment for why). */
  phase: number;
  /** Where this actor sits in the plane depth stack (PRD §3's
   *  "character stage" slot) — same 0..1 range as ScenePlane.depth,
   *  compared against it directly for draw order (Container.zIndex). */
  depth: number;
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
  /** Post chain grade preset key — see engine/scene/post/lut.ts's LUT_PRESETS. */
  lut: string;
  planes: ScenePlane[];
  beats: SceneBeat[];
  /** Every rig any beat's actors[] might reference, keyed by RigDef.id —
   *  loaded eagerly (see CLAUDE.md's M6 note on why puppets are eager,
   *  unlike M5's atmosphere split) and resolved once by SceneActors. */
  rigs: RigDef[];
}
