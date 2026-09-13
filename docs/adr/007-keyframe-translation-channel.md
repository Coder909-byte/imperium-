# 007. RigKeyframe gets an optional translation channel (dx/dy), rotation stays the primary tool

## Context

M6 (ADR 006) shipped rotation-only keyframes: every clip animates a part by rotating it around its authored pivot, delta from rest, nothing else. That was the right place to start — it's what "cutout puppet" means, and it kept the first rig's playback math simple.

Two real limitations showed up once the legionary rig's `march`/`fall` clips got a serious look, not just a first pass:

1. **A walk cycle's hips genuinely translate, not just rotate.** A human gait's center of mass rises and falls roughly twice per stride (once per leg's stance phase) — a real vertical bob, not a rotation of anything. There's no joint to rotate that produces this; it's root-level motion.
2. **A collapse needs the body to actually go somewhere.** `fall`'s only channel was the torso's own rotation, applied around a pivot that never moved from the actor's placement point. The result: the character rotates in place around a fixed point in the air while the limbs swing — a floating, spinning puppet, not a body crumpling to the ground. This reads as an obviously broken animation, not a subtly stiff one — worse than doing nothing, because it draws the eye to exactly the wrong thing.

Both are the same shape of problem: some motion is root-level displacement, and rotation-only keyframes have no way to express it.

## Decision

`RigKeyframe` gains `dx`/`dy` (`content/schema.ts`), pixels, delta from the part's own `rest.x`/`rest.y` — the same relationship `rot` already has to `rest.rotation`. Both default to 0, so every clip authored before this ADR (`content/rigs/legionary.json`'s six M6 clips, minus the ones this session's content pass touches anyway) parses and plays back byte-identical; nothing is migrated.

Playback: `clipPlayer.evaluateClipPose` (renamed from `evaluateClipRotations`, since it now evaluates the part's whole local pose, not just its angle) interpolates `dx`/`dy` in the same pass as `rot`, using the same segment lookup and the same eased progress value — "interpolated like rot" means riding one shared curve per segment, not a second independent one nothing has needed yet. `jointSolver.computeWorldTransforms` adds the resolved `dx`/`dy` to the part's `rest.x`/`rest.y` *before* composing with the parent transform (rotating/scaling by the parent, same as `rest.x`/`rest.y` always has been) — so a keyframe's translation is expressed in exactly the same local space `rest` already uses, and a child's dx/dy gets carried by its parent's rotation exactly the way its rest position does.

**The channel is scoped, explicitly, to root-level motion — a walk cycle's bob, a collapse's actual displacement, a recoil.** It is not a general positioning tool. A limb reaching toward a target by translating rather than rotating its shoulder/elbow will match the authored keyframe's exact pose and look wrong at every pose in between: a cutout silhouette's whole visual logic is a limb sweeping an arc around its joint, and dragging a part to a position instead of rotating it into that position throws that away. `content/schema.ts`'s field comment says this in the same place an author will be looking when they reach for the channel, not just here.

## Consequences

`legionary.json`'s `march` clip now bobs the pelvis (root) vertically, twice per stride, synced to each leg's stance/swing crossing — motion no rotation-only rig could express. `fall` now moves the pelvis down and sideways as it rotates, so the character visibly drops toward the ground instead of spinning in place around a fixed point — the specific failure this ADR exists to fix.

The risk named above is real and worth restating as a consequence, not just a warning: nothing in the schema or the playback code stops a future rig author from using `dx`/`dy` on an arm or a foot to fake a reach or a plant instead of rotating the joint correctly. The comment at the point of authorship is the only guard right now. If a future rig repeatedly needs limb-tip positioning that rotation genuinely can't express (inverse kinematics, essentially), that's a bigger, separate decision — not something to back into by leaning on this channel part by part.

Every call site touching `computeWorldTransforms`/`evaluateClipPose`/`resetToRestPose`(renamed from `resetToRestRotations`) needed updating for the new buffers (`PuppetActor.ts`, all three puppet unit-test files) — mechanical, and covered by the existing test suite plus new cases asserting the translation math itself (a root's dx/dy adds directly to world position; a child's dx/dy is carried by the parent's rotation the same way `rest.x`/`rest.y` is) and the schema default (a keyframe omitting dx/dy loads and plays back as 0, unchanged from before this ADR).
