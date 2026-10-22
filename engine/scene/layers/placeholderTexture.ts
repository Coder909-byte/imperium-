// Explicit missing-art previews. Labels and bounds belong to scene-lab;
// the public player retains its separate artwork-in-progress notice.
import { Texture } from "pixi.js";
import { pickPlaceholderColor } from "./placeholderColor";

export interface PlaceholderTextureOptions {
  id: string;
  depth: number;
  index: number;
  width: number;
  height: number;
  /** Missing structures must not cover the approved painted scenery. */
  translucent?: boolean;
  debugLabels?: boolean;
}

export function createPlaceholderTexture(options: PlaceholderTextureOptions): Texture {
  const { id, depth, index, width, height } = options;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext("2d");
  if (!ctx) return Texture.WHITE;

  const color = pickPlaceholderColor(depth, index);
  ctx.globalAlpha = options.translucent ? 0.08 : 1;
  ctx.fillStyle = color.css;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalAlpha = 1;

  // A coarse diagonal hatch, density tied to depth, so adjacent planes
  // remain distinguishable even for a viewer who can't easily judge
  // colour (and so the "clearly a placeholder" intent reads even in a
  // screenshot, not just in motion).
  const spacing = 40 - depth * 24; // near planes (depth->1) get a tighter hatch
  ctx.strokeStyle = "rgba(0, 0, 0, 0.18)";
  ctx.lineWidth = 2;
  for (let x = -canvas.height; !options.translucent && x < canvas.width; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + canvas.height, canvas.height);
    ctx.stroke();
  }

  if (options.debugLabels) {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, canvas.width - 3, canvas.height - 3);

    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
    ctx.font = "18px sans-serif";
    const labelY = options.translucent ? 26 : canvas.height / 2 - 16;
    ctx.fillStyle = "rgba(8, 10, 10, 0.8)";
    ctx.fillRect(canvas.width / 2 - 150, labelY - 21, 300, 30);
    ctx.fillStyle = "#e2dfd5";
    ctx.fillText(`PLACEHOLDER — ${id}`, canvas.width / 2, labelY);
  }

  return Texture.from(canvas);
}
