import { expect, test } from "@playwright/test";
import { Region, Rig } from "../content/schema";
import gallia from "../content/regions/gallia.json";
import legionary from "../content/rigs/legionary.json";

declare global {
  interface Window {
    __imperiumAudioProbe: { starts: number; active: number };
    __imperiumCueProbe: { durations: number[]; loops: number };
  }
}

test("Gallia's real approved cues decode and play only on their beat entries", async ({ page }) => {
  test.setTimeout(90_000);
  await page.addInitScript(() => {
    const probe = { durations: [] as number[], loops: 0 };
    window.__imperiumCueProbe = probe;
    const activeLoops = new Set<AudioBufferSourceNode>();
    const start = AudioBufferSourceNode.prototype.start;
    const stop = AudioBufferSourceNode.prototype.stop;
    AudioBufferSourceNode.prototype.start = function (...args: Parameters<typeof start>) {
      start.apply(this, args);
      if (this.loop) activeLoops.add(this);
      else if (this.buffer && this.buffer.duration > 0.1 && this.buffer.duration < 1) probe.durations.push(this.buffer.duration);
      probe.loops = activeLoops.size;
    };
    AudioBufferSourceNode.prototype.stop = function (...args: Parameters<typeof stop>) {
      stop.apply(this, args);
      activeLoops.delete(this);
      probe.loops = activeLoops.size;
    };
  });
  const audioRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/assets/gallia/audio/")) audioRequests.push(request.url());
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/scene/gallia");
  await expect(page.getByTestId("scene-player")).toHaveAttribute("data-engine-ready", "true");
  expect(audioRequests).toEqual([]);
  await page.getByRole("heading", { name: "The hill", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__imperiumCueProbe.loops)).toBe(1);
  await page.getByRole("tab", { name: /^Go to beat 2:/ }).click();
  await expect.poll(() => page.evaluate(() => window.__imperiumCueProbe.durations.length)).toBe(1);
  expect(await page.evaluate(() => window.__imperiumCueProbe.durations[0])).toBeCloseTo(0.24025, 2);
  await page.getByRole("tab", { name: /^Go to beat 4:/ }).click();
  await expect(page.getByRole("heading", { name: "The Mandubii", exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.__imperiumCueProbe.durations.length)).toBe(1);
  await page.getByRole("button", { name: "Mute", exact: true }).click();
  await page.getByRole("tab", { name: /^Go to beat 6:/ }).click();
  await page.getByRole("button", { name: "Unmute", exact: true }).click();
  await page.getByRole("tab", { name: /^Go to beat 1:/ }).click();
  expect(await page.evaluate(() => window.__imperiumCueProbe.durations.length)).toBe(1);
  await page.getByRole("tab", { name: /^Go to beat 6:/ }).click();
  await expect.poll(() => page.evaluate(() => window.__imperiumCueProbe.durations.length)).toBe(2);
  expect(await page.evaluate(() => window.__imperiumCueProbe.durations[1])).toBeCloseTo(0.66104, 2);
  await expect(page.getByRole("status").filter({ hasText: "Audio unavailable" })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect.poll(() => page.evaluate(() => window.__imperiumCueProbe.loops)).toBe(0);
});

test("audio needs a trusted gesture, recovers from a failed load, and stops its loop on exit", async ({ page }) => {
  test.setTimeout(90_000);
  // Silent in-memory fixture and approval: no production recording or rights decision.
  const wave = Buffer.alloc(44 + 8000);
  wave.write("RIFF", 0); wave.writeUInt32LE(wave.length - 8, 4); wave.write("WAVEfmt ", 8);
  wave.writeUInt32LE(16, 16); wave.writeUInt16LE(1, 20); wave.writeUInt16LE(1, 22);
  wave.writeUInt32LE(8000, 24); wave.writeUInt32LE(8000, 28); wave.writeUInt16LE(1, 32);
  wave.writeUInt16LE(8, 34); wave.write("data", 36); wave.writeUInt32LE(8000, 40); wave.fill(128, 44);
  await page.addInitScript(() => {
    const probe = { starts: 0, active: 0 };
    window.__imperiumAudioProbe = probe;
    const active = new Set<AudioBufferSourceNode>();
    const start = AudioBufferSourceNode.prototype.start;
    const stop = AudioBufferSourceNode.prototype.stop;
    AudioBufferSourceNode.prototype.start = function (...args: Parameters<typeof start>) {
      start.apply(this, args);
      if (this.loop) { active.add(this); probe.starts += 1; probe.active = active.size; }
    };
    AudioBufferSourceNode.prototype.stop = function (...args: Parameters<typeof stop>) {
      stop.apply(this, args);
      active.delete(this); probe.active = active.size;
    };
  });
  let requests = 0;
  let allowLoad = false;
  await page.route("**/assets/audio/recovery-bed.wav", (route) => {
    requests += 1;
    return route.fulfill({ status: allowLoad ? 200 : 503, contentType: "audio/wav", body: allowLoad ? wave : "unavailable" });
  });
  const data = Region.parse(gallia);
  data.scene.planes.forEach((plane) => { plane.placeholder = true; });
  data.beats.forEach((beat) => { delete beat.audio.cue; delete beat.audio.cueVolume; delete beat.audio.narration; beat.actors = []; });
  data.scene.audioAssets = { wind_plains: "audio/recovery-bed.wav" };
  data.scene.audioPlaceholder = false;
  const manifest = [{
    file: "public/assets/audio/recovery-bed.wav", source: "https://example.com/synthetic-test", licence: "CC0", retrieved: "2026-10-22",
    approval: { by: "synthetic test fixture", at: "2026-10-22", rightsUrl: "https://example.com/synthetic-test", rightsStatement: "Synthetic test fixture only" },
  }];
  await page.route("**/api/dev/region-content?id=gallia", (route) => route.fulfill({
    json: { ok: true, data, rigs: [Rig.parse(legionary)], manifest },
  }));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/dev/scene-lab");
  await page.getByLabel("Region:").selectOption("gallia");
  await expect(page.getByRole("heading", { name: "The hill", exact: true })).toBeVisible();
  await expect(page.getByTestId("scene-player")).toHaveAttribute("data-engine-ready", "true");
  const prematureRequest = page.waitForRequest("**/assets/audio/recovery-bed.wav", { timeout: 500 }).then(() => true, () => false);
  await page.getByRole("button", { name: "Mute", exact: true }).evaluate((button: HTMLButtonElement) => button.click());
  await page.getByRole("button", { name: "Unmute", exact: true }).evaluate((button: HTMLButtonElement) => button.click());
  expect(await prematureRequest).toBe(false);
  expect(requests).toBe(0);
  await page.getByRole("heading", { name: "Scene Lab", exact: true }).click();
  const unavailable = page.getByRole("status").filter({ hasText: "Audio unavailable" });
  await expect(unavailable).toBeVisible();
  expect(requests).toBe(1);
  allowLoad = true;
  await page.getByRole("button", { name: "Mute", exact: true }).click();
  await page.getByRole("button", { name: "Unmute", exact: true }).click();
  await expect.poll(() => requests).toBe(2);
  await expect(unavailable).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.__imperiumAudioProbe.active)).toBe(1);
  await page.getByRole("tab", { name: /^Go to beat 2:/ }).click();
  await expect.poll(() => page.evaluate(() => window.__imperiumAudioProbe.starts)).toBe(1);
  await page.keyboard.press("Escape");
  await expect.poll(() => page.evaluate(() => window.__imperiumAudioProbe.active)).toBe(0);
});
