import manifest from "@/content/assets/manifest.json";
import { ManifestEntry } from "@/content/schema";
import { approvedAssetUrl } from "@/content/assetReferences";
import { geoGraticule } from "d3-geo";
// Adapts loaded content into engine/atlas's plain-prop shapes, doing all
// projection server-side — d3-geo never ships to the client bundle.
import { createProjection, projectFeatureCollection, projectGeometry } from "@/engine/atlas/projection";
import type { AtlasMapProps, Era, PhysicalLayers, ProjectedCity, ProjectedProvince, ProjectedSeaLabel } from "@/engine/atlas/types";
import type { AtlasContent } from "./loadContent";

import { ATLAS_VIEWPORT, ATLAS_FIT_EXTENT } from "./viewport";
export { ATLAS_VIEWPORT } from "./viewport";

export const ERAS: Era[] = [
  { year: -350, label: "350 BC" },
  { year: -200, label: "200 BC" },
  { year: 117, label: "117 AD" },
  { year: 486, label: "486 AD" },
];

export function buildAtlasProps(content: AtlasContent): AtlasMapProps {
  const projection = createProjection(ATLAS_FIT_EXTENT, ATLAS_VIEWPORT);

  const reliefUrl = approvedAssetUrl("atlas/natural-earth-relief.webp", manifest.map(entry => ManifestEntry.parse(entry)));
  if (!reliefUrl) throw new Error("Atlas relief requires a reviewed public-domain manifest entry");
  const physical: PhysicalLayers = {
    reliefUrl,
    graticule: projectGeometry(geoGraticule().extent([[-30, 8], [68, 70]]).step([10, 10])(), projection) ?? undefined,
    coastline: projectFeatureCollection(content.physical.coastline, projection, (_f, i) => `coastline-${i}`).map((f) => f.d),
    ocean: projectFeatureCollection(content.physical.ocean, projection, (_f, i) => `ocean-${i}`).map((f) => f.d),
    rivers: projectFeatureCollection(content.physical.rivers, projection, (_f, i) => `rivers-${i}`).map((f) => f.d),
    lakes: projectFeatureCollection(content.physical.lakes, projection, (_f, i) => `lakes-${i}`).map((f) => f.d),
  };

  const provinces: ProjectedProvince[] = content.provinces.flatMap((province) => {
    const d = projectGeometry(province.geometry, projection);
    const label = projection(province.labelCentroid);
    if (!d || !label) return [];
    const region = content.regions.find((region) => region.id === province.id);
    return [
      {
        id: province.id,
        name: province.name,
        latinName: province.latinName,
        heldFrom: province.heldFrom,
        heldTo: province.heldTo,
        scene: region ? { beatCount: region.beats.length, year: region.beats[0].year } : null,
        d,
        labelX: label[0],
        labelY: label[1],
      },
    ];
  });

  const cities: ProjectedCity[] = content.cities.flatMap((city) => {
    const point = projection(city.position);
    if (!point) return [];
    return [{ id: city.id, name: city.name, latinName: city.latinName, x: point[0], y: point[1] }];
  });

  const seas: ProjectedSeaLabel[] = content.seas.flatMap((sea) => {
    const point = projection(sea.position);
    if (!point) return [];
    return [{ id: sea.id, text: sea.text, x: point[0], y: point[1], rotation: sea.rotation }];
  });

  return {
    width: ATLAS_VIEWPORT.width,
    height: ATLAS_VIEWPORT.height,
    physical,
    provinces,
    cities,
    seas,
    eras: ERAS,
  };
}
