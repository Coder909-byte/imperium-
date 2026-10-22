// Deterministic crop/resize of owner-approved generated part sheets.
// Does not paint, remove backgrounds, desaturate or invent hidden anatomy.
import sharp from 'sharp';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
const input = process.argv[2];
const out = process.argv[3];
if (!input || !out) throw new Error('Usage: node scripts/prepare-gallia-personnel.mjs <six-cell-sheet> <temporary-output-dir>');
mkdirSync(out, { recursive: true });
const { width, height } = await sharp(input).metadata();
if (!width || !height) throw new Error('Sheet dimensions missing');
const roman = input.includes('roman');
const specs = roman ? [
  ['body', [70, 0, 430, 473], 180], ['head', [590, 20, 395, 450], 95],
  ['weapon', [1030, 0, 450, 488], 210], ['shield', [90, 476, 350, 540], 245],
  ['leg_near', [640, 490, 300, 515], 190], ['leg_far', [1140, 490, 365, 520], 190],
] : [
  ['body', [70, 20, 430, 470], 180], ['head', [580, 70, 380, 400], 95],
  ['weapon', [1090, 0, 310, 512], 300], ['shield', [120, 498, 320, 520], 245],
  ['leg_near', [620, 512, 275, 500], 190], ['leg_far', [1120, 512, 360, 500], 190],
];
const crops = [];
for (const [name, rect, targetHeight] of specs) {
  const [left, top, cellWidth, cellHeight] = rect;
  const cell = sharp(input).extract({ left, top, width: cellWidth, height: cellHeight });
  const { data, info } = await cell.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, y0 = info.height, x1 = 0, y1 = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] < 12) continue;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x);
    y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  if (x0 > x1) throw new Error(`Empty part ${name}`);
  const crop = { left: left + x0, top: top + y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
  const targetWidth = Math.round(crop.width * targetHeight / crop.height);
  await sharp(input).extract(crop).resize(targetWidth, targetHeight, { fit: 'fill' }).png().toFile(`${out}/${name}.png`);
  crops.push({ name, crop, size: [targetWidth, targetHeight] });
}
writeFileSync(`${out}/crops.json`, JSON.stringify({ input, crops }, null, 2));
console.log(readFileSync(`${out}/crops.json`, 'utf8'));
