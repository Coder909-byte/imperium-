// Procedural placeholder plane art (M4 — "no real art exists yet...
// clearly labelled as placeholders"). Draws directly to an
// HTMLCanvasElement and wraps it as a Pixi Texture; there is
// deliberately no asset fetch here at all — `ScenePlane.asset` in real
// content will name a forged (M7) WebP file, but until that pipeline
// exists every plane, regardless of what `asset` says, renders as one
// of these. Needs a real DOM canvas, so unlike placeholderColor.ts this
// isn't unit-tested — verified visually (dev/scene-lab) and in e2e.
import { Texture } from "pixi.js";
import { pickPlaceholderColor } from "./placeholderColor";

export interface PlaceholderTextureOptions {
  id: string;
  depth: number;
  index: number;
  width: number;
  height: number;
}

export function createPlaceholderTexture(options: PlaceholderTextureOptions): Texture {
  const { id, depth, index, width, height } = options;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext("2d");
  if (!ctx) return Texture.WHITE;

  const color = pickPlaceholderColor(depth, index);
  ctx.fillStyle = color.css;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // A coarse diagonal hatch, density tied to depth, so adjacent planes
  // remain distinguishable even for a viewer who can't easily judge
  // colour (and so the "clearly a placeholder" intent reads even in a
  // screenshot, not just in motion).
  const spacing = 40 - depth * 24; // near planes (depth->1) get a tighter hatch
  ctx.strokeStyle = "rgba(0, 0, 0, 0.18)";
  ctx.lineWidth = 2;
  for (let x = -canvas.height; x < canvas.width; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + canvas.height, canvas.height);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, canvas.width - 3, canvas.height - 3);

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
  ctx.font = "bold 28px sans-serif";
  ctx.fillText(`PLACEHOLDER — ${id}`, canvas.width / 2, canvas.height / 2 - 16);
  ctx.font = "20px sans-serif";
  ctx.fillText(`depth ${depth.toFixed(2)}`, canvas.width / 2, canvas.height / 2 + 16);

  return Texture.from(canvas);
}
