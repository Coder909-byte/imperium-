// Placeholder-only composition rule: turns a flat depth number into a
// bottom-anchored band size, so a nearer (shorter) plane never fully
// hides a farther one behind it. A full-bleed opaque rectangle per
// plane — the first thing tried here — turned out to make every plane
// but the frontmost permanently invisible (they're all the same size
// and fully cover the frame), which made depth-scaled parallax
// impossible to actually see no matter how correct the offset math was.
// Confirmed the hard way: a real screenshot of beat 1 showed only
// far_hills, not sky, despite both being in visibleLayers (M4 finding).
// Real forged art (M7) already has this shaping baked into the source
// image — this exists only for procedural placeholders.
export interface PlaceholderBand {
  width: number;
  height: number;
  /** Vertical rest offset (ParallaxPlane.setSize) that puts this band's
   *  bottom edge at the overscan box's bottom edge. */
  baseOffsetY: number;
}

const MIN_HEIGHT_FRACTION = 0.3;
const DEPTH_STEEPNESS = 0.7; // tuned by eye against the placeholder region — see HANDHELD_DRIFT for the same caveat

export function computePlaceholderBand(depth: number, overscanWidth: number, overscanHeight: number): PlaceholderBand {
  const clampedDepth = Math.min(1, Math.max(0, depth));
  const heightFraction = Math.max(MIN_HEIGHT_FRACTION, 1 - clampedDepth * DEPTH_STEEPNESS);
  const height = overscanHeight * heightFraction;
  const baseOffsetY = (overscanHeight - height) / 2;
  return { width: overscanWidth, height, baseOffsetY };
}
