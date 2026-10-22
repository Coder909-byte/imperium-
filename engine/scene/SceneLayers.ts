import { Container, Texture } from "pixi.js";
import { SceneActors } from "./SceneActors";
import type { FrameTicker } from "./deviceTier";
import type { ScenePlane, RigDef } from "./types";
import { ParallaxPlane } from "./layers/ParallaxPlane";
import { computePlaceholderBand } from "./layers/placeholderBand";
import { createPlaceholderTexture } from "./layers/placeholderTexture";
import { compositeAtmosphere } from "./layers/compositeAtmosphere";
import { destroyTextures, loadTextures } from "./loadTextures";
import { SCENE_SPACE, SCENE_OVERSCAN } from "./sceneSpace";

/** Textures belong to one scene, never Pixi's global Assets cache.
 * A later scene mount cannot accidentally reuse a destroyed texture. */
export class SceneLayers {
  readonly container = new Container();
  readonly planes = new Map<string, ParallaxPlane>();
  actors: SceneActors | undefined;
  private textures = new Map<string, Texture>();
  private destroyed = false;
  private debugArt = false;

  async init(defs: readonly ScenePlane[], rigs: readonly RigDef[], ticker: FrameTicker, debugArt = false): Promise<void> {
    this.debugArt = debugArt;
    const urls = new Set([
      ...defs.flatMap((plane) => (plane.compositeSources ?? [plane]).flatMap((source) => source.assetUrl ? [source.assetUrl] : [])),
      ...rigs.flatMap((rig) => rig.parts.map((part) => part.texture).filter((texture) => texture.startsWith("/assets/"))),
    ]);
    this.textures = await loadTextures(urls);
    if (this.destroyed) { this.destroy(); return; }
    this.container.sortableChildren = true;
    defs.forEach((def, index) => {
      this.addPlane(def, index, defs.some((plane) => plane.assetUrl));
    });
    this.actors = new SceneActors({ layersContainer: this.container, ticker, rigDefs: rigs, textures: this.textures });
  }

  /** Reuses decoded sources when the frame monitor downgrades a high
   * scene. Dropping the ground before baking it would recreate the bug. */
  applyLowTier(defs: readonly ScenePlane[]): void {
    const allowed = new Set(defs.map((def) => def.id));
    defs.forEach((def, index) => {
      if (!def.compositeSources) return;
      const old = this.planes.get(def.id);
      const visible = old?.getVisible() ?? false;
      old?.destroy();
      this.addPlane(def, index, true).setVisible(visible, 0);
    });
    for (const [id, plane] of this.planes) if (!allowed.has(id)) {
      plane.destroy();
      this.planes.delete(id);
    }
  }

  private addPlane(def: ScenePlane, index: number, hasArt: boolean): ParallaxPlane {
    const width = SCENE_SPACE.width * SCENE_OVERSCAN;
    const height = SCENE_SPACE.height * SCENE_OVERSCAN;
    const band = computePlaceholderBand(def.depth, width, height);
    const texture = def.compositeSources ? compositeAtmosphere(def.compositeSources, this.textures)
      : def.assetUrl ? this.textures.get(def.assetUrl)! : createPlaceholderTexture({ id: def.id, depth: def.depth, index, width: band.width, height: band.height, translucent: hasArt, debugLabels: this.debugArt });
    const plane = new ParallaxPlane({ ...def, texture, ownsTexture: !!def.compositeSources || !def.assetUrl });
    // Real cut layers share a registered full scene canvas. Never
    // stretch them into the depth bands used only for placeholders.
    const fit = Math.max(width / texture.width, height / texture.height);
    plane.setSize(def.assetUrl ? texture.width * fit : band.width, def.assetUrl ? texture.height * fit : band.height, (def.assetUrl ? 0 : band.baseOffsetY) + (def.offsetY ?? 0), def.offsetX ?? 0);
    plane.container.zIndex = def.depth;
    this.container.addChild(plane.container);
    this.planes.set(def.id, plane);
    return plane;
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
