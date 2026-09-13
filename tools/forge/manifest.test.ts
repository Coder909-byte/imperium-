import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { appendManifestEntry, todayIso, validateLicenceFields } from "./manifest";

describe("validateLicenceFields", () => {
  it("accepts a fully-specified set", () => {
    const result = validateLicenceFields({ source: "https://example.org/x", licence: "CC0", artist: "Jean-Léon Gérôme", institution: "Phoenix Art Museum" });
    expect(result).toEqual({ source: "https://example.org/x", licence: "CC0", artist: "Jean-Léon Gérôme", institution: "Phoenix Art Museum" });
  });

  it('accepts an explicit "unknown" for artist/institution — a real, honest answer for an unattributed work', () => {
    const result = validateLicenceFields({ source: "https://example.org/x", licence: "Public domain", artist: "unknown", institution: "unknown" });
    expect(result.artist).toBe("unknown");
    expect(result.institution).toBe("unknown");
  });

  it("refuses when --source is missing — no default, ever", () => {
    expect(() => validateLicenceFields({ licence: "CC0", artist: "unknown", institution: "unknown" })).toThrow(/--source/);
  });

  it("refuses when --licence is missing", () => {
    expect(() => validateLicenceFields({ source: "https://example.org/x", artist: "unknown", institution: "unknown" })).toThrow(/--licence/);
  });

  it("refuses when --artist is missing — even though \"unknown\" would be accepted, blank is not the same as typed", () => {
    expect(() => validateLicenceFields({ source: "https://example.org/x", licence: "CC0", institution: "unknown" })).toThrow(/--artist/);
  });

  it("refuses when --institution is missing", () => {
    expect(() => validateLicenceFields({ source: "https://example.org/x", licence: "CC0", artist: "unknown" })).toThrow(/--institution/);
  });

  it("refuses a field that's present but blank/whitespace-only, not just absent", () => {
    expect(() => validateLicenceFields({ source: "  ", licence: "CC0", artist: "unknown", institution: "unknown" })).toThrow(/--source/);
  });

  it("reports every missing field in one error, not just the first", () => {
    expect(() => validateLicenceFields({})).toThrow(/--source[\s\S]*--licence[\s\S]*--artist[\s\S]*--institution/);
  });

  it("trims surrounding whitespace from accepted values", () => {
    const result = validateLicenceFields({ source: " https://example.org/x ", licence: " CC0 ", artist: " unknown ", institution: " unknown " });
    expect(result).toEqual({ source: "https://example.org/x", licence: "CC0", artist: "unknown", institution: "unknown" });
  });
});

describe("todayIso", () => {
  it("returns a YYYY-MM-DD string", () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("appendManifestEntry", () => {
  let dir: string;
  let manifestPath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "forge-manifest-test-"));
    manifestPath = join(dir, "nested", "manifest.json");
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function baseEntry(overrides: Partial<Parameters<typeof appendManifestEntry>[1]> = {}) {
    return {
      file: "content/assets/planes/test.webp",
      source: "https://example.org/x",
      licence: "CC0",
      retrieved: "2026-09-13",
      artist: "unknown",
      institution: "unknown",
      settings: { matte: false, quality: 82 },
      ...overrides,
    };
  }

  it("creates the manifest file (and its directory) if it doesn't exist yet", () => {
    expect(existsSync(manifestPath)).toBe(false);
    appendManifestEntry(manifestPath, baseEntry());
    expect(existsSync(manifestPath)).toBe(true);
    const written = JSON.parse(readFileSync(manifestPath, "utf-8"));
    expect(written).toHaveLength(1);
    expect(written[0].file).toBe("content/assets/planes/test.webp");
  });

  it("appends to an existing manifest without disturbing prior rows", () => {
    appendManifestEntry(manifestPath, baseEntry({ file: "a.webp" }));
    appendManifestEntry(manifestPath, baseEntry({ file: "b.webp" }));
    const written = JSON.parse(readFileSync(manifestPath, "utf-8"));
    expect(written).toHaveLength(2);
    expect(written.map((e: { file: string }) => e.file)).toEqual(["a.webp", "b.webp"]);
  });

  it("re-validates against the ManifestEntry schema before writing — a malformed entry never reaches the file", () => {
    expect(() => appendManifestEntry(manifestPath, baseEntry({ licence: "" }))).toThrow();
    expect(existsSync(manifestPath)).toBe(false); // nothing written
  });

  it("refuses to append to a file that isn't a JSON array", () => {
    const path = join(dir, "not-an-array.json");
    writeFileSync(path, "{}");
    expect(() => appendManifestEntry(path, baseEntry())).toThrow(/JSON array/);
  });
});
