// GeoJSON → SVG path strings via d3-geo. Pure functions only — no React,
// no content imports (CLAUDE.md hard rule #1). Callers (a Server Component
// in app/atlas/) load content and geometry, then hand it to these
// functions as plain arguments.
import { geoConicConformal, geoPath, type GeoProjection } from "d3-geo";
import { normalizeWinding } from "./normalizeWinding";

export interface Viewport {
  width: number;
  height: number;
}

// Conic conformal, centred on the Mediterranean (~15°E, 38°N), not Albers.
// Albers is equal-area and built for a projection with large latitudinal
// spread (its classic use is the continental US); at Roman-empire scale
// conic conformal preserves angles and coastline shape, which is what a
// period-atlas look actually needs.
const STANDARD_PARALLELS: [number, number] = [30, 45];
const CENTER: [number, number] = [15, 38]; // [lon, lat]

function normalizeExtent(
  extent: GeoJSON.FeatureCollection | GeoJSON.Geometry,
): GeoJSON.FeatureCollection | GeoJSON.Geometry {
  if (extent.type === "FeatureCollection") {
    return {
      ...extent,
      features: extent.features.map((feature) =>
        feature.geometry ? { ...feature, geometry: normalizeWinding(feature.geometry) } : feature,
      ),
    };
  }
  return normalizeWinding(extent);
}

/**
 * Builds a conic conformal projection fitted to `extent`. Every layer
 * that should line up pixel-for-pixel (physical basemap, provinces,
 * cities, sea labels) must be projected through the *same* projection
 * instance — fit it once against the combined extent and reuse it.
 *
 * `extent`'s polygon rings are winding-normalized first: fitExtent's
 * bounds computation is just as sensitive to backwards winding as fill
 * rendering is (a mis-wound extent inflates to its ~4π-steradian
 * complement and collapses the whole map to a point — this is not a
 * hypothetical, it happened during M1 development with a hand-authored
 * extent rectangle).
 */
export function createProjection(
  extent: GeoJSON.FeatureCollection | GeoJSON.Geometry,
  viewport: Viewport,
  padding = 20,
): GeoProjection {
  return geoConicConformal()
    .parallels(STANDARD_PARALLELS)
    .rotate([-CENTER[0], 0])
    .center([0, CENTER[1]])
    .fitExtent(
      [
        [padding, padding],
        [viewport.width - padding, viewport.height - padding],
      ],
      normalizeExtent(extent),
    );
}

/**
 * Projects one geometry to an SVG path `d` string. `null` when the path
 * generator can't render the geometry at all (e.g. degenerate input) —
 * callers decide whether that's fatal or skippable. Ring winding is
 * normalized first — see normalizeWinding.ts.
 */
export function projectGeometry(geometry: GeoJSON.Geometry, projection: GeoProjection): string | null {
  return geoPath(projection)(normalizeWinding(geometry));
}

export interface ProjectedFeature {
  id: string;
  d: string;
}

/**
 * Projects every feature in a collection, pairing each projected path
 * with an id from `getId`. Features that fail to project (or carry no
 * geometry) are dropped rather than handing the caller a `d: null` to
 * guard against everywhere.
 */
export function projectFeatureCollection(
  collection: GeoJSON.FeatureCollection,
  projection: GeoProjection,
  getId: (feature: GeoJSON.Feature, index: number) => string,
): ProjectedFeature[] {
  const path = geoPath(projection);
  const results: ProjectedFeature[] = [];
  collection.features.forEach((feature, index) => {
    if (!feature.geometry) return;
    const d = path(normalizeWinding(feature.geometry));
    if (d) {
      results.push({ id: getId(feature, index), d });
    }
  });
  return results;
}
