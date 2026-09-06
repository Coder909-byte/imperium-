// Adapts loaded content into engine/scene's plain-prop shapes — the
// same split app/atlas/buildAtlasProps.ts uses for engine/atlas.
// `actors`/`audio`/`sources` exist on content/schema.ts's Beat but
// aren't carried through: the engine doesn't render them yet
// (puppets: M6, audio: M10) — see engine/scene/types.ts. `fx`/
// `lightSource` and the region's `lut` are new in M5 (post chain +
// particles).
import type { Region } from "@/content/schema";
import type { SceneRegion } from "@/engine/scene/types";

export function buildSceneProps(region: Region): SceneRegion {
  return {
    id: region.id,
    name: region.name,
    lut: region.scene.lut,
    planes: region.scene.planes.map((plane) => ({
      id: plane.id,
      depth: plane.depth,
      tint: plane.tint,
      blur: plane.blur,
    })),
    beats: region.beats.map((beat) => ({
      id: beat.id,
      year: beat.year,
      headline: beat.headline,
      body: beat.body,
      visibleLayers: beat.visibleLayers,
      camera: {
        x: beat.camera.x,
        y: beat.camera.y,
        scale: beat.camera.scale,
        durationMs: beat.camera.durationMs,
        ease: beat.camera.ease,
      },
      fx: beat.fx,
      lightSource: beat.lightSource,
    })),
  };
}
