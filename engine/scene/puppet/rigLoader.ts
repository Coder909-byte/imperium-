// Resolves a RigDef (plain, content-shaped data — string ids, string
// parent references) into a LoadedRig: index-addressed and root-first
// ordered, with every clip's eases pre-parsed via gsap.parseEase. This
// is the one place string lookups happen; everything downstream
// (jointSolver, clipPlayer, PuppetActor's per-frame tick) works purely
// in part-index arrays, which is what keeps 40+ instances tickable at
// 60fps without per-frame allocation or Map lookups.
//
// content/schema.ts's Rig zod schema already rejects a malformed rig at
// CI time (missing root, dangling parent ref, cyclical ancestry,
// unknown track part) — see CLAUDE.md hard rule #5. The checks below
// are deliberately re-asserted anyway: rigLoader is also the load path
// for /dev/scene-lab's rig inspector, which polls content/rigs/*.json
// straight off disk (see app/api/dev/rig-content) for hot reload while
// someone is actively hand-editing a rig — exactly the moment a
// momentarily-invalid file is most likely, and a clear thrown Error
// beats a silent bad transform.
import { gsap } from "gsap";
import type { LoadedClip, LoadedKeyframe, LoadedPart, LoadedRig, LoadedTrack, RigDef } from "./types";

const DEG_TO_RAD = Math.PI / 180;

export function loadRig(def: RigDef): LoadedRig {
  const roots = def.parts.filter((part) => part.parent === null);
  if (roots.length !== 1) {
    throw new Error(`rig "${def.id}": expected exactly one root part (parent: null), found ${roots.length}`);
  }

  // Root-first topological order: repeatedly take any not-yet-ordered
  // part whose parent is already ordered. O(n^2) worst case, fine for a
  // rig with a handful of parts and loaded once, not per frame.
  const ordered: typeof def.parts = [];
  const orderedIds = new Set<string>();
  while (ordered.length < def.parts.length) {
    const next = def.parts.find(
      (part) => !orderedIds.has(part.id) && (part.parent === null || orderedIds.has(part.parent)),
    );
    if (!next) {
      const stuck = def.parts.filter((part) => !orderedIds.has(part.id)).map((part) => part.id);
      throw new Error(`rig "${def.id}": cyclical or dangling parent reference among [${stuck.join(", ")}]`);
    }
    ordered.push(next);
    orderedIds.add(next.id);
  }

  const indexById = new Map(ordered.map((part, index) => [part.id, index]));
  const parts: LoadedPart[] = ordered.map((part) => ({
    id: part.id,
    parentIndex: part.parent === null ? -1 : (indexById.get(part.parent) ?? -1),
    texture: part.texture,
    pivot: part.pivot,
    size: part.size,
    zOrder: part.zOrder,
    restX: part.rest.x,
    restY: part.rest.y,
    restRotationRad: part.rest.rotation * DEG_TO_RAD,
    restScale: part.rest.scale,
  }));

  const clips = new Map<string, LoadedClip>();
  for (const clipDef of def.clips) {
    const trackByPartIndex: (LoadedTrack | null)[] = parts.map(() => null);
    for (const [partId, keyframeDefs] of Object.entries(clipDef.tracks)) {
      const partIndex = indexById.get(partId);
      if (partIndex === undefined) {
        throw new Error(`rig "${def.id}" clip "${clipDef.id}": unknown part "${partId}"`);
      }
      const keyframes: LoadedKeyframe[] = keyframeDefs.map((kf) => ({
        t: kf.t,
        rotRad: kf.rot * DEG_TO_RAD,
        dx: kf.dx ?? 0,
        dy: kf.dy ?? 0,
        easeFn: gsap.parseEase(kf.ease),
      }));
      trackByPartIndex[partIndex] = { partIndex, keyframes };
    }
    clips.set(clipDef.id, {
      id: clipDef.id,
      durationMs: clipDef.durationMs,
      loop: clipDef.loop,
      trackByPartIndex,
      locomotion: clipDef.locomotion ?? false,
      midlineExemptParts: new Set(clipDef.midlineExemptParts ?? []),
      symmetricPairs: clipDef.symmetricPairs ?? [],
    });
  }

  return { id: def.id, parts, partIndexById: indexById, clips };
}
