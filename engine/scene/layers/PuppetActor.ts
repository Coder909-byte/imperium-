// Renders one rig instance at a position/scale, playing a named clip
// with a time offset (PRD §3/§10, M6). Construct-once-mutate, same
// discipline as ParallaxPlane/ParticleField: every Sprite is built once
// in the constructor; a tick only ever writes position/rotation/scale
// onto existing sprites, using pre-allocated buffers (jointSolver's
// `out` array, clipPlayer's `localRotations` Float32Array) — no
// allocation on the hot path.
//
// Parts are flat siblings of one `container` (not Pixi-nested per bone
// parent) with `zIndex` set from the rig's authored draw order and
// `sortableChildren` on — see engine/scene/puppet/jointSolver.ts's
// header for why transform hierarchy and draw order are solved
// separately rather than both falling out of Pixi's own nesting.
import { Container, Sprite, type Texture } from "pixi.js";
import { evaluateClipPose, resetToRestPose, resolveClipTimeMs } from "../puppet/clipPlayer";
import { computeWorldTransforms, createTransformBuffer } from "../puppet/jointSolver";
import type { LoadedRig, WorldTransform } from "../puppet/types";

export interface PuppetActorOptions {
  rig: LoadedRig;
  /** Shared cache built once per rig (puppetTextures.ts) — NOT owned or
   *  destroyed by this actor, since every instance of the same rig
   *  shares it. */
  textures: Map<string, Texture>;
  clipId: string;
  x: number;
  y: number;
  scale: number;
  flip: boolean;
  /** Per-instance start offset into the clip's timeline, ms — see
   *  SceneActors.ts for how this is assigned (content-authored for a
   *  single named actor, seeded-random for a crowd) and why it must
   *  never be derived from an instance's index. */
  phaseMs: number;
  reducedMotion?: boolean;
}

export class PuppetActor {
  readonly container: Container;
  /** Public read access to the rig this instance plays — /dev/scene-lab's
   *  rig inspector uses it (part sizes/pivots) to draw the pivot/bounds
   *  overlay from the SAME transforms this actor already computed,
   *  rather than re-deriving them. */
  readonly rig: LoadedRig;
  private readonly sprites: Sprite[];
  private clip: ReturnType<LoadedRig["clips"]["get"]>;
  private elapsedMs: number;
  private readonly localRotations: Float32Array;
  private readonly localDx: Float32Array;
  private readonly localDy: Float32Array;
  private readonly transforms: WorldTransform[];
  private readonly placement: { x: number; y: number; scale: number; flip: boolean };
  private reducedMotion: boolean;

  constructor(options: PuppetActorOptions) {
    this.rig = options.rig;
    this.elapsedMs = options.phaseMs;
    this.placement = { x: options.x, y: options.y, scale: options.scale, flip: options.flip };
    this.reducedMotion = options.reducedMotion ?? false;
    this.localRotations = new Float32Array(options.rig.parts.length);
    this.localDx = new Float32Array(options.rig.parts.length);
    this.localDy = new Float32Array(options.rig.parts.length);
    this.transforms = createTransformBuffer(options.rig);
    this.clip = options.rig.clips.get(options.clipId);

    this.container = new Container();
    this.container.sortableChildren = true;
    this.sprites = options.rig.parts.map((part) => {
      const texture = options.textures.get(part.id);
      const sprite = new Sprite(texture);
      // A fractional anchor derived from the authored pixel pivot — see
      // content/schema.ts's RigPart.pivot comment: the joint the part
      // rotates around, in its own local pixel space.
      sprite.anchor.set(part.pivot[0] / part.size[0], part.pivot[1] / part.size[1]);
      sprite.zIndex = part.zOrder;
      this.container.addChild(sprite);
      return sprite;
    });

    resetToRestPose(this.rig, this.localRotations, this.localDx, this.localDy);
    this.applyTransforms();
  }

  setClip(clipId: string): void {
    const next = this.rig.clips.get(clipId);
    if (!next || next === this.clip) return;
    this.clip = next;
    this.elapsedMs = 0;
    resetToRestPose(this.rig, this.localRotations, this.localDx, this.localDy);
    // Without this, the actor's sprites keep showing the PREVIOUS
    // clip's last pose until the next tick() happens to come along —
    // caught by a unit test asserting setClip's result immediately,
    // with no tick() in between (PuppetActor.test.ts).
    this.applyTransforms();
  }

  setReducedMotion(reduced: boolean): void {
    if (reduced === this.reducedMotion) return;
    this.reducedMotion = reduced;
    if (reduced) {
      resetToRestPose(this.rig, this.localRotations, this.localDx, this.localDy);
      this.applyTransforms();
    }
  }

  /** Current position in the clip's timeline, ms — /dev/scene-lab's rig
   *  inspector reads this to keep its scrub slider in sync during
   *  free-running playback (as opposed to a user actively dragging it,
   *  which drives time the other way via seek()). */
  getElapsedMs(): number {
    return this.elapsedMs;
  }

  /** Advances playback by `dtMs` — a no-op under reduced motion (the
   *  puppet holds its rest pose rather than animating, PRD §12). */
  tick(dtMs: number): void {
    if (this.reducedMotion) return;
    this.elapsedMs += dtMs;
    if (this.clip) evaluateClipPose(this.rig, this.clip, this.elapsedMs, this.localRotations, this.localDx, this.localDy);
    this.applyTransforms();
  }

  /** Jumps to an absolute clip time — used by /dev/scene-lab's rig
   *  inspector to scrub, bypassing elapsed/phase bookkeeping entirely. */
  seek(timeMs: number): void {
    if (this.clip) {
      const resolved = resolveClipTimeMs(this.clip, timeMs);
      evaluateClipPose(this.rig, this.clip, resolved, this.localRotations, this.localDx, this.localDy);
    }
    this.applyTransforms();
  }

  /** Read-only view of this instance's last-computed world transforms,
   *  parallel to `rig.parts` — /dev/scene-lab's rig inspector overlay. */
  getWorldTransforms(): readonly WorldTransform[] {
    return this.transforms;
  }

  private applyTransforms(): void {
    computeWorldTransforms(this.rig, this.localRotations, this.localDx, this.localDy, this.placement, this.transforms);
    for (let i = 0; i < this.sprites.length; i++) {
      const sprite = this.sprites[i];
      const t = this.transforms[i];
      sprite.x = t.x;
      sprite.y = t.y;
      sprite.rotation = t.rotation;
      sprite.scale.set(t.scaleX, t.scaleY);
    }
  }

  destroy(): void {
    // Textures are the shared cache's responsibility (see
    // buildPartTextureCache) — never destroyed here.
    this.container.destroy({ children: true, texture: false, textureSource: false });
  }
}
