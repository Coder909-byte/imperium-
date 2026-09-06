// Per-scene colour grade presets (PRD §3/§4, M5) — the thing that
// actually unifies mixed painted sources into one coherent image (ADR
// 003), not decoration. Keyed by content/schema.ts's Region.scene.lut.
//
// Expressed as plain data (an ordered list of ColorMatrixFilter method
// calls) rather than hand-written 5x4 matrices, so a preset reads as
// "what mood is this" instead of opaque numbers, and so this file stays
// pure and unit-testable without ever constructing a real
// ColorMatrixFilter (which needs a WebGL-capable canvas at construction
// time — see ParallaxPlane.test.ts's note on the same constraint).
export type LutOpName = "brightness" | "contrast" | "saturate" | "hue" | "tint";

export interface LutOp {
  op: LutOpName;
  /** Numeric for brightness/contrast/saturate/hue; a hex colour string for tint. */
  value: number | string;
}

export interface LutPreset {
  label: string;
  ops: readonly LutOp[];
}

// Four distinct moods (M5 acceptance criterion). Values are eyeballed
// starting points, same "tuned by eye, not measured" honesty as
// Camera.ts's HANDHELD_DRIFT — expect these to move once real painted
// planes (M8) exist to grade against instead of placeholder rectangles.
export const LUT_PRESETS: Record<string, LutPreset> = {
  cold_overcast: {
    label: "Cold overcast",
    ops: [
      { op: "brightness", value: 0.95 },
      { op: "contrast", value: 0.52 },
      { op: "saturate", value: -0.15 },
      { op: "tint", value: "#d8e2ea" },
    ],
  },
  warm_dusk: {
    label: "Warm dusk",
    ops: [
      { op: "brightness", value: 1.04 },
      { op: "contrast", value: 0.58 },
      { op: "saturate", value: 0.1 },
      { op: "hue", value: -6 },
      { op: "tint", value: "#ffdba8" },
    ],
  },
  night: {
    label: "Night",
    ops: [
      { op: "brightness", value: 0.6 },
      { op: "contrast", value: 0.62 },
      { op: "saturate", value: -0.4 },
      { op: "tint", value: "#2c3c5c" },
    ],
  },
  arid_heat: {
    label: "Arid heat",
    ops: [
      { op: "brightness", value: 1.08 },
      { op: "contrast", value: 0.56 },
      { op: "saturate", value: -0.05 },
      { op: "hue", value: 14 },
      { op: "tint", value: "#ffe3ad" },
    ],
  },
};

export const DEFAULT_LUT_KEY = "cold_overcast";

/** Content's `lut` string isn't Zod-enum-constrained (any region can name
 *  any key), and existing content predates these four presets (gallia.json
 *  ships "engraving_dust", placeholder.json shipped "none") — falling
 *  back rather than throwing keeps malformed/legacy content a validate-
 *  time concern only where the schema actually enforces it (CLAUDE.md
 *  rule 5), not a runtime crash here. */
export function resolveLutKey(key: string): string {
  return key in LUT_PRESETS ? key : DEFAULT_LUT_KEY;
}

// The subset of ColorMatrixFilter's real API this file drives — narrowed
// so applyLutPreset can be unit-tested against a plain fake object
// instead of a real filter (construction alone requires a WebGL-capable
// canvas; see ParallaxPlane.test.ts).
export interface ColorMatrixLike {
  reset(): void;
  brightness(b: number, multiply: boolean): void;
  contrast(amount: number, multiply: boolean): void;
  saturate(amount: number, multiply: boolean): void;
  hue(rotation: number, multiply: boolean): void;
  tint(color: string | number, multiply?: boolean): void;
}

/** Resets the filter to identity, then replays a preset's ops with
 *  `multiply: true` so they compose. Safe to call repeatedly on the same
 *  live filter instance (scene-lab's LUT preview swap does exactly
 *  this) — never rebuilds the filter, only mutates its matrix. */
export function applyLutPreset(filter: ColorMatrixLike, key: string): void {
  const preset = LUT_PRESETS[resolveLutKey(key)];
  filter.reset();
  for (const { op, value } of preset.ops) {
    switch (op) {
      case "brightness":
        filter.brightness(value as number, true);
        break;
      case "contrast":
        filter.contrast(value as number, true);
        break;
      case "saturate":
        filter.saturate(value as number, true);
        break;
      case "hue":
        filter.hue(value as number, true);
        break;
      case "tint":
        filter.tint(value as string, true);
        break;
    }
  }
}
