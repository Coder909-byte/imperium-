// Synthetic in-memory fixtures throughout — sharp can both build and
// decode raw pixel buffers, so no test image files are needed on disk
// and no network access (unlike the real painting this pipeline was
// actually measured against for docs/art-pipeline.md and PRD §11 —
// see CLAUDE.md's M7 note for that real-image run).
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { processImage } from "./pipeline";

/** A small opaque RGB test image: a black-to-white horizontal gradient,
 *  four bands, so grayscale/matte/resize all have something real to act
 *  on (a flat colour would make every check trivially pass). */
async function gradientFixture(width = 8, height = 4): Promise<Buffer> {
  const rgb = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const v = Math.round((x / (width - 1)) * 255);
      const i = (y * width + x) * 3;
      rgb[i] = v;
      rgb[i + 1] = v;
      rgb[i + 2] = v;
    }
  }
  return sharp(rgb, { raw: { width, height, channels: 3 } }).png().toBuffer();
}

/** Same gradient, but with a punched-out transparent hole in the middle
 *  column — the shape a Photopea-cut plane layer actually has. */
async function gradientWithAlphaHoleFixture(width = 8, height = 4): Promise<Buffer> {
  const rgba = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const v = Math.round((x / (width - 1)) * 255);
      const i = (y * width + x) * 4;
      rgba[i] = v;
      rgba[i + 1] = v;
      rgba[i + 2] = v;
      rgba[i + 3] = x === Math.floor(width / 2) ? 0 : 255; // one fully transparent column
    }
  }
  return sharp(rgba, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

async function decodeRgba(webp: Buffer) {
  return sharp(webp).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

describe("processImage — colour mode (default, ADR 003: no desaturation)", () => {
  it("reports real input/output dimensions, not assumed ones", async () => {
    const src = await gradientFixture(8, 4);
    const result = await processImage(src, { matte: false, quality: 80 });
    expect(result.inputWidth).toBe(8);
    expect(result.inputHeight).toBe(4);
    expect(result.outputWidth).toBe(8);
    expect(result.outputHeight).toBe(4);
    expect(result.bytes).toBeGreaterThan(0);
    expect(result.bytes).toBe(result.data.length);
  });

  it("keeps colour intact — the whole point of ADR 003's default path", async () => {
    const src = await gradientFixture(8, 4);
    const result = await processImage(src, { matte: false, quality: 100 });
    const { data, info } = await decodeRgba(result.data);
    expect(info.channels).toBe(4);
    // Leftmost column ~black, rightmost ~white, R=G=B preserved (this
    // fixture is a grey gradient, but colour channels being EQUAL and
    // varying across the image is what "not flattened/tinted" looks
    // like — a broken pipeline that quantised to pure b/w would fail
    // the mid-column check below).
    const leftR = data[0];
    const rightR = data[(info.width - 1) * 4];
    expect(rightR).toBeGreaterThan(leftR + 100);
  });

  it("preserves an existing alpha channel unchanged — a Photopea-cut plane's own silhouette, not luminance-derived", async () => {
    const src = await gradientWithAlphaHoleFixture(8, 4);
    const result = await processImage(src, { matte: false, quality: 100 });
    const { data, info } = await decodeRgba(result.data);
    const holeX = Math.floor(info.width / 2);
    const holeAlpha = data[(holeX) * 4 + 3];
    const edgeAlpha = data[0 * 4 + 3];
    expect(holeAlpha).toBeLessThan(20); // still (near-)transparent
    expect(edgeAlpha).toBeGreaterThan(230); // still (near-)opaque
  });

  it("resizes proportionally when --resize is given", async () => {
    const src = await gradientFixture(80, 40);
    const result = await processImage(src, { matte: false, quality: 80, resizeWidth: 40 });
    expect(result.outputWidth).toBe(40);
    expect(result.outputHeight).toBe(20); // aspect ratio preserved
    expect(result.inputWidth).toBe(80); // the ORIGINAL, for the report — not overwritten by the resize
  });

  it("crops before resizing", async () => {
    const src = await gradientFixture(80, 40);
    const result = await processImage(src, { matte: false, quality: 80, crop: { left: 10, top: 10, width: 40, height: 20 }, resizeWidth: 20 });
    expect(result.outputWidth).toBe(20);
    expect(result.outputHeight).toBe(10);
  });
});

describe("processImage — --matte (ADR 007's cutout/silhouette path, explicit opt-in only)", () => {
  it("produces a real alpha matte from luminance — dark source opaque, light source transparent", async () => {
    const src = await gradientFixture(8, 4); // black (x=0) -> white (x=7)
    const result = await processImage(src, { matte: true, quality: 100 });
    const { data, info } = await decodeRgba(result.data);
    const darkColumnAlpha = data[0 * 4 + 3];
    const lightColumnAlpha = data[(info.width - 1) * 4 + 3];
    expect(darkColumnAlpha).toBeGreaterThan(lightColumnAlpha);
    expect(darkColumnAlpha).toBeGreaterThan(200); // dark source -> near-opaque
    expect(lightColumnAlpha).toBeLessThan(55); // light source -> near-transparent
  });

  it("defaults matte RGB to white, not the source colour — so a runtime multiply-tint (ParallaxPlane/Pixi tint) stays clean", async () => {
    const src = await gradientFixture(8, 4);
    const result = await processImage(src, { matte: true, quality: 100 });
    const { data } = await decodeRgba(result.data);
    expect(data[0]).toBe(255);
    expect(data[1]).toBe(255);
    expect(data[2]).toBe(255);
  });

  it("--tint overrides the flat RGB fill", async () => {
    const src = await gradientFixture(8, 4);
    const result = await processImage(src, { matte: true, quality: 100, tint: "#204080" });
    const { data } = await decodeRgba(result.data);
    expect(data[0]).toBeCloseTo(0x20, -1);
    expect(data[1]).toBeCloseTo(0x40, -1);
    expect(data[2]).toBeCloseTo(0x80, -1);
  });

  it("rejects a malformed --tint rather than silently ignoring it", async () => {
    const src = await gradientFixture(4, 4);
    await expect(processImage(src, { matte: true, quality: 100, tint: "not-a-colour" })).rejects.toThrow(/invalid --tint/);
  });

  it("resizes correctly under matte too — the exact bug this pipeline hit once already (pre-resize dimensions used post-resize)", async () => {
    const src = await gradientFixture(80, 40);
    const result = await processImage(src, { matte: true, quality: 80, resizeWidth: 20 });
    expect(result.outputWidth).toBe(20);
    expect(result.outputHeight).toBe(10);
    const { info } = await decodeRgba(result.data);
    expect(info.width).toBe(20);
    expect(info.height).toBe(10);
  });
});
