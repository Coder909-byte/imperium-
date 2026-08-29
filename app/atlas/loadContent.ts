// Server-only: reads content/borders/* from disk. app/ is allowed to
// import content/ — the hard rule (CLAUDE.md #1) is that engine/ never
// does. Every JSON value is parsed through its Zod schema before this
// module hands it to anything else, per "no any — use unknown and narrow".
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Province, City, SeaLabel } from "@/content/schema";

const CONTENT_ROOT = join(process.cwd(), "content", "borders");

export interface AtlasContent {
  physical: {
    coastline: GeoJSON.FeatureCollection;
    ocean: GeoJSON.FeatureCollection;
    rivers: GeoJSON.FeatureCollection;
    lakes: GeoJSON.FeatureCollection;
  };
  provinces: Province[];
  cities: City[];
  seas: SeaLabel[];
}

function readFeatureCollection(path: string): GeoJSON.FeatureCollection {
  const data: unknown = JSON.parse(readFileSync(path, "utf-8"));
  const looksLikeCollection =
    typeof data === "object" &&
    data !== null &&
    (data as { type?: unknown }).type === "FeatureCollection" &&
    Array.isArray((data as { features?: unknown }).features);

  if (!looksLikeCollection) {
    throw new Error(`${path} is not a GeoJSON FeatureCollection`);
  }
  return data as GeoJSON.FeatureCollection;
}

function readJSONArray(path: string): unknown[] {
  const data: unknown = JSON.parse(readFileSync(path, "utf-8"));
  if (!Array.isArray(data)) {
    throw new Error(`${path} is not a JSON array`);
  }
  return data;
}

export function loadAtlasContent(): AtlasContent {
  const physicalDir = join(CONTENT_ROOT, "physical");
  const physical = {
    coastline: readFeatureCollection(join(physicalDir, "coastline.geojson")),
    ocean: readFeatureCollection(join(physicalDir, "ocean.geojson")),
    rivers: readFeatureCollection(join(physicalDir, "rivers.geojson")),
    lakes: readFeatureCollection(join(physicalDir, "lakes.geojson")),
  };

  const provincesDir = join(CONTENT_ROOT, "provinces");
  const provinces = readdirSync(provincesDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => Province.parse(JSON.parse(readFileSync(join(provincesDir, f), "utf-8"))));

  const cities = readJSONArray(join(CONTENT_ROOT, "cities.json")).map((c) => City.parse(c));
  const seas = readJSONArray(join(CONTENT_ROOT, "seas.json")).map((s) => SeaLabel.parse(s));

  return { physical, provinces, cities, seas };
}
