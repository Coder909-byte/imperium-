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
  if (tier === "high" || planes.length <= LOW_TIER_MAX_PLANES) return [...planes];

  const sorted = [...planes].sort((a, b) => a.depth - b.depth);
  const lastIndex = sorted.length - 1;
  const picked = new Set<number>();
  for (let i = 0; i < LOW_TIER_MAX_PLANES; i++) {
    picked.add(Math.round((i * lastIndex) / (LOW_TIER_MAX_PLANES - 1)));
  }
  return sorted.filter((_, index) => picked.has(index));
}
