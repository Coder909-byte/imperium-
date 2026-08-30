// Server-only: reads content/regions/{id}.json if it exists. app/ is
// allowed to import content/ — the hard rule (CLAUDE.md #1) is that
// engine/ never does. Returns null for a region with no authored
// content yet (page.tsx falls back to a "coming soon" stub) or content
// that fails schema validation — malformed JSON fails the build via
// `npm run validate`, so a null here at runtime means "not authored",
// never "broken".
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Region } from "@/content/schema";

const REGIONS_DIR = join(process.cwd(), "content", "regions");
const VALID_ID = /^[a-z0-9-]+$/;

export function loadRegionContent(regionId: string): Region | null {
  if (!VALID_ID.test(regionId)) return null;
  const path = join(REGIONS_DIR, `${regionId}.json`);
  if (!existsSync(path)) return null;

  const parsed = Region.safeParse(JSON.parse(readFileSync(path, "utf-8")));
  return parsed.success ? parsed.data : null;
}
