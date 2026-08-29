import { describe, expect, it } from "vitest";
import { createProjection, projectFeatureCollection, projectGeometry } from "./projection";

const romeBoxExtent: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-10, 20],
            [40, 20],
            [40, 55],
            [-10, 55],
            [-10, 20],
          ],
        ],
      },
    },
  ],
};

const triangleNearRome: GeoJSON.Geometry = {
  type: "Polygon",
  coordinates: [
    [
      [12, 41],
      [13, 41],
      [12.5, 42],
      [12, 41],
    ],
  ],
};

describe("createProjection + projectGeometry", () => {
  it("produces a well-formed SVG path string", () => {
    const projection = createProjection(romeBoxExtent, { width: 800, height: 500 });
    const d = projectGeometry(triangleNearRome, projection);
    expect(d).not.toBeNull();
    expect(d).toMatch(/^M[-\d.,]/);
  });

  it("is deterministic — same input always produces the same output", () => {
    const projectionA = createProjection(romeBoxExtent, { width: 800, height: 500 });
    const projectionB = createProjection(romeBoxExtent, { width: 800, height: 500 });
    const dA = projectGeometry(triangleNearRome, projectionA);
    const dB = projectGeometry(triangleNearRome, projectionB);
    expect(dA).toBe(dB);
  });

  it("keeps projected points inside the fitted viewport", () => {
    const width = 800;
    const height = 500;
    const padding = 20;
    const projection = createProjection(romeBoxExtent, { width, height }, padding);
    const projected = projection([12.5, 41.5]);
    expect(projected).not.toBeNull();
    const [x, y] = projected as [number, number];
    expect(x).toBeGreaterThanOrEqual(padding - 1);
    expect(x).toBeLessThanOrEqual(width - padding + 1);
    expect(y).toBeGreaterThanOrEqual(padding - 1);
    expect(y).toBeLessThanOrEqual(height - padding + 1);
  });
});

describe("projectFeatureCollection", () => {
  const projection = createProjection(romeBoxExtent, { width: 800, height: 500 });

  it("pairs each projected feature with an id from getId", () => {
    const collection: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [
        { type: "Feature", properties: { id: "a" }, geometry: triangleNearRome },
        { type: "Feature", properties: { id: "b" }, geometry: triangleNearRome },
      ],
    };

    const results = projectFeatureCollection(collection, projection, (feature) => feature.properties!.id);
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.id)).toEqual(["a", "b"]);
    expect(results[0].d).toBe(results[1].d); // identical geometry projects identically
  });

  it("drops features that fail to project instead of emitting a null d", () => {
    const degenerate: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { id: "empty" },
          geometry: { type: "Polygon", coordinates: [] },
        },
      ],
    };

    const results = projectFeatureCollection(degenerate, projection, (feature) => feature.properties!.id);
    expect(results).toEqual([]);
  });
});
