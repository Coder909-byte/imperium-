// Shared shapes passed into AtlasMap and its subcomponents. Plain data —
// no content imports, no React. app/atlas/ adapts content/ JSON into
// these before rendering.

export interface Era {
  year: number; // negative = BC
  label: string; // display: "350 BC"
}

export interface ProjectedProvince {
  id: string;
  name: string;
  latinName: string;
  heldFrom: number;
  heldTo: number | null;
  d: string; // SVG path, in the shared viewport's coordinate space
  labelX: number;
  labelY: number;
}

export interface ProjectedCity {
  id: string;
  name: string;
  latinName: string;
  x: number;
  y: number;
}

export interface ProjectedSeaLabel {
  id: string;
  text: string;
  x: number;
  y: number;
  rotation: number;
}

export interface PhysicalLayers {
  coastline: string[];
  ocean: string[];
  rivers: string[];
  lakes: string[];
}

export interface AtlasMapProps {
  width: number;
  height: number;
  physical: PhysicalLayers;
  provinces: ProjectedProvince[];
  cities: ProjectedCity[];
  seas: ProjectedSeaLabel[];
  eras: Era[]; // exactly four, chronological order — 350 BC, 200 BC, 117 AD, 486 AD
}
