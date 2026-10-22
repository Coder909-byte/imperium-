import { Texture } from "pixi.js";
import type { ScenePlane } from "../types";

/** A transient render texture, made only from already approved images.
 * It is owned and destroyed by its plane; no extra asset is downloaded. */
export function compositeAtmosphere(sources: readonly ScenePlane[], textures: ReadonlyMap<string, Texture>): Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 1440;
  canvas.height = Math.round(canvas.width * 9 / 21);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Atmospheric composition needs a canvas context");
  for (const source of sources) {
    const texture = source.assetUrl ? textures.get(source.assetUrl) : undefined;
    const image = texture?.source.resource;
    if (!(image instanceof HTMLImageElement)) throw new Error("Atmospheric composition needs a loaded image");
    const fit = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
    const width = image.naturalWidth * fit;
    const height = image.naturalHeight * fit;
    ctx.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
  }
  return Texture.from(canvas);
}
