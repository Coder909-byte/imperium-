import { Rectangle, Texture } from "pixi.js";
import { evaluateClipPose, resetToRestPose } from "../puppet/clipPlayer";
import { computeWorldTransforms, createTransformBuffer } from "../puppet/jointSolver";
import type { LoadedRig } from "../puppet/types";
import { measurePoseBounds } from "../puppet/poseBounds";

export interface BakedCrowdFrames {
  frames: Texture[];
  anchorX: number;
  anchorY: number;
  scale: number;
}

/** One shared four-pose atlas per painted rig/action. Baking happens at
 * beat entry; the live army still consists only of instanced quads.
 * Colour and alpha come from the very same approved parts as the puppet. */
export function bakeCrowdFrames(rig: LoadedRig, textures: ReadonlyMap<string, Texture>, clipId: string): BakedCrowdFrames {
  const clip = rig.clips.get(clipId);
  if (!clip) throw new Error(`Cannot bake unknown crowd action: ${clipId}`);
  const rotations = new Float32Array(rig.parts.length);
  const dx = new Float32Array(rig.parts.length);
  const dy = new Float32Array(rig.parts.length);
  const poses = Array.from({ length: 4 }, (_, index) => {
    resetToRestPose(rig, rotations, dx, dy);
    evaluateClipPose(rig, clip, index * clip.durationMs / 4, rotations, dx, dy);
    const world = createTransformBuffer(rig);
    computeWorldTransforms(rig, rotations, dx, dy, { x: 0, y: 0, scale: 1, flip: false }, world);
    return world;
  });
  const bounds = measurePoseBounds(rig, poses);
  const left = Math.floor(bounds.x) - 2;
  const top = Math.floor(bounds.y) - 2;
  const width = Math.ceil(bounds.x + bounds.width) - left + 2;
  const height = Math.ceil(bounds.y + bounds.height) - top + 2;
  // 192px retains shields/equipment at middle distance without uploading
  // a full-size puppet four times. Particle scale restores logical size.
  const fit = Math.min(1, 192 / height);
  const frameWidth = Math.ceil(width * fit);
  const frameHeight = Math.ceil(height * fit);
  const canvas = document.createElement("canvas");
  canvas.width = frameWidth * 4;
  canvas.height = frameHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Crowd preparation needs a canvas context");
  const order = rig.parts.map((part, index) => ({ part, index })).sort((a, b) => a.part.zOrder - b.part.zOrder);
  poses.forEach((pose, frame) => {
    ctx.save();
    ctx.translate(frame * frameWidth - left * fit, -top * fit);
    ctx.scale(fit, fit);
    for (const { part, index } of order) {
      const image = textures.get(part.id)?.source.resource;
      if (!(image instanceof HTMLImageElement)) throw new Error(`Crowd part is not a loaded painted image: ${part.id}`);
      const transform = pose[index];
      ctx.save();
      ctx.translate(transform.x, transform.y);
      ctx.rotate(transform.rotation);
      ctx.scale(transform.scaleX, transform.scaleY);
      ctx.drawImage(image, -part.pivot[0], -part.pivot[1], part.size[0], part.size[1]);
      ctx.restore();
    }
    ctx.restore();
  });
  const base = Texture.from(canvas);
  return {
    frames: Array.from({ length: 4 }, (_, index) => new Texture({ source: base.source, frame: new Rectangle(index * frameWidth, 0, frameWidth, frameHeight) })),
    anchorX: -left * fit / frameWidth,
    anchorY: -top * fit / frameHeight,
    scale: 1 / fit,
  };
}
