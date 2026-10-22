import { expect, test } from "@playwright/test";
import gallia from "../content/regions/gallia.json";
import { Region, Rig } from "../content/schema";
import { z } from "zod";
import sharp from "sharp";

test("Gallia's six beats retain their prose and per-beat sources", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/scene/gallia");
  await expect(page.locator("canvas")).toHaveCount(1);
  for (const [index, beat] of gallia.beats.entries()) {
    await page.getByRole("tab", { name: `Go to beat ${index + 1}: ${beat.headline}`, exact: true }).click();
    await expect(page.getByText(beat.body, { exact: true })).toBeVisible();
    await page.getByText(`Sources (${beat.sources.length})`, { exact: true }).click();
    for (const source of beat.sources) await expect(page.getByText(source.label, { exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`gallia-beat-${index + 1}.png`), fullPage: true });
  }
  expect(errors).toEqual([]);
});

test("approved plane and audio references use real loaders, and missing artwork keeps the prose available", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const webp = await sharp({ create: { width: 64, height: 28, channels: 4, background: "#a65b28" } }).webp().toBuffer();
  // Synthetic in-memory fixtures: never production assets or approvals.
  const wave = Buffer.alloc(44 + 8000);
  wave.write("RIFF", 0); wave.writeUInt32LE(wave.length - 8, 4); wave.write("WAVEfmt ", 8);
  wave.writeUInt32LE(16, 16); wave.writeUInt16LE(1, 20); wave.writeUInt16LE(1, 22);
  wave.writeUInt32LE(8000, 24); wave.writeUInt32LE(8000, 28); wave.writeUInt16LE(1, 32);
  wave.writeUInt16LE(8, 34); wave.write("data", 36); wave.writeUInt32LE(8000, 40); wave.fill(128, 44);
  let audioRequests = 0;
  let broken = false;
  await page.route("**/assets/gallia/*-sky.webp", (route) => route.fulfill({ status: broken ? 404 : 200, contentType: "image/webp", body: broken ? "missing" : webp }));
  await page.route("**/assets/audio/test-bed.wav", (route) => {
    audioRequests += 1;
    return route.fulfill({ contentType: "audio/wav", body: wave });
  });
  await page.route("**/api/dev/region-content?id=gallia", async (route) => {
    const response = await route.fetch();
    const body = z.object({ ok: z.boolean(), data: Region, rigs: z.array(Rig) }).parse(await response.json());
    const data = Region.parse(body.data);
    data.scene.planes.forEach((plane) => { plane.placeholder = true; });
    data.beats.forEach((beat) => { delete beat.audio.cue; delete beat.audio.cueVolume; beat.actors = []; });
    const skyAsset = broken ? "gallia/broken-sky.webp" : "gallia/test-sky.webp";
    data.scene.planes[0].asset = skyAsset;
    data.scene.planes[0].placeholder = false;
    data.scene.audioAssets = { wind_plains: "audio/test-bed.wav" };
    data.scene.audioPlaceholder = false;
    if (broken) data.beats[0].headline = "Broken artwork fixture";
    const manifest = [skyAsset, "audio/test-bed.wav"].map((asset) => ({
      file: `public/assets/${asset}`, source: "https://example.com/test", licence: "CC0", retrieved: "2026-10-22",
      approval: { by: "synthetic test fixture", at: "2026-10-22", rightsUrl: "https://example.com/test", rightsStatement: "Synthetic test fixture only" },
    }));
    await route.fulfill({ json: { ...body, data, rigs: [], manifest } });
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/dev/scene-lab");
  await page.getByLabel("Region:").selectOption("gallia");
  await expect(page.getByRole("heading", { name: "The hill", exact: true })).toBeVisible();
  await expect(page.getByTestId("scene-player")).toHaveAttribute("data-engine-ready", "true");
  expect(audioRequests).toBe(0);
  await page.getByRole("heading", { name: "Scene Lab", exact: true }).click();
  await expect.poll(() => audioRequests).toBeGreaterThan(0);
  await page.screenshot({ path: testInfo.outputPath("synthetic-approved-plane.png"), fullPage: true });
  broken = true;
  await expect(page.getByRole("heading", { name: "Broken artwork fixture" })).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "Scene artwork could not load" })).toBeVisible();
  await expect(page.getByText(gallia.beats[0].body, { exact: true })).toBeVisible();
});

test("narrow reduced-motion playback keeps all prose, sources and controls reachable; mute survives navigation", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/scene/gallia");
  await page.getByRole("button", { name: "Mute", exact: true }).click();
  for (const [index, beat] of gallia.beats.entries()) {
    await page.getByRole("tab", { name: `Go to beat ${index + 1}: ${beat.headline}`, exact: true }).click();
    await expect(page.getByText(beat.body, { exact: true })).toBeVisible();
    await page.getByText(`Sources (${beat.sources.length})`, { exact: true }).click();
    for (const source of beat.sources) await expect(page.getByText(source.label, { exact: true })).toBeVisible();
    const player = page.getByTestId("scene-player");
    const button = page.getByRole("button", { name: "Unmute", exact: true });
    await expect(button).toBeVisible();
    const bounds = await player.boundingBox();
    const controls = await button.boundingBox();
    expect(controls!.y + controls!.height).toBeLessThanOrEqual(bounds!.y + bounds!.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  }
  await page.goto("/atlas");
  await page.goto("/scene/gallia");
  await expect(page.getByRole("button", { name: "Unmute", exact: true })).toHaveAttribute("aria-pressed", "true");
});
