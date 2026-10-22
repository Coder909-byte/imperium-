// Server-only: reads content/borders/provinces/{id}.json — the province
// name/Latin name/held-years data that exists independently of whether
// anyone has written content/regions/{id}.json yet. Unavailable states
// use real display names instead of guessing from the URL slug.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Province } from "@/content/schema";

const PROVINCES_DIR = join(process.cwd(), "content", "borders", "provinces");
const VALID_ID = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;

export function loadProvinceMeta(regionId: string): Province | null {
  if (!VALID_ID.test(regionId)) return null;
  const path = join(PROVINCES_DIR, `${regionId}.json`);
  if (!existsSync(path)) return null;

  const province = Province.parse(JSON.parse(readFileSync(path, "utf-8")));
  if (province.id !== regionId) throw new Error(`Province ID does not match its filename: ${regionId}`);
  return province;
}
