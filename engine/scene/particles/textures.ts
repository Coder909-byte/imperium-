// Procedural particle textures (PRD constraint: no raster assets for
// particles) — drawn directly to an HTMLCanvasElement and wrapped as a
// Pixi Texture, the same technique layers/placeholderTexture.ts already
// uses for plane art. Needs a real DOM canvas, so — like
// placeholderTexture.ts — this isn't unit-tested; verified visually
// (dev/scene-lab) and in e2e.
//
// Two shapes cover all six emitters (see particles/types.ts's
// ParticleTextureKind comment): each config differentiates itself with
// scale/tint/motion, not a bespoke texture per fx kind.
import { Texture } from "pixi.js";
import type { ParticleTextureKind } from "./types";

const SIZE = 64;

function createSoftDotCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const gradient = ctx.createRadialGradient(SIZE / 2, SIZE / 2, 0, SIZE / 2, SIZE / 2, SIZE / 2);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.5, "rgba(255,255,255,0.5)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, SIZE, SIZE);
  return canvas;
}

function createStreakCanvas(): HTMLCanvasElement {
  // Wide canvas, narrow bright core — a horizontal streak. Particle
  // rotation (set per-instance by each emitter config) angles it to
  // whatever direction that emitter travels.
  const width = SIZE * 3;
  const height = SIZE / 2;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, "rgba(255,255,255,0)");
  gradient.addColorStop(0.5, "rgba(255,255,255,0.9)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(width / 2, height / 2, width / 2, height / 3, 0, 0, Math.PI * 2);
  ctx.fill();
  return canvas;
}

export function createParticleTexture(kind: ParticleTextureKind): Texture {
  const canvas = kind === "soft-dot" ? createSoftDotCanvas() : createStreakCanvas();
  return Texture.from(canvas);
}
