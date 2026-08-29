// Adapts loaded content into engine/atlas's plain-prop shapes, doing all
// projection server-side — d3-geo never ships to the client bundle.
import { createProjection, projectFeatureCollection, projectGeometry } from "@/engine/atlas/projection";
import type { AtlasMapProps, Era, PhysicalLayers, ProjectedCity, ProjectedProvince, ProjectedSeaLabel } from "@/engine/atlas/types";
import type { AtlasContent } from "./loadContent";

export const ATLAS_VIEWPORT = { width: 1000, height: 620 };

// Fixed so framing doesn't shift depending on which physical features
// happen to fall inside the data's own bounds. Ring order matters here —
// GeoJSON's right-hand rule needs this small rectangle wound so d3-geo
// reads it as the small region it is, not its ~4π-steradian complement
// (verified with geoArea; see tools/unproject.ts for the same class of
// bug on the province rings).
const FIT_EXTENT: GeoJSON.Geometry = {
  type: "Polygon",
  coordinates: [
    [
      [-12, 20],
      [-12, 58],
      [48, 58],
      [48, 20],
      [-12, 20],
    ],
  ],
};

export const ERAS: Era[] = [
  { year: -350, label: "350 BC" },
  { year: -200, label: "200 BC" },
  { year: 117, label: "117 AD" },
  { year: 486, label: "486 AD" },
];

export function buildAtlasProps(content: AtlasContent): AtlasMapProps {
  const projection = createProjection(FIT_EXTENT, ATLAS_VIEWPORT);

  const physical: PhysicalLayers = {
    coastline: projectFeatureCollection(content.physical.coastline, projection, (_f, i) => `coastline-${i}`).map((f) => f.d),
    ocean: projectFeatureCollection(content.physical.ocean, projection, (_f, i) => `ocean-${i}`).map((f) => f.d),
    rivers: projectFeatureCollection(content.physical.rivers, projection, (_f, i) => `rivers-${i}`).map((f) => f.d),
    lakes: projectFeatureCollection(content.physical.lakes, projection, (_f, i) => `lakes-${i}`).map((f) => f.d),
  };

  const provinces: ProjectedProvince[] = content.provinces.flatMap((province) => {
    const d = projectGeometry(province.geometry, projection);
    const label = projection(province.labelCentroid);
    if (!d || !label) return [];
    return [
      {
        id: province.id,
        name: province.name,
        latinName: province.latinName,
        heldFrom: province.heldFrom,
        heldTo: province.heldTo,
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
