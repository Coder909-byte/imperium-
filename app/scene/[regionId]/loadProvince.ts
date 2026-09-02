// Server-only: reads content/borders/provinces/{id}.json — the province
// name/Latin name/held-years data that exists independently of whether
// anyone has written content/regions/{id}.json yet (22 of 24 provinces,
// currently). Lets the "not yet written" state show a real province
// name and Latin name instead of guessing from the URL slug.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Province } from "@/content/schema";

const PROVINCES_DIR = join(process.cwd(), "content", "borders", "provinces");
const VALID_ID = /^[a-z0-9-]+$/;

export function loadProvinceMeta(regionId: string): Province | null {
  if (!VALID_ID.test(regionId)) return null;
  const path = join(PROVINCES_DIR, `${regionId}.json`);
  if (!existsSync(path)) return null;

  const parsed = Province.safeParse(JSON.parse(readFileSync(path, "utf-8")));
  return parsed.success ? parsed.data : null;
}
