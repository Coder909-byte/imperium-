// Manifest I/O and the licence-field guard (CLAUDE.md hard rule #3/#4:
// every art asset gets a manifest row, and no asset ships without a
// verified public-domain/CC0 licence). This is the CLI's own refusal
// path — content/schema.ts's ManifestEntry is the separate, later guard
// against a hand-edit or merge conflict reintroducing a blank field
// once this file has already written a good one.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { ManifestEntry, type ManifestEntry as ManifestEntryType } from "../../content/schema";

/** Raw --source/--licence/--artist/--institution flag values, before the
 *  required-field check. Everything is `string | undefined` because
 *  that's exactly what an argv parser hands back for an omitted flag —
 *  forcing the caller to go through validateLicenceFields rather than
 *  quietly treating "not typed" as "". */
export interface LicenceFlagsInput {
  source?: string;
  licence?: string;
  artist?: string;
  institution?: string;
}

export interface LicenceFields {
  source: string;
  licence: string;
  artist: string;
  institution: string;
}

/**
 * The one thing this whole tool exists to enforce: refuse to proceed
 * rather than write a manifest entry with a blank rights field. --source
 * and --licence have no escape hatch — every asset needs a real source
 * and a real licence, full stop. --artist and --institution accept the
 * literal string "unknown" (case-insensitive), because an anonymous
 * historical work is a real, honest answer — but it must be *typed*,
 * never defaulted, so "unknown" always means "I checked and couldn't
 * attribute it," never "I didn't check."
 */
export function validateLicenceFields(input: LicenceFlagsInput): LicenceFields {
  const missing: string[] = [];
  if (!input.source?.trim()) missing.push("--source <url>");
  if (!input.licence?.trim()) missing.push("--licence <text>");
  if (!input.artist?.trim()) missing.push('--artist <name|"unknown">');
  if (!input.institution?.trim()) missing.push('--institution <name|"unknown">');

  if (missing.length > 0) {
    throw new Error(
      `refusing to write a manifest entry — missing required field(s): ${missing.join(", ")}\n` +
        `Rights provenance is the one thing that can kill this project later (CLAUDE.md hard rule #4) — ` +
        `there is no default for a blank licence field.`,
    );
  }

  return {
    source: input.source!.trim(),
    licence: input.licence!.trim(),
    artist: input.artist!.trim(),
    institution: input.institution!.trim(),
  };
}

/** Today's date as YYYY-MM-DD, UTC — bookkeeping, not a rights fact, so
 *  it's the one field the CLI fills in rather than requiring. */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Reads the manifest (an empty array if the file doesn't exist yet —
 *  true only in a fresh checkout; the real file is checked in), appends
 *  `entry`, and writes it back — re-validated against the same
 *  ManifestEntry schema `npm run validate` uses, so a bug in how the CLI
 *  assembled the entry fails loudly here rather than writing a
 *  malformed row that validate would only catch on the next run. */
export function appendManifestEntry(manifestPath: string, entry: ManifestEntryType): void {
  const validated = ManifestEntry.parse(entry);

  const raw = existsSync(manifestPath) ? readFileSync(manifestPath, "utf-8") : "[]";
  const list: unknown[] = JSON.parse(raw);
  if (!Array.isArray(list)) {
    throw new Error(`${manifestPath} does not contain a JSON array — refusing to append`);
  }
  list.push(validated);

  mkdirSync(dirname(manifestPath), { recursive: true });
  writeFileSync(manifestPath, `${JSON.stringify(list, null, 2)}\n`);
}
