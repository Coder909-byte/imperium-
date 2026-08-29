import { describe, expect, it } from "vitest";
import { parsePathPoints, toLonLat } from "./unproject";

describe("toLonLat", () => {
  it("matches the sanity check called out when the mapping was supplied: latium's centroid lands near Rome", () => {
    const [lon, lat] = toLonLat([424, 295]);
    expect(lon).toBeCloseTo(12.5, 0);
    expect(lat).toBeCloseTo(41.9, 0);
  });

  it("inverts the stated forward equations exactly", () => {
    // x = (lon + 12) * 17.24, y = (60 - lat) * 16.25
    const lon = 3;
    const lat = 45;
    const x = (lon + 12) * 17.24;
    const y = (60 - lat) * 16.25;
    const [roundLon, roundLat] = toLonLat([x, y]);
    expect(roundLon).toBeCloseTo(lon, 2);
    expect(roundLat).toBeCloseTo(lat, 2);
  });
});

describe("parsePathPoints", () => {
  it("parses a closed M/L/.../Z polygon into a point list", () => {
    const points = parsePathPoints("M 408,290 L 428,284 L 440,296 Z");
    expect(points).toEqual([
      [408, 290],
      [428, 284],
      [440, 296],
    ]);
  });

  it("throws on an unsupported command instead of silently dropping it", () => {
    expect(() => parsePathPoints("M 0,0 C 1,1 2,2 3,3 Z")).toThrow(/Unsupported path command/);
  });

  it("throws on a path missing the closing Z", () => {
    expect(() => parsePathPoints("M 0,0 L 1,1")).toThrow(/not closed/);
  });
});
