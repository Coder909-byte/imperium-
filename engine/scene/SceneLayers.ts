import { Container, Texture } from "pixi.js";
import { SceneActors } from "./SceneActors";
import type { FrameTicker } from "./deviceTier";
import type { ScenePlane, RigDef } from "./types";
import { ParallaxPlane } from "./layers/ParallaxPlane";
import { computePlaceholderBand } from "./layers/placeholderBand";
import { createPlaceholderTexture } from "./layers/placeholderTexture";
import { destroyTextures, loadTextures } from "./loadTextures";

/** Textures belong to one scene, never Pixi's global Assets cache.
 * A later scene mount cannot accidentally reuse a destroyed texture. */
export class SceneLayers {
  readonly container = new Container();
  readonly planes = new Map<string, ParallaxPlane>();
  actors: SceneActors | undefined;
  private textures = new Map<string, Texture>();
  private destroyed = false;

  async init(defs: readonly ScenePlane[], rigs: readonly RigDef[], ticker: FrameTicker, stage: { width: number; height: number }): Promise<void> {
    const urls = new Set([
      ...defs.flatMap((plane) => plane.assetUrl ? [plane.assetUrl] : []),
      ...rigs.flatMap((rig) => rig.parts.map((part) => part.texture).filter((texture) => texture.startsWith("/assets/"))),
    ]);
    this.textures = await loadTextures(urls);
    if (this.destroyed) { this.destroy(); return; }
    this.container.sortableChildren = true;
    const width = stage.width * 1.35;
    const height = stage.height * 1.35;
    defs.forEach((def, index) => {
      const band = computePlaceholderBand(def.depth, width, height);
      const texture = def.assetUrl ? this.textures.get(def.assetUrl)! : createPlaceholderTexture({ id: def.id, depth: def.depth, index, width: band.width, height: band.height });
      const plane = new ParallaxPlane({ ...def, texture });
      // Real cut layers share a registered full scene canvas. Never
      // stretch them into the depth bands used only for placeholders.
      plane.setSize(def.assetUrl ? width : band.width, def.assetUrl ? height : band.height, def.assetUrl ? 0 : band.baseOffsetY);
      plane.container.zIndex = def.depth;
      this.container.addChild(plane.container);
      this.planes.set(def.id, plane);
    });
    this.actors = new SceneActors({ layersContainer: this.container, ticker, rigDefs: rigs, textures: this.textures });
  }

  destroy(): void {
    this.destroyed = true;
    this.actors?.destroy();
    for (const plane of this.planes.values()) plane.destroy();
    this.planes.clear();
    destroyTextures(this.textures);
    this.textures.clear();
    if (!this.container.destroyed) this.container.destroy({ children: true });
  }
}
