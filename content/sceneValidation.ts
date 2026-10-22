import type { Region, Rig } from "./schema";
import { LUT_PRESETS } from "../engine/scene/post/lut";

/** Cross-file checks belong outside the shape schema: engine stays
 * content-independent, while validation sees the complete rig catalog. */
export function validateSceneReferences(region: Region, rigs: readonly Rig[]): string[] {
  const issues: string[] = [];
  if (!Object.hasOwn(LUT_PRESETS, region.scene.lut)) issues.push(`unknown LUT "${region.scene.lut}"`);
  const rigMap = new Map(rigs.map((rig) => [rig.id, rig]));
  for (const beat of region.beats) {
    for (const actor of beat.actors) {
      const rig = rigMap.get(actor.rig);
      if (!rig) issues.push(`${beat.id}: unknown rig "${actor.rig}"`);
      else if (!rig.clips.some((clip) => clip.id === actor.clip)) {
        issues.push(`${beat.id}: unknown clip "${actor.clip}" on rig "${actor.rig}"`);
      }
      // Painted crowds bake the authored loop; procedural crowds still
      // have only their explicit generic march atlas.
      const paintedLoop = rig && rig.parts.every((part) => part.texture.endsWith(".webp"))
        && rig.clips.some((clip) => clip.id === actor.clip && clip.loop);
      if (actor.count > 1 && actor.clip !== "march" && !paintedLoop) issues.push(`${beat.id}: crowds require march or a painted looping clip`);
    }
  }
  return issues;
}
