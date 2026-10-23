import { expect, test } from "@playwright/test";
import { audioState, installAudioProbe } from "./audio-probe";
import gallia from "../content/regions/gallia.json";
import { readFileSync } from "node:fs";
import { Region } from "../content/schema";

test.beforeEach(async ({ page }) => {
  await installAudioProbe(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("all six beats keep one narrator and one correctly ducked wind bed", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/scene/gallia");
  const player = page.getByTestId("scene-player");
  await expect(player).toHaveAttribute("data-engine-ready", "true");
  expect((await audioState(page)).starts).toEqual([]);
  await page.getByRole("heading", { name: "The hill", exact: true }).click();
  for (let index = 0; index < 6; index++) {
    if (index) await page.getByRole("tab", { name: new RegExp(`^Go to beat ${index + 1}:`) }).click();
    await expect(player).toHaveAttribute("data-narration-state", "playing");
    await expect.poll(async () => (await audioState(page)).active.filter(source => !source.loop && source.seconds > 1.4).length).toBe(1);
    await expect.poll(async () => (await audioState(page)).active.filter(source => source.loop).length).toBe(1);
    await expect.poll(async () => (await audioState(page)).active.find(source => source.loop)?.gain).toBeCloseTo(gallia.beats[index].audio.bedIntensity * 0.18, 3);
  }
  await page.keyboard.press("Escape");
  await expect.poll(async () => (await audioState(page)).active.length).toBe(0);
});

test("separate settings persist, replay uses the current beat, and history navigation releases old playback", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/scene/gallia");
  await expect(page.getByTestId("scene-player")).toHaveAttribute("data-engine-ready", "true");
  await page.getByRole("heading", { name: "The hill", exact: true }).click();
  await expect(page.getByTestId("scene-player")).toHaveAttribute("data-narration-state", "playing");
  await page.getByRole("button", { name: "Narration on", exact: true }).click();
  await expect.poll(async () => (await audioState(page)).active.filter(source => !source.loop).length).toBe(0);
  await expect.poll(async () => (await audioState(page)).active.find(source => source.loop)?.gain).toBeCloseTo(0.35, 3);
  await page.getByRole("button", { name: "Ambience on", exact: true }).click();
  await expect.poll(async () => (await audioState(page)).active.find(source => source.loop)?.gain).toBe(0);
  await page.getByRole("button", { name: "Mute", exact: true }).click();
  expect(await page.evaluate(() => ["imperium:audio-muted", "imperium:narration-enabled", "imperium:ambience-enabled"].map(key => localStorage.getItem(key)))).toEqual(["true", "false", "false"]);
  await page.reload();
  await expect(page.getByRole("button", { name: "Unmute", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Narration off", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ambience off", exact: true })).toBeVisible();
  expect((await audioState(page)).starts).toEqual([]);
  await page.getByRole("button", { name: "Unmute", exact: true }).click();
  expect((await audioState(page)).active).toEqual([]);
  await page.getByRole("button", { name: "Narration off", exact: true }).click();
  await expect.poll(async () => (await audioState(page)).active.length).toBe(1);
  await page.getByRole("tab", { name: /^Go to beat 2:/ }).click();
  await page.getByRole("tab", { name: /^Go to beat 1:/ }).click();
  await expect.poll(async () => (await audioState(page)).active.length).toBe(1);
  await expect(page.getByTestId("scene-player")).toHaveAttribute("data-narration-state", "playing");
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/atlas$/);
  await expect.poll(async () => (await audioState(page)).active.length).toBe(0);
  await page.goBack();
  await expect(page.getByTestId("scene-player")).toHaveAttribute("data-engine-ready", "true");
  expect((await audioState(page)).active).toEqual([]);
  await page.getByRole("heading", { name: "The hill", exact: true }).click();
  await expect.poll(async () => (await audioState(page)).active.length).toBe(1);
  await page.getByRole("tab", { name: /^Go to beat 6:/ }).click();
  await expect(page.getByTestId("scene-player")).toHaveAttribute("data-narration-state", "playing");
  await page.getByRole("button", { name: /^Test yourself on/ }).click();
  await expect(page).toHaveURL(/\/quiz\/gallia$/);
  await expect.poll(async () => (await audioState(page)).active.length).toBe(0);
});

test("a delayed wind download starts only one bed after rapid beat changes", async ({ page }) => {
  let release = () => {};
  const delayed = new Promise<void>(resolve => { release = resolve; });
  let requested = false;
  await page.route("**/assets/gallia/audio/wind-plains.wav", async route => {
    requested = true;
    await delayed;
    await route.continue();
  });
  await page.goto("/scene/gallia");
  await expect(page.getByTestId("scene-player")).toHaveAttribute("data-engine-ready", "true");
  await page.getByRole("button", { name: "Narration on", exact: true }).click();
  await expect.poll(() => requested).toBe(true);
  for (const index of [2, 3, 4, 5, 6, 1]) await page.getByRole("tab", { name: new RegExp(`^Go to beat ${index}:`) }).click();
  release();
  await expect.poll(async () => (await audioState(page)).active.filter(source => source.loop).length).toBe(1);
  await page.waitForTimeout(800);
  expect((await audioState(page)).starts.filter(source => source.loop)).toHaveLength(1);
  await page.keyboard.press("Escape");
  await expect.poll(async () => (await audioState(page)).active.length).toBe(0);
});

test("a failed real narration can be retried without retaining an old stream", async ({ page }) => {
  await page.route("**/assets/gallia/audio/narration-the-hill.mp3", route => route.fulfill({ status: 503, body: "unavailable" }), { times: 1 });
  await page.goto("/scene/gallia");
  const player = page.getByTestId("scene-player");
  await expect(player).toHaveAttribute("data-engine-ready", "true");
  await page.getByRole("heading", { name: "The hill", exact: true }).click();
  await expect(player).toHaveAttribute("data-narration-state", "failed");
  expect((await audioState(page)).active.filter(source => !source.loop)).toEqual([]);
  await expect(page.getByText(gallia.beats[0].body, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Narration on", exact: true }).click();
  await page.getByRole("button", { name: "Narration off", exact: true }).click();
  await expect(player).toHaveAttribute("data-narration-state", "playing");
  await expect.poll(async () => (await audioState(page)).active.filter(source => !source.loop).length).toBe(1);
  await page.keyboard.press("Escape");
  await expect.poll(async () => (await audioState(page)).active.length).toBe(0);
});

test("real WebAudio bed crossfades settle and rapid return cancels stale stops", async ({ page }) => {
  const data = Region.parse(gallia);
  data.scene.planes.forEach(plane => { plane.placeholder = true; });
  data.beats.forEach(beat => { beat.actors = []; delete beat.audio.narration; delete beat.audio.cue; });
  data.scene.ambientBed = "wind";
  data.scene.audioAssets = { wind: "audio/test-wind.wav", battle: "audio/test-battle.wav" };
  data.beats[0].audio = { bed: "wind", bedIntensity: 0.2 };
  data.beats[1].audio = { bed: "battle", bedIntensity: 0.8 };
  // In-memory routing fixtures only; no production asset or approval is added.
  const manifest = Object.values(data.scene.audioAssets).map(file => ({ file: `public/assets/${file}`, source: "https://example.com/test", licence: "CC0", retrieved: "2026-10-23",
    approval: { by: "synthetic test fixture", at: "2026-10-23", rightsUrl: "https://example.com/test", rightsStatement: "Synthetic routing fixture for the existing approved wind" } }));
  const wind = readFileSync("public/assets/gallia/audio/wind-plains.wav");
  await page.route("**/assets/audio/test-*.wav", route => route.fulfill({ contentType: "audio/wav", body: wind }));
  await page.route("**/api/dev/region-content?id=gallia", route => route.fulfill({ json: { ok: true, data, rigs: [], manifest } }));
  await page.goto("/dev/scene-lab");
  await page.getByLabel("Region:").selectOption("gallia");
  await expect(page.getByTestId("scene-player")).toHaveAttribute("data-engine-ready", "true");
  await page.getByRole("heading", { name: "The hill", exact: true }).click();
  await expect.poll(async () => (await audioState(page)).active.find(source => source.loop)?.gain).toBeCloseTo(0.2, 3);
  await page.getByRole("tab", { name: /^Go to beat 2:/ }).click();
  await expect.poll(async () => (await audioState(page)).active.filter(source => source.loop).length).toBe(2);
  await expect.poll(async () => (await audioState(page)).active.filter(source => source.loop).length).toBe(1);
  await expect.poll(async () => (await audioState(page)).active.find(source => source.loop)?.gain).toBeCloseTo(0.8, 3);
  for (const index of [1, 2, 1]) await page.getByRole("tab", { name: new RegExp(`^Go to beat ${index}:`) }).click();
  await page.waitForTimeout(800);
  expect((await audioState(page)).active.filter(source => source.loop)).toHaveLength(1);
  expect((await audioState(page)).active.find(source => source.loop)?.gain).toBeCloseTo(0.2, 3);
  await page.keyboard.press("Escape");
  await expect.poll(async () => (await audioState(page)).active.length).toBe(0);
});
