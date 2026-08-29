import { geoArea } from "d3-geo";
import { describe, expect, it } from "vitest";
import { normalizeWinding } from "./normalizeWinding";

// GeoJSON's right-hand rule reads [10,40]→[15,40]→[15,45]→[10,45] (right,
// up, left, down — CCW in a lon-right/lat-up plane) as the *large* side.
// Confirmed empirically below, not asserted from memory.
const backwardsSquare: GeoJSON.Position[] = [
  [10, 40],
  [15, 40],
  [15, 45],
  [10, 45],
  [10, 40],
];
const correctSquare: GeoJSON.Position[] = [...backwardsSquare].reverse();

describe("normalizeWinding", () => {
  it("confirms the fixture: GeoJSON's right-hand rule reads a CCW lon/lat ring as the large side", () => {
    expect(geoArea({ type: "Polygon", coordinates: [backwardsSquare] })).toBeGreaterThan(2 * Math.PI);
    expect(geoArea({ type: "Polygon", coordinates: [correctSquare] })).toBeLessThan(2 * Math.PI);
  });

  it("leaves a correctly-wound polygon untouched", () => {
    const geometry: GeoJSON.Geometry = { type: "Polygon", coordinates: [correctSquare] };
    const before = geoArea(geometry);
    const after = normalizeWinding(geometry);
    expect(geoArea(after)).toBeCloseTo(before, 6);
    expect(after).toEqual(geometry);
  });

  it("reverses a polygon wound backwards (shapefile convention) so it reads as the small region", () => {
    const inverted: GeoJSON.Geometry = { type: "Polygon", coordinates: [backwardsSquare] };
    const fixed = normalizeWinding(inverted);
    expect(geoArea(fixed)).toBeLessThan(2 * Math.PI);
  });

  it("keeps a hole opposite its exterior after correcting a backwards MultiPolygon component", () => {
    // Same right/up/left/down point order as backwardsSquare — same
    // rotational sense, so opposite correctSquare's, which is what a
    // proper hole needs.
    const correctHole: GeoJSON.Position[] = [
      [11, 41],
      [12, 41],
      [12, 42],
      [11, 42],
      [11, 41],
    ];
    const exteriorOnlyArea = geoArea({ type: "Polygon", coordinates: [correctSquare] });
    const properArea = geoArea({ type: "Polygon", coordinates: [correctSquare, correctHole] });
    expect(properArea).toBeLessThan(exteriorOnlyArea); // confirms correctHole actually subtracts

    const invertedWithHole: GeoJSON.Geometry = {
      type: "MultiPolygon",
      coordinates: [[[...correctSquare].reverse(), [...correctHole].reverse()]],
    };
    const fixed = normalizeWinding(invertedWithHole);
    expect(geoArea(fixed)).toBeCloseTo(properArea, 6);
  });

  it("passes non-polygon geometries through unchanged", () => {
    const line: GeoJSON.Geometry = {
      type: "LineString",
      coordinates: [
        [0, 0],
        [1, 1],
      ],
    };
    expect(normalizeWinding(line)).toEqual(line);
  });
});
