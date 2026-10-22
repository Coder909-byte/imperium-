// Low-tier plane cap (PRD §11: "4 planes, halved particles, no godrays
// or chromatic aberration"). Pure — ScenePlayer only constructs
// ParallaxPlane instances for whatever this returns, so a dropped
// plane simply never exists to be toggled by a beat's visibleLayers
// (no special-casing needed at the call site).
import type { DeviceTier } from "../deviceTier";
import type { ScenePlane } from "../types";

const LOW_TIER_MAX_PLANES = 4;

/**
 * On low tier with more planes than the cap, keeps 4 evenly spread
 * across the full depth range (by sorted position, not by depth value)
 * rather than just the first 4 in authoring order — preserves a
 * far/near spread instead of arbitrarily favouring whichever planes an
 * author happened to list first.
 */
export function selectPlanesForTier(planes: readonly ScenePlane[], tier: DeviceTier): ScenePlane[] {
  if (tier === "high") return [...planes];
  // Co-visible atmosphere shares a registered canvas. Baking it once
  // keeps real ground alongside essential structures within four sprites.
  const groups = new Map<string, ScenePlane[]>();
  for (const plane of planes) if (plane.lowTierGroup && plane.assetUrl) {
    groups.set(plane.lowTierGroup, [...(groups.get(plane.lowTierGroup) ?? []), plane]);
  }
  const grouped = planes.flatMap((plane) => {
    const group = plane.lowTierGroup ? groups.get(plane.lowTierGroup) : undefined;
    if (!group || group.length < 2) return [plane];
    const sources = [...group].sort((a, b) => a.depth - b.depth);
    return plane.id === sources[0].id ? [{ ...sources[0], essential: sources.some((source) => source.essential), compositeSources: sources }] : [];
  });
  if (grouped.length <= LOW_TIER_MAX_PLANES) return grouped;

  const sorted = [...grouped].sort((a, b) => a.depth - b.depth);
  const essential = sorted.filter((plane) => plane.essential);
  if (essential.length > 0) {
    const selected = new Set(essential.slice(0, LOW_TIER_MAX_PLANES));
    // Fill remaining slots from the ordinary depth-spread choice. The
    // schema caps essential planes; this still never exceeds four if a
    // non-content caller supplies an invalid set.
    const candidates = selectPlanesForTier(sorted.map((plane) => ({ ...plane, essential: false })), "low");
    for (const candidate of candidates) {
      if (selected.size === LOW_TIER_MAX_PLANES) break;
      const original = sorted.find((plane) => plane.id === candidate.id)!;
      selected.add(original);
    }
    return sorted.filter((plane) => selected.has(plane));
  }
  const lastIndex = sorted.length - 1;
  const picked = new Set<number>();
  for (let i = 0; i < LOW_TIER_MAX_PLANES; i++) {
    picked.add(Math.round((i * lastIndex) / (LOW_TIER_MAX_PLANES - 1)));
  }
  return sorted.filter((_, index) => picked.has(index));
}
