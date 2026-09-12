// Server-only: reads every content/rigs/*.json (M6). Unlike
// loadContent.ts's per-id lookup, this loads the whole set — there's no
// per-region "which rigs does it use" indirection in content/regions/
// (a beat's actors[] just names a rig by string id), and puppets are
// eager (CLAUDE.md's M6 note), so there's nothing to gain by trying to
// compute a subset. A rig that fails validation is dropped with a
// console error rather than crashing the route — `npm run validate` is
// the real CI gate (CLAUDE.md hard rule #5); this mirrors
// loadContent.ts's "malformed content means absent, not broken" stance.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Rig } from "@/content/schema";

const RIGS_DIR = join(process.cwd(), "content", "rigs");

export function loadRigs(): Rig[] {
  let entries: string[];
  try {
    entries = readdirSync(RIGS_DIR).filter((name) => name.endsWith(".json"));
  } catch {
    return [];
  }

  const rigs: Rig[] = [];
  for (const entry of entries) {
    const path = join(RIGS_DIR, entry);
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(readFileSync(path, "utf-8"));
    } catch (error) {
      console.error(`loadRigs: invalid JSON in ${path}: ${(error as Error).message}`);
      continue;
    }
    const result = Rig.safeParse(parsedJson);
    if (!result.success) {
      console.error(`loadRigs: ${path} failed validation: ${result.error.issues.map((i) => i.message).join("; ")}`);
      continue;
    }
    rigs.push(result.data);
  }
  return rigs;
}
