// Offline candidate only: large publisher files stay outside the repository.
// npx tsx tools/atlas/prepare-relief.ts /tmp/NE2_50M_SR_W.tif /tmp/relief.webp
import { writeFileSync } from "node:fs";
import sharp from "sharp";
import { createProjection } from "../../engine/atlas/projection";
import { ATLAS_VIEWPORT, ATLAS_FIT_EXTENT } from "../../app/atlas/viewport";
import { reprojectRelief } from "./relief";

async function main() {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) throw new Error("Provide a publisher TIFF and a temporary output WebP path");
  const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.width !== 10800 || info.height !== 5400 || info.channels !== 3) throw new Error("Expected Natural Earth 50m WGS84 raster (10800×5400 RGB)");
  const scale = 2;
  const projection = createProjection(ATLAS_FIT_EXTENT, ATLAS_VIEWPORT);
  const pixels = reprojectRelief({ ...info, data }, projection, ATLAS_VIEWPORT, scale);
  const file = await sharp(pixels, { raw: { width: ATLAS_VIEWPORT.width * scale, height: ATLAS_VIEWPORT.height * scale, channels: 3 } })
    .modulate({ saturation: .58, brightness: 1.02 }).linear([1.02, 1, .94], [4, 3, 2]).webp({ quality: 84 }).toBuffer();
  writeFileSync(output, file);
  console.log(`${output}: ${file.length} bytes, 2000×1240, exact atlas projection`);
}
void main();
