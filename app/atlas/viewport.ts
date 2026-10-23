// Shared by the server vector adapter and offline relief preparation.
export const ATLAS_VIEWPORT = { width: 1000, height: 620 };

export const ATLAS_FIT_EXTENT: GeoJSON.Geometry = {
  type: "Polygon",
  coordinates: [[[-12, 20], [-12, 58], [48, 58], [48, 20], [-12, 20]]],
};
