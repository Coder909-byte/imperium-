// Procedural placeholder shapes for rig parts (no raster assets — same
// constraint and technique as particles/textures.ts and
// layers/placeholderTexture.ts: drawn to a canvas, wrapped as a Pixi
// Texture). Real art (M7/M8) replaces `texture` with a forged asset
// path; the shape key ("torso"/"head"/"limb"/"foot") is what's left of
// this file once that happens.
//
// One texture per (shape, width, height) combination is built ONCE and
// shared across every PuppetActor instance of the same rig — see
// buildPartTextureCache — rather than redrawn per instance, since 40
// instances x ~12 parts would otherwise be 480 redundant canvas draws
// for at most a handful of distinct (shape, size) pairs.
import { Texture } from "pixi.js";
import type { LoadedRig } from "../puppet/types";

function roundedRect(ctx: CanvasRenderingContext2D, width: number, height: number, radius: number): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.arcTo(width, 0, width, height, r);
  ctx.arcTo(width, height, 0, height, r);
  ctx.arcTo(0, height, 0, 0, r);
  ctx.arcTo(0, 0, width, 0, r);
  ctx.closePath();
}

function paint(ctx: CanvasRenderingContext2D, width: number, height: number, draw: () => void): void {
  ctx.fillStyle = "rgba(220,210,190,0.92)";
  ctx.strokeStyle = "rgba(60,50,35,0.6)";
  ctx.lineWidth = Math.max(1, Math.min(width, height) * 0.06);
  draw();
  ctx.fill();
  ctx.stroke();
}

function createPartCanvas(shape: string, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  if (shape === "head") {
    paint(ctx, width, height, () => {
      ctx.beginPath();
      ctx.ellipse(width / 2, height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
    });
  } else if (shape === "foot") {
    paint(ctx, width, height, () => roundedRect(ctx, width, height, Math.min(width, height) * 0.4));
  } else if (shape === "limb") {
    paint(ctx, width, height, () => roundedRect(ctx, width, height, width * 0.45));
  } else {
    // "torso" and any unrecognised shape key — a plain rounded rect
    // reads fine as a generic body segment placeholder.
    paint(ctx, width, height, () => roundedRect(ctx, width, height, width * 0.2));
  }
  return canvas;
}

export function createPartTexture(shape: string, width: number, height: number): Texture {
  return Texture.from(createPartCanvas(shape, width, height));
}

/** Built once per rig (not per instance) and shared by every PuppetActor
 *  playing it — keyed by part id, since within one rig a part's shape
 *  and size are fixed. Caller owns disposing the textures on teardown. */
export function buildPartTextureCache(rig: LoadedRig): Map<string, Texture> {
  const cache = new Map<string, Texture>();
  for (const part of rig.parts) {
    cache.set(part.id, createPartTexture(part.texture, part.size[0], part.size[1]));
  }
  return cache;
}
