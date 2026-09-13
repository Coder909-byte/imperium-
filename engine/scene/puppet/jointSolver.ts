// Forward kinematics for a cutout rig: given each part's current LOCAL
// rotation (rest + whatever the clip player computed for this frame),
// walk the parent chain and write each part's WORLD (actor-local)
// transform — the values a Pixi Container's position/rotation/scale get
// set to directly.
//
// This is deliberately NOT "nest a Container per part inside its parent
// Container and let Pixi's own scene graph compose transforms" — that
// would satisfy "rotating a parent carries its children" for free, but
// it would also force each part's DRAW order to match its bone
// hierarchy (a Pixi child always renders in front of its own parent).
// Real cutout rigs need the opposite in general: PRD's example cut list
// is head/torso/upper-arm/forearm/thigh/shin/foot, and a correct side
// silhouette needs one leg drawn *behind* the torso and the other *in
// front* of it, even though both are the torso's children for rotation
// purposes. So: every part is a flat sibling in one Pixi container
// (PuppetActor's root, using `zIndex`/`sortableChildren` for draw
// order — see content/schema.ts's RigPart.zOrder), and this module
// supplies the world transform each of those flat siblings needs,
// computed by walking the *logical* (non-Pixi) parent chain by hand.
//
// Pure 2D affine math, no Pixi import — testable with plain numbers,
// and the transform-hierarchy-correctness acceptance criterion is
// exercised here directly rather than by asserting on rendered pixels.
import type { LoadedPart, LoadedRig, WorldTransform } from "./types";

/** Composes a child's LOCAL transform (rest position/rotation, relative
 *  to its parent's own local space) with the PARENT's already-resolved
 *  WORLD transform, writing the result into `out`. Standard 2D transform
 *  composition: rotate+scale the child's local offset by the parent's
 *  world rotation/scale, then translate by the parent's world position.
 *  A parent with an odd number of negative-scale axes (a horizontally
 *  flipped rig) mirrors the child's rotation direction too — otherwise
 *  a flipped rig's limbs would swing the wrong way relative to what the
 *  clip author saw when authoring against an unflipped rig. */
function composeChild(
  parentX: number,
  parentY: number,
  parentRotation: number,
  parentScaleX: number,
  parentScaleY: number,
  localX: number,
  localY: number,
  localRotation: number,
  localScale: number,
  out: WorldTransform,
): void {
  const cos = Math.cos(parentRotation);
  const sin = Math.sin(parentRotation);
  const sx = localX * parentScaleX;
  const sy = localY * parentScaleY;
  const mirrored = parentScaleX * parentScaleY < 0;
  out.x = parentX + (sx * cos - sy * sin);
  out.y = parentY + (sx * sin + sy * cos);
  out.rotation = parentRotation + (mirrored ? -localRotation : localRotation);
  out.scaleX = parentScaleX * localScale;
  out.scaleY = parentScaleY * localScale;
}

export interface ActorPlacement {
  x: number;
  y: number;
  scale: number;
  flip: boolean;
}

/**
 * Writes every part's world transform into `out` (parallel to
 * `rig.parts`, same index). `out` is caller-allocated and reused every
 * frame (see PuppetActor.tick) — this function never allocates.
 * `localRotations` is parallel to `rig.parts` too: each entry is the
 * part's current local rotation in radians (rest + clip delta), and
 * `localDx`/`localDy` are each part's current translation delta from
 * rest (ADR 007) — all three already computed by
 * clipPlayer.evaluateClipPose. The delta is added to the part's own
 * rest x/y BEFORE composing with the parent (see composeChild's
 * `localX`/`localY` params) — same local space, so a keyframe's dx/dy
 * behaves exactly like an authored change to `rest.x`/`rest.y` would,
 * just animated instead of static.
 */
export function computeWorldTransforms(
  rig: LoadedRig,
  localRotations: Float32Array,
  localDx: Float32Array,
  localDy: Float32Array,
  placement: ActorPlacement,
  out: WorldTransform[],
): void {
  const rootScaleX = placement.flip ? -placement.scale : placement.scale;
  const rootScaleY = placement.scale;

  for (let i = 0; i < rig.parts.length; i++) {
    const part: LoadedPart = rig.parts[i];
    const localRotation = localRotations[i];
    // The root's "parent" is the actor's own placement — position,
    // scale (with flip folded into scaleX), and zero rotation. Routing
    // the root through the same composeChild() the rest of the tree
    // uses (rather than a hand-written special case) is what makes a
    // flipped rig also mirror the root's OWN local rotation (e.g. an
    // idle sway on the torso), not just its children's.
    const parentX = part.parentIndex === -1 ? placement.x : out[part.parentIndex].x;
    const parentY = part.parentIndex === -1 ? placement.y : out[part.parentIndex].y;
    const parentRotation = part.parentIndex === -1 ? 0 : out[part.parentIndex].rotation;
    const parentScaleX = part.parentIndex === -1 ? rootScaleX : out[part.parentIndex].scaleX;
    const parentScaleY = part.parentIndex === -1 ? rootScaleY : out[part.parentIndex].scaleY;
    composeChild(parentX, parentY, parentRotation, parentScaleX, parentScaleY, part.restX + localDx[i], part.restY + localDy[i], localRotation, part.restScale, out[i]);
  }
}

/** Allocates a fresh, zeroed transform array sized for `rig` — call once
 *  at PuppetActor construction, never per frame. */
export function createTransformBuffer(rig: LoadedRig): WorldTransform[] {
  return rig.parts.map(() => ({ x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 }));
}
