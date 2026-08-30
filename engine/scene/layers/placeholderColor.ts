// Deterministic, depth-coded colour for placeholder plane textures (M4 —
// "no raster assets — placeholders are procedural"). Depth alone drives
// hue (far = cool blue, near = warm orange) so that moving the pointer
// and watching depth-scaled parallax is actually legible even before any
// real art exists: two planes with similar depth would otherwise be
// impossible to tell apart, which would make it impossible to tell
// whether the parallax offset math is even working. Index nudges
// lightness so same-depth planes (rare, but the schema allows it) still
// separate visually.
//
// Pure — no canvas, no Pixi — so this is unit-testable; the actual
// canvas drawing lives in placeholderTexture.ts, which isn't (needs a
// real DOM canvas — verified visually/in e2e instead, per the existing
// convention of not adding jsdom for one file).

export interface PlaceholderColor {
  r: number;
  g: number;
  b: number;
  css: string;
}

const FAR_HUE = 210; // cool blue
const NEAR_HUE = 25; // warm orange
const SATURATION = 0.55;
const BASE_LIGHTNESS = 0.42;
const LIGHTNESS_STEP = 0.06; // per index, alternating — separates same-depth planes

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let [r, g, b] = [0, 0, 0];
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
}

export function pickPlaceholderColor(depth: number, index: number): PlaceholderColor {
  const clampedDepth = Math.min(1, Math.max(0, depth));
  const hue = FAR_HUE + (NEAR_HUE - FAR_HUE) * clampedDepth;
  // Alternate up/down from the base so consecutive indices at the same
  // depth diverge rather than drifting monotonically lighter.
  const direction = index % 2 === 0 ? 1 : -1;
  const lightness = Math.min(0.75, Math.max(0.2, BASE_LIGHTNESS + direction * Math.ceil((index + 1) / 2) * LIGHTNESS_STEP));
  const { r, g, b } = hslToRgb(hue, SATURATION, lightness);
  return { r, g, b, css: `rgb(${r}, ${g}, ${b})` };
}
