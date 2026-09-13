// The actual image pipeline (ADR 003 / PRD §3): load -> optional crop
// -> optional resize -> colour-space normalise -> export WebP, colour
// intact by default. --matte (never the default — ADR 003 scopes
// alpha-from-luminance to cutout character parts and foreground
// silhouettes) replaces the colour export with a desaturate -> level
// -> invert-to-alpha pass instead.
//
// Every sharp call here was checked against sharp's actual runtime
// behaviour (a throwaway probe script against synthetic pixels), not
// assumed from memory — one real surprise it caught: re-wrapping a
// single-channel raw buffer into a fresh `sharp(buf, {raw:{channels:1}})`
// and chaining `.linear()`/`.normalise()` on THAT silently upconverts
// the output to 3 channels. Chaining grayscale()->normalise() on ONE
// pipeline instead (never re-wrapping a raw single-channel buffer)
// stays single-channel as expected — which is why the invert step below
// is a plain JS byte loop rather than a second sharp call.
import sharp, { type Sharp } from "sharp";

export interface CropRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ForgeSettings {
  matte: boolean;
  quality: number; // WebP quality, 1-100
  resizeWidth?: number; // proportional — height follows the source aspect ratio
  crop?: CropRect; // applied before resize
  tint?: string; // "#rrggbb" — matte mode's flat RGB fill; defaults to white (see docs/art-pipeline.md on why white, not the visual tint colour)
}

export interface ProcessResult {
  inputWidth: number;
  inputHeight: number;
  outputWidth: number;
  outputHeight: number;
  bytes: number;
  data: Buffer;
}

const DEFAULT_TINT = "#ffffff";
const HEX_COLOUR = /^#[0-9a-fA-F]{6}$/;

function parseHexColour(hex: string): [number, number, number] {
  if (!HEX_COLOUR.test(hex)) throw new Error(`invalid --tint "${hex}" — expected #rrggbb`);
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Loads `input` (a file path or an in-memory buffer — the latter is
 *  what the unit tests use, so no fixture files are needed on disk) and
 *  applies crop/resize, returning the still-open sharp pipeline plus
 *  the ORIGINAL (pre-crop/resize) dimensions for the report. `failOn:
 *  "none"` tolerates the minor warnings real-world century-old scans
 *  sometimes trip (an unusual JPEG marker, a corrupt-but-harmless EXIF
 *  thumbnail) rather than refusing to load an otherwise-fine image. */
async function loadAndFrame(input: string | Buffer, settings: Pick<ForgeSettings, "crop" | "resizeWidth">) {
  const base = sharp(input, { failOn: "none" });
  const meta = await base.metadata();
  if (!meta.width || !meta.height) {
    throw new Error("could not read source image dimensions — is this a valid image file?");
  }

  let pipeline = sharp(input, { failOn: "none" }).toColorspace("srgb");
  if (settings.crop) pipeline = pipeline.extract(settings.crop);
  if (settings.resizeWidth) pipeline = pipeline.resize({ width: settings.resizeWidth });

  return { pipeline, inputWidth: meta.width, inputHeight: meta.height };
}

/** The --matte path: desaturate, stretch contrast (a "levels" pass —
 *  sharp's own histogram-normalise stands in for a manual levels dialog
 *  in Photoshop/Photopea), then invert into an alpha channel over flat
 *  RGB — dark ink becomes opaque, white paper becomes transparent,
 *  matching how ink-on-paper luminance mattes cleanly (ADR 003). RGB is
 *  white by default rather than baking in a colour: ParallaxPlane and
 *  the puppet renderer both tint alpha art at RUNTIME via a multiply
 *  (ColorMatrixFilter.tint / Pixi's own sprite tint), which only
 *  produces a clean, vivid result over a white base — a coloured or
 *  grey base muddies under a multiply tint. --tint overrides this for
 *  the rarer case of an asset that won't go through runtime tinting at
 *  all and should just carry a fixed flat colour into the file itself.
 */
interface MatteResult {
  data: Buffer; // raw RGBA
  width: number;
  height: number;
}

async function renderMatte(pipeline: Sharp, tint: string | undefined): Promise<MatteResult> {
  const { data: alpha, info } = await pipeline.grayscale().normalise().raw().toBuffer({ resolveWithObject: true });
  if (info.channels !== 1) {
    // Caught the hard way once already (see file header) — fail loudly
    // rather than silently building a wrong-shaped alpha channel.
    throw new Error(`expected a single-channel grayscale buffer, got ${info.channels} channels`);
  }

  // info.width/height — NOT a separate pipeline.metadata() call — are
  // the single source of truth for the framed size from here on. Found
  // the hard way: sharp's `.metadata()` on a pipeline with a pending
  // `.resize()` still queued returns the PRE-resize dimensions, not the
  // post-resize ones — a second metadata probe here would silently
  // build an alpha buffer sized for the wrong dimensions.
  const [r, g, b] = parseHexColour(tint ?? DEFAULT_TINT);
  const rgba = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0; i < info.width * info.height; i++) {
    rgba[i * 4] = r;
    rgba[i * 4 + 1] = g;
    rgba[i * 4 + 2] = b;
    rgba[i * 4 + 3] = 255 - alpha[i]; // invert: dark source -> opaque, light source -> transparent
  }
  return { data: rgba, width: info.width, height: info.height };
}

export async function processImage(input: string | Buffer, settings: ForgeSettings): Promise<ProcessResult> {
  const { pipeline, inputWidth, inputHeight } = await loadAndFrame(input, settings);

  // libwebp encodes RGB and alpha as two SEPARATE quality knobs —
  // `quality` only ever touches RGB; alpha defaults to near-lossless
  // regardless of it. Found by measuring, not assumed: an early version
  // of this pipeline produced byte-identical matte output across
  // quality 75/82/90, because matte mode's RGB is a flat, trivially-
  // compressible fill and every real byte lives in the alpha channel —
  // exactly the channel `quality` alone wasn't touching. Both paths
  // pass `alphaQuality` explicitly so --quality actually controls size
  // for a Photopea-cut colour plane's alpha hole too, not just matte.
  const webpOptions = { quality: settings.quality, alphaQuality: settings.quality };

  let webp: Buffer;
  if (settings.matte) {
    const { data: rgba, width, height } = await renderMatte(pipeline, settings.tint);
    webp = await sharp(rgba, { raw: { width, height, channels: 4 } }).webp(webpOptions).toBuffer();
  } else {
    // Colour path (ADR 003's default): whatever alpha the source already
    // carries (a Photopea-cut plane's own silhouette) passes through
    // untouched — sharp only strips alpha if told to `.flatten()`,
    // which nothing here does. A flat JPEG scan with no alpha channel
    // simply encodes fully opaque, which is correct for it too.
    webp = await pipeline.webp(webpOptions).toBuffer();
  }

  const outMeta = await sharp(webp).metadata();
  if (!outMeta.width || !outMeta.height) throw new Error("could not read output dimensions after encoding");

  return {
    inputWidth,
    inputHeight,
    outputWidth: outMeta.width,
    outputHeight: outMeta.height,
    bytes: webp.length,
    data: webp,
  };
}
