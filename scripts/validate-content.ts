// CI gate: malformed region or question JSON fails the build, never the
// runtime (CLAUDE.md hard rule #5). Run with `npm run validate`.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { z } from "zod";
import { Region, Question } from "../content/schema";

interface Target {
  dir: string;
  schema: z.ZodType;
}

const targets: Target[] = [
  { dir: join(__dirname, "..", "content", "regions"), schema: Region },
  { dir: join(__dirname, "..", "content", "questions"), schema: Question },
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

if (failures > 0) {
  console.error(`\n${failures} of ${filesChecked} content file(s) failed validation.`);
  process.exit(1);
}

console.log(`${filesChecked} content file(s) valid.`);
