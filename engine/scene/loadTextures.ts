import { Texture } from "pixi.js";

export function destroyTextures(textures: ReadonlyMap<string, Texture>): void {
  for (const texture of textures.values()) if (!texture.destroyed) texture.destroy(true);
}

export async function loadTextures(urls: Iterable<string>): Promise<Map<string, Texture>> {
  const textures = new Map<string, Texture>();
  const results = await Promise.allSettled([...new Set(urls)].map(async (url) => {
    const image = new Image();
    image.src = url;
    await image.decode();
    textures.set(url, Texture.from(image));
  }));
  // Settle every load before propagating failure so late resolutions
  // cannot leak a texture after a partial-load cleanup.
  if (results.some((result) => result.status === "rejected")) {
    destroyTextures(textures);
    throw new Error("Scene artwork could not load. Reload to retry.");
  }
  return textures;
}
