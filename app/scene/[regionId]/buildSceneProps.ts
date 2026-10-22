// Adapts loaded content into engine/scene's plain-prop shapes — the
// same split app/atlas/buildAtlasProps.ts uses for engine/atlas.
// Source citations travel unchanged into the per-beat drawer.
// `fx`/`lightSource` and the region's `lut` are
// M5 (post chain + particles); `actors` and `rigs` are M6 (puppets).
import type { ManifestEntry, Region, Rig } from "@/content/schema";
import { approvedAssetUrl } from "@/content/assetReferences";
import type { RigDef, SceneRegion } from "@/engine/scene/types";

// Exported for /dev/scene-lab's rig inspector, which loads a single rig
// outside the context of any region/beat.
export function adaptRig(rig: Rig, manifest?: ManifestEntry[]): RigDef {
  return {
    id: rig.id,
    parts: rig.parts.map((part) => ({
      id: part.id,
      parent: part.parent,
      texture: !manifest || ["torso", "head", "limb", "foot"].includes(part.texture) ? part.texture : (() => {
        const url = approvedAssetUrl(part.texture, manifest);
        if (!url) throw new Error(`Unapproved rig texture: ${part.texture}`);
        return url;
      })(),
      pivot: part.pivot,
      size: part.size,
      zOrder: part.zOrder,
      rest: { x: part.rest.x, y: part.rest.y, rotation: part.rest.rotation, scale: part.rest.scale },
    })),
    clips: rig.clips.map((clip) => ({
      id: clip.id,
      durationMs: clip.durationMs,
      loop: clip.loop,
      tracks: Object.fromEntries(
        Object.entries(clip.tracks).map(([partId, keyframes]) => [
          partId,
          keyframes.map((kf) => ({ t: kf.t, rot: kf.rot, dx: kf.dx, dy: kf.dy, ease: kf.ease })),
        ]),
      ),
      locomotion: clip.locomotion,
      midlineExemptParts: clip.midlineExemptParts,
      symmetricPairs: clip.symmetricPairs,
    })),
  };
}

export function buildSceneProps(region: Region, rigs: Rig[] = [], manifest: ManifestEntry[] = []): SceneRegion {
  return {
    id: region.id,
    name: region.name,
    lut: region.scene.lut,
    planes: region.scene.planes.map((plane) => {
      const assetUrl = plane.placeholder ? undefined : approvedAssetUrl(plane.asset, manifest);
      if (!plane.placeholder && !assetUrl) throw new Error(`Unapproved scene plane: ${plane.asset}`);
      return {
      id: plane.id,
      assetUrl,
      depth: plane.depth,
      tint: plane.tint,
      blur: plane.blur,
      };
    }),
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
        durationMode: beat.camera.durationMode,
        ease: beat.camera.ease,
      },
      fx: beat.fx,
      lightSource: beat.lightSource,
      sources: beat.sources,
      audio: beat.audio,
      actors: beat.actors.map((actor) => ({
        rig: actor.rig,
        clip: actor.clip,
        x: actor.x,
        y: actor.y,
        scale: actor.scale,
        count: actor.count,
        flip: actor.flip,
        phase: actor.phase,
        depth: actor.depth,
      })),
    })),
    rigs: rigs.map((rig) => adaptRig(rig, manifest)),
    audio: {
      ambientBed: region.scene.ambientBed,
      assets: Object.fromEntries(Object.entries(region.scene.audioAssets).flatMap(([id, asset]) => {
        const url = approvedAssetUrl(asset, manifest);
        return url ? [[id, url]] : [];
      })),
    },
  };
}
