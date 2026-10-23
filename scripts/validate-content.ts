// CI gate: malformed region or question JSON fails the build, never the
// runtime (CLAUDE.md hard rule #5). Run with `npm run validate`.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { validateNarrationTranscripts, validateSynthesisTranscripts } from "../content/narrationValidation";
import { join } from "node:path";
import type { z } from "zod";
import { Region, Question, Province, City, SeaLabel, Rig, ManifestEntry } from "../content/schema";
import { adaptRig } from "../app/scene/[regionId]/buildSceneProps";
import { loadRig } from "../engine/scene/puppet/rigLoader";
import { lintRig } from "../engine/scene/puppet/rigValidation";
import { validateSceneReferences } from "../content/sceneValidation";
import { approvedAssetUrl, assetFile, measureRegionAssets, validateAssetReferences } from "../content/assetReferences";

interface Target {
  dir: string;
  schema: z.ZodType;
}

const targets: Target[] = [
  { dir: join(__dirname, "..", "content", "regions"), schema: Region },
  { dir: join(__dirname, "..", "content", "questions"), schema: Question },
  { dir: join(__dirname, "..", "content", "borders", "provinces"), schema: Province },
  { dir: join(__dirname, "..", "content", "rigs"), schema: Rig },
];

// City/sea-label content lives as one array per file rather than one file
// per item — small, hand-authored lists, not per-region content.
interface ArrayFileTarget {
  file: string;
  itemSchema: z.ZodType;
}

const arrayFileTargets: ArrayFileTarget[] = [
  { file: join(__dirname, "..", "content", "borders", "cities.json"), itemSchema: City },
  { file: join(__dirname, "..", "content", "borders", "seas.json"), itemSchema: SeaLabel },
  // tools/forge's CLI guards the write path (refuses to write a blank
  // licence); this guards the file afterward — a hand-edit or a merge
  // conflict reintroducing a blank licence fails the build here.
  { file: join(__dirname, "..", "content", "assets", "manifest.json"), itemSchema: ManifestEntry },
];

let failures = 0;
let filesChecked = 0;
const regions: Region[] = [];
const rigs: Rig[] = [];
const manifest: ManifestEntry[] = [];

for (const { dir, schema } of targets) {
  const entries = readdirSync(dir, { withFileTypes: true }).filter(
    (entry) => entry.isFile() && entry.name.endsWith(".json"),
  );

  for (const entry of entries) {
    const path = join(dir, entry.name);
    filesChecked += 1;

    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(path, "utf-8"));
    } catch (error) {
      failures += 1;
      console.error(`✗ ${path}\n  Invalid JSON: ${(error as Error).message}`);
      continue;
    }

    const result = schema.safeParse(parsed);
    if (!result.success) {
      failures += 1;
      console.error(`✗ ${path}`);
      for (const issue of result.error.issues) {
        console.error(`  ${issue.path.join(".") || "(root)"}: ${issue.message}`);
      }
      continue;
    }

    if (schema === Rig) rigs.push(Rig.parse(result.data));
    if (schema === Region) regions.push(Region.parse(result.data));
  }
}

for (const region of regions) {
  const issues = validateSceneReferences(region, rigs);
  if (issues.length === 0) continue;
  failures += 1;
  console.error(`✗ ${region.id} — scene references\n  ${issues.join("\n  ")}`);
}

for (const { file, itemSchema } of arrayFileTargets) {
  filesChecked += 1;

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(file, "utf-8"));
  } catch (error) {
    failures += 1;
    console.error(`✗ ${file}\n  Invalid JSON: ${(error as Error).message}`);
    continue;
  }

  if (!Array.isArray(parsed)) {
    failures += 1;
    console.error(`✗ ${file}\n  Expected a JSON array`);
    continue;
  }

  parsed.forEach((item, index) => {
    const result = itemSchema.safeParse(item);
    if (!result.success) {
      failures += 1;
      console.error(`✗ ${file} [${index}]`);
      for (const issue of result.error.issues) {
        console.error(`  ${issue.path.join(".") || "(root)"}: ${issue.message}`);
      }
    }
    if (result.success && itemSchema === ManifestEntry) manifest.push(ManifestEntry.parse(result.data));
  });
}

for (const issue of validateSynthesisTranscripts(manifest)) { failures += 1; console.error(`✗ ${issue}`); }

for (const rig of rigs) {
  const assetIssues = rig.parts.filter((part) => !["torso", "head", "limb", "foot"].includes(part.texture)).flatMap((part) => {
    const file = assetFile(part.texture);
    return approvedAssetUrl(part.texture, manifest, rig.draft ? "character-draft" : "asset") && file && existsSync(join(__dirname, "..", file)) ? [] : [`${part.id}: missing or unapproved texture "${part.texture}"`];
  });
  if (assetIssues.length > 0) {
    failures += 1;
    console.error(`✗ ${rig.id} — rig assets\n  ${assetIssues.join("\n  ")}`);
    continue;
  }
  const issues = lintRig(loadRig(adaptRig(rig, manifest)));
  if (issues.length === 0) continue;
  failures += 1;
  console.error(`✗ ${rig.id} — rig-lint`);
  for (const issue of issues) console.error(`  [${issue.check}] clip "${issue.clipId}" (${issue.partId ?? "rig"}): ${issue.message}`);
}

for (const region of regions) {
  const issues = [...validateAssetReferences(region, manifest, (file) => existsSync(join(__dirname, "..", file))), ...validateNarrationTranscripts(region, manifest)];
  const payload = measureRegionAssets(region, rigs, (file) => {
    const path = join(__dirname, "..", file);
    return existsSync(path) ? statSync(path).size : 0;
  });
  console.log(`${region.id}: ${payload.bytes} referenced asset bytes (${payload.files.length} files; procedural placeholders excluded)`);
  console.log(`  audio: ${payload.audioBytes} bytes, including ${payload.narrationBytes} narration bytes`);
  if (!payload.fits) issues.push(`scene assets exceed the strict <2.5MB budget: ${payload.bytes} bytes`);
  if (issues.length === 0) continue;
  failures += 1;
  console.error(`✗ ${region.id} — asset references\n  ${issues.join("\n  ")}`);
}

if (failures > 0) {
  console.error(`\n${failures} of ${filesChecked} content file(s) failed validation.`);
  process.exit(1);
}

console.log(`${filesChecked} content file(s) valid.`);
