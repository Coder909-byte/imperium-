// CLI entrypoint for tools/forge — the only file in this tool that
// touches argv, the filesystem beyond image I/O, or calls process.exit
// (same split as tools/unproject.cli.ts/unproject.ts). Run with
// `npm run forge -- <input> --source <url> --licence <text> --artist
// <name|"unknown"> --institution <name|"unknown"> [--matte] [--tint
// #rrggbb] [--resize <width>] [--crop l,t,w,h] [--quality 1-100]
// [--name <basename>] [--out-dir <dir>]`.
//
// <input> is a FILE (single-plane mode) or a DIRECTORY (batch mode —
// every image file inside, one output + one manifest row each, same
// flags applied uniformly to all of them per the confirmed scope: no
// per-file overrides, run the tool twice over two subfolders for a
// mixed colour/matte scene instead).
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { appendManifestEntry, todayIso, validateLicenceFields } from "./manifest";
import { processImage, type CropRect, type ForgeSettings } from "./pipeline";
import { formatKB, reportBudget } from "./budget";

const REPO_ROOT = join(__dirname, "..", "..");
const DEFAULT_OUT_DIR = "content/assets/planes";
const DEFAULT_QUALITY = 82;
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".tif", ".tiff", ".webp"]);

const USAGE = `
npm run forge -- <input> --source <url> --licence <text> --artist <name|"unknown"> --institution <name|"unknown"> [options]

<input>              A source image file (single-plane mode) or a directory of
                      already-separated layer images (batch mode — every image
                      file in the directory gets the SAME flags applied).

Required:
  --source <url>          Where the source image came from.
  --licence <text>         e.g. "CC0", "Public domain".
  --artist <name>          Or the literal "unknown" — typed, never defaulted.
  --institution <name>     Or the literal "unknown" — typed, never defaulted.

Optional:
  --matte                 Desaturate -> level -> luminance-to-alpha (ADR 003:
                           cutout character parts and foreground silhouettes
                           only — never the default for a backdrop plane).
  --tint <#rrggbb>         Matte mode's flat RGB fill (default white — see
                           docs/art-pipeline.md on why white is the default).
  --resize <width>         Proportional resize; height follows the source's
                           own aspect ratio.
  --crop <l,t,w,h>         Pixel rect, applied before resize.
  --quality <1-100>        WebP quality, both RGB and alpha (default ${DEFAULT_QUALITY}).
  --name <basename>        Output file basename (single-plane mode only —
                           batch mode always uses each file's own basename).
  --out-dir <dir>          Where WebP output is written (default ${DEFAULT_OUT_DIR}).
  --notes <text>           Free-text manifest note (batch mode: same note on every row).
`;

interface Cli {
  input: string;
  source?: string;
  licence?: string;
  artist?: string;
  institution?: string;
  matte: boolean;
  tint?: string;
  resize?: string;
  crop?: string;
  quality: string;
  name?: string;
  outDir: string;
  notes?: string;
  help: boolean;
}

function parseCli(argv: string[]): Cli {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      source: { type: "string" },
      licence: { type: "string" },
      artist: { type: "string" },
      institution: { type: "string" },
      matte: { type: "boolean", default: false },
      tint: { type: "string" },
      resize: { type: "string" },
      crop: { type: "string" },
      quality: { type: "string", default: String(DEFAULT_QUALITY) },
      name: { type: "string" },
      "out-dir": { type: "string", default: DEFAULT_OUT_DIR },
      notes: { type: "string" },
      help: { type: "boolean", default: false },
    },
  });

  return {
    input: positionals[0] ?? "",
    source: values.source,
    licence: values.licence,
    artist: values.artist,
    institution: values.institution,
    matte: values.matte ?? false,
    tint: values.tint,
    resize: values.resize,
    crop: values.crop,
    quality: values.quality ?? String(DEFAULT_QUALITY),
    name: values.name,
    outDir: values["out-dir"] ?? DEFAULT_OUT_DIR,
    notes: values.notes,
    help: values.help ?? false,
  };
}

function parseCropFlag(raw: string | undefined): CropRect | undefined {
  if (!raw) return undefined;
  const parts = raw.split(",").map((p) => Number(p.trim()));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n) || n < 0)) {
    throw new Error(`invalid --crop "${raw}" — expected "left,top,width,height" as non-negative numbers`);
  }
  const [left, top, width, height] = parts;
  return { left, top, width, height };
}

function parseQualityFlag(raw: string): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 100) {
    throw new Error(`invalid --quality "${raw}" — expected an integer 1-100`);
  }
  return n;
}

function parseResizeFlag(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`invalid --resize "${raw}" — expected a positive integer width in px`);
  }
  return n;
}

function settingsFromCli(cli: Cli): ForgeSettings {
  return {
    matte: cli.matte,
    quality: parseQualityFlag(cli.quality),
    resizeWidth: parseResizeFlag(cli.resize),
    crop: parseCropFlag(cli.crop),
    tint: cli.tint,
  };
}

function listImageFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && IMAGE_EXTENSIONS.has(extname(entry.name).toLowerCase()))
    .map((entry) => join(dir, entry.name))
    .sort();
}

/** Processes one file end to end: forge -> write WebP -> append manifest
 *  row -> print the report. Shared by single-plane and batch mode so
 *  they can never drift into reporting differently. */
async function processOne(inputPath: string, outputName: string, settings: ForgeSettings, licence: ReturnType<typeof validateLicenceFields>, cli: Cli, manifestPath: string): Promise<void> {
  const result = await processImage(inputPath, settings);

  const outDir = resolve(REPO_ROOT, cli.outDir);
  mkdirSync(outDir, { recursive: true });
  const outputPath = join(outDir, `${outputName}.webp`);
  writeFileSync(outputPath, result.data);

  const manifestFile = `${cli.outDir}/${outputName}.webp`.replace(/\/{2,}/g, "/");
  appendManifestEntry(manifestPath, {
    file: manifestFile,
    source: licence.source,
    licence: licence.licence,
    retrieved: todayIso(),
    artist: licence.artist,
    institution: licence.institution,
    settings: {
      matte: settings.matte,
      quality: settings.quality,
      resizeWidth: settings.resizeWidth,
      crop: cli.crop,
      tint: settings.tint,
    },
    notes: cli.notes,
  });

  const budget = reportBudget(result.bytes);
  console.log(`\n${basename(inputPath)} -> ${manifestFile}`);
  console.log(`  ${result.inputWidth}x${result.inputHeight} -> ${result.outputWidth}x${result.outputHeight}`);
  console.log(`  ${formatKB(result.bytes)} (${result.bytes} bytes) — ${budget.fits ? "fits" : `OVER by ${formatKB(budget.overBy)}`} the ${formatKB(budget.budgetBytes)} per-plane budget`);
}

async function main(): Promise<void> {
  const cli = parseCli(process.argv.slice(2));

  if (cli.help || !cli.input) {
    console.log(USAGE);
    process.exit(cli.help ? 0 : 1);
  }

  const inputPath = resolve(process.cwd(), cli.input);
  if (!existsSync(inputPath)) {
    console.error(`no such file or directory: ${inputPath}`);
    process.exit(1);
  }

  let licence;
  let settings: ForgeSettings;
  try {
    licence = validateLicenceFields(cli);
    settings = settingsFromCli(cli);
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }

  const manifestPath = join(REPO_ROOT, "content", "assets", "manifest.json");
  const isDirectory = statSync(inputPath).isDirectory();

  try {
    if (isDirectory) {
      if (cli.name) console.error(`--name is ignored in batch mode — each file keeps its own basename.\n`);
      const files = listImageFiles(inputPath);
      if (files.length === 0) {
        console.error(`no image files (${[...IMAGE_EXTENSIONS].join(", ")}) found in ${inputPath}`);
        process.exit(1);
      }
      console.log(`Batch: ${files.length} file(s) in ${inputPath}`);
      for (const file of files) {
        const outputName = basename(file, extname(file));
        await processOne(file, outputName, settings, licence, cli, manifestPath);
      }
      console.log(`\nDone — ${files.length} plane(s) forged, ${files.length} manifest row(s) written.`);
    } else {
      const outputName = cli.name ?? basename(inputPath, extname(inputPath));
      await processOne(inputPath, outputName, settings, licence, cli, manifestPath);
    }
  } catch (error) {
    console.error(`\n${(error as Error).message}`);
    process.exit(1);
  }
}

void main();
