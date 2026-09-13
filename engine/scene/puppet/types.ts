// Plain shapes for cutout puppet rigs (PRD §3/§10, M6). Structurally
// mirrors content/schema.ts's Rig/RigPart/RigClip/RigKeyframe, declared
// independently — engine/ never imports content/ (CLAUDE.md), the same
// split every other engine/scene/types.ts shape already uses.
//
// RigDef is what arrives from app/ (already zod-validated JSON, adapted
// to this shape). LoadedRig is rigLoader.ts's output: RigDef resolved
// into index-addressed, root-first-ordered arrays so the hot path
// (jointSolver + clipPlayer, ticked for every actor every frame) never
// does a string-keyed Map lookup or builds an object.

export interface RigKeyframeDef {
  t: number; // 0..1
  rot: number; // degrees, delta from the part's rest rotation
  // Translation channel (ADR 007) — pixels, delta from the part's rest
  // x/y. Optional here (unlike content/schema.ts's zod field, which
  // always emits a default) so the hand-written RigDef fixtures every
  // puppet test already has don't all need touching: rigLoader.ts
  // treats a missing dx/dy as 0, same value the zod default produces.
  dx?: number;
  dy?: number;
  ease: string; // GSAP core ease name
}

export interface RigClipDef {
  id: string;
  durationMs: number;
  loop: boolean;
  tracks: Record<string, RigKeyframeDef[]>; // keyed by part id
}

export interface RigPartDef {
  id: string;
  parent: string | null;
  texture: string;
  pivot: [number, number];
  size: [number, number];
  zOrder: number;
  rest: { x: number; y: number; rotation: number; scale: number };
}

export interface RigDef {
  id: string;
  parts: RigPartDef[];
  clips: RigClipDef[];
}

/** One resolved keyframe: `ease` pre-parsed into a callable (gsap.parseEase),
 *  once at load time — never re-parsed on the per-frame hot path. */
export interface LoadedKeyframe {
  t: number;
  rotRad: number;
  dx: number; // pixels, delta from rest — 0 for a keyframe authored before ADR 007
  dy: number;
  easeFn: (progress: number) => number;
}

export interface LoadedTrack {
  partIndex: number;
  keyframes: LoadedKeyframe[];
}

export interface LoadedClip {
  id: string;
  durationMs: number;
  loop: boolean;
  /** Parallel to LoadedRig.parts — null for a part with no track in this clip. */
  trackByPartIndex: (LoadedTrack | null)[];
}

export interface LoadedPart {
  id: string;
  /** -1 for the root part. Guaranteed < this part's own index — parts
   *  are topologically sorted root-first at load time (jointSolver.ts
   *  relies on this to compute world transforms in a single forward pass). */
  parentIndex: number;
  texture: string;
  pivot: [number, number];
  size: [number, number];
  zOrder: number;
  restX: number;
  restY: number;
  restRotationRad: number;
  restScale: number;
}

export interface LoadedRig {
  id: string;
  /** Root-first order (see LoadedPart.parentIndex). */
  parts: LoadedPart[];
  partIndexById: Map<string, number>;
  clips: Map<string, LoadedClip>;
}

/** A 2D affine transform in world (actor-local) space — position,
 *  rotation, and a per-axis scale (negative x = mirrored). */
export interface WorldTransform {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}
