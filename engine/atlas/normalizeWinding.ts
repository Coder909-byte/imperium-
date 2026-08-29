// GeoJSON's right-hand rule expects a polygon ring's winding direction to
// signal which side is "inside". Get it backwards and a small shape reads
// as its ~4π-steradian complement — "everything except this shape" —
// which is exactly the failure mode real-world shapefile-derived data
// hits: ESRI's shapefile convention winds the opposite way from RFC 7946,
// and not every shapefile→GeoJSON conversion flips it back (Natural
// Earth's didn't, here). Rather than trust every future data source to
// get this right, normalize before projecting: a real geographic feature
// is always the smaller of a ring and its complement.
import { geoArea } from "d3-geo";

function ringArea(ring: GeoJSON.Position[]): number {
  return geoArea({ type: "Polygon", coordinates: [ring] });
}

function normalizePolygonRings(rings: GeoJSON.Position[][]): GeoJSON.Position[][] {
  if (rings.length === 0) return rings;
  const exteriorArea = ringArea(rings[0]);
  if (exteriorArea <= 2 * Math.PI) return rings;
  // Reverse every ring together — holes must stay opposite the exterior,
  // and reversing both preserves that relationship while flipping which
  // side reads as "inside".
  return rings.map((ring) => [...ring].reverse());
}

export function normalizeWinding(geometry: GeoJSON.Geometry): GeoJSON.Geometry {
  if (geometry.type === "Polygon") {
    return { ...geometry, coordinates: normalizePolygonRings(geometry.coordinates) };
  }
  if (geometry.type === "MultiPolygon") {
    // Each component polygon is corrected independently — a MultiPolygon
    // can in principle mix conventions across its parts.
    return { ...geometry, coordinates: geometry.coordinates.map(normalizePolygonRings) };
  }
  return geometry;
}
