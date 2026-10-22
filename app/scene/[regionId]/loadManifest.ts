import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { ManifestEntry } from "@/content/schema";

export function loadManifest(): ManifestEntry[] {
  return z.array(ManifestEntry).parse(JSON.parse(readFileSync(join(process.cwd(), "content/assets/manifest.json"), "utf8")));
}
