// Server-only: reads content/regions/{id}.json if it exists. app/ is
// allowed to import content/ — the hard rule (CLAUDE.md #1) is that
// engine/ never does. Returns null for a region with no authored
// content yet. Invalid authored content must fail loudly rather than
// masquerading as a province nobody has written.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Region } from "@/content/schema";

const REGIONS_DIR = join(process.cwd(), "content", "regions");
const VALID_ID = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;

export function loadRegionContent(regionId: string): Region | null {
  if (!VALID_ID.test(regionId)) return null;
  const path = join(REGIONS_DIR, `${regionId}.json`);
  if (!existsSync(path)) return null;

  const region = Region.parse(JSON.parse(readFileSync(path, "utf-8")));
  if (region.id !== regionId) throw new Error(`Region ID does not match its filename: ${regionId}`);
  return region;
}
