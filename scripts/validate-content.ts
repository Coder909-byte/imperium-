// CI gate: malformed region or question JSON fails the build, never the
// runtime (CLAUDE.md hard rule #5). Run with `npm run validate`.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { z } from "zod";
import { Region, Question, Province, City, SeaLabel } from "../content/schema";

interface Target {
  dir: string;
  schema: z.ZodType;
}

const targets: Target[] = [
  { dir: join(__dirname, "..", "content", "regions"), schema: Region },
  { dir: join(__dirname, "..", "content", "questions"), schema: Question },
  { dir: join(__dirname, "..", "content", "borders", "provinces"), schema: Province },
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
];

let failures = 0;
let filesChecked = 0;

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
    }
  }
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
  });
}

if (failures > 0) {
  console.error(`\n${failures} of ${filesChecked} content file(s) failed validation.`);
  process.exit(1);
}

console.log(`${filesChecked} content file(s) valid.`);
