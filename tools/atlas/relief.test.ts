import { describe, expect, it } from "vitest";
import { createProjection } from "../../engine/atlas/projection";
import { ATLAS_VIEWPORT, ATLAS_FIT_EXTENT } from "../../app/atlas/viewport";
import { geographicPixel, sampleBilinear } from "./relief";

describe("georeferenced atlas relief sampling", () => {
  it("uses pixel centres rather than shifting the relief by half a source pixel", () => {
    expect(geographicPixel(-179.98333333333333, 89.98333333333333, 10800, 5400)[0]).toBeCloseTo(0, 8);
    expect(geographicPixel(-179.98333333333333, 89.98333333333333, 10800, 5400)[1]).toBeCloseTo(0, 8);
    expect(geographicPixel(0, 0, 10800, 5400)).toEqual([5399.5, 2699.5]);
  });
  it("bilinearly interpolates channels and clamps the image edge", () => {
    const grid = { width: 2, height: 2, channels: 1, data: new Uint8Array([0, 100, 200, 240]) };
    expect(sampleBilinear(grid, .5, .5, 0)).toBe(135);
    expect(sampleBilinear(grid, -1, -1, 0)).toBe(0);
    expect(sampleBilinear(grid, 8, 8, 0)).toBe(240);
  });
  it("shares the live vector projection at Rome, Alesia, the Alps and Alexandria", () => {
    const projection = createProjection(ATLAS_FIT_EXTENT, ATLAS_VIEWPORT);
    const positions: [number, number][] = [[12.4964, 41.9028], [4.5, 47.5], [8, 46], [29.9187, 31.2001]];
    for (const position of positions) {
      const svg = projection(position);
      expect(svg).not.toBeNull();
      const restored = projection.invert?.(svg!);
      expect(restored?.[0]).toBeCloseTo(position[0], 8);
      expect(restored?.[1]).toBeCloseTo(position[1], 8);
    }
  });
});
