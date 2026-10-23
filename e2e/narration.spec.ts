import { createHash } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { Region } from "../content/schema";
import gallia from "../content/regions/gallia.json";

declare global { interface Window { __narrationProbe: { active: number; peak: number; starts: number[] } } }

function wave(seconds: number): Buffer {
  const data = Buffer.alloc(44 + seconds * 8000, 128);
  data.write("RIFF", 0); data.writeUInt32LE(data.length - 8, 4); data.write("WAVEfmt ", 8);
  data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22);
  data.writeUInt32LE(8000, 24); data.writeUInt32LE(8000, 28); data.writeUInt16LE(1, 32);
  data.writeUInt16LE(8, 34); data.write("data", 36); data.writeUInt32LE(data.length - 44, 40);
  return data;
}

async function trackVoices(page: Page) {
  await page.addInitScript(() => {
    const probe = { active: 0, peak: 0, starts: [] as number[] };
    window.__narrationProbe = probe;
    const voices = new Set<AudioBufferSourceNode>();
    const start = AudioBufferSourceNode.prototype.start;
    const stop = AudioBufferSourceNode.prototype.stop;
    AudioBufferSourceNode.prototype.start = function (...args: Parameters<typeof start>) {
      start.apply(this, args);
      if (!this.loop && this.buffer && this.buffer.duration >= 1.4) {
        voices.add(this); probe.active = voices.size; probe.peak = Math.max(probe.peak, voices.size);
        probe.starts.push(this.buffer.duration);
        this.addEventListener("ended", () => { voices.delete(this); probe.active = voices.size; });
      }
    };
    AudioBufferSourceNode.prototype.stop = function (...args: Parameters<typeof stop>) {
      stop.apply(this, args); voices.delete(this); probe.active = voices.size;
    };
  });
}

async function fixture(page: Page, firstLoad?: () => Promise<void>, fail = false) {
  const durations = [3, 4, 1.5];
  const data = Region.parse(gallia);
  data.scene.planes.forEach(plane => { plane.placeholder = true; });
  data.scene.ambientBed = "none";
  data.scene.audioAssets = {};
  data.scene.narrationPending = false;
  data.beats.forEach(beat => { beat.actors = []; delete beat.audio.cue; delete beat.audio.narration; });
  for (let i = 0; i < 3; i++) {
    const id = `voice${i}`;
    data.scene.audioAssets[id] = `audio/narration-${i}.wav`;
    data.beats[i].audio.narration = { asset: id, durationMs: durations[i] * 1000,
      transcriptSha256: createHash("sha256").update(data.beats[i].body).digest("hex") };
  }
  // Silent in-memory playback fixtures, never production audio/approvals.
  const manifest = Object.values(data.scene.audioAssets).map(asset => ({
    file: `public/assets/${asset}`, source: "https://example.com/test", licence: "CC0", retrieved: "2026-10-23",
    approval: { by: "synthetic test fixture", at: "2026-10-23", rightsUrl: "https://example.com/test", rightsStatement: "Synthetic test only" },
  }));
  await page.route("**/api/dev/region-content?id=gallia", route => route.fulfill({ json: { ok: true, data, rigs: [], manifest } }));
  let firstRequests = 0;
  await page.route("**/assets/audio/narration-*.wav", async route => {
    const index = Number(route.request().url().match(/narration-(\d)/)?.[1]);
    if (index === 0) { firstRequests++; if (firstRequests === 1) await firstLoad?.(); }
    await route.fulfill({ status: fail && index === 0 ? 503 : 200, contentType: "audio/wav", body: wave(durations[index]) });
  });
  await trackVoices(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/dev/scene-lab");
  await page.getByLabel("Region:").selectOption("gallia");
  await expect(page.getByTestId("scene-player")).toHaveAttribute("data-engine-ready", "true", { timeout: 30_000 });
  return { firstRequests: () => firstRequests };
}

test("a delayed old download never speaks; toggles, re-entry and exit keep at most one narrator", async ({ page }) => {
  test.setTimeout(90_000);
  let release = () => {};
  const delay = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const requests = await fixture(page, () => delay);
  expect(requests.firstRequests()).toBe(0);
  await page.getByRole("heading", { name: "The hill", exact: true }).click();
  await expect.poll(requests.firstRequests).toBe(1);
  await page.getByRole("tab", { name: /^Go to beat 2:/ }).click();
  await expect.poll(() => page.evaluate(() => window.__narrationProbe.starts)).toEqual([4]);
  release();
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__narrationProbe.starts)).toEqual([4]);
  await page.getByRole("button", { name: "Ambience on", exact: true }).click();
  expect(await page.evaluate(() => window.__narrationProbe.active)).toBe(1);
  await page.getByRole("button", { name: "Narration on", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__narrationProbe.active)).toBe(0);
  await expect(page.getByText(gallia.beats[1].body, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Narration off", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__narrationProbe.active)).toBe(1);
  await page.getByRole("tab", { name: /^Go to beat 3:/ }).click();
  await page.getByRole("tab", { name: /^Go to beat 1:/ }).click();
  await expect.poll(() => page.evaluate(() => window.__narrationProbe.starts.at(-1))).toBe(3);
  expect(await page.evaluate(() => window.__narrationProbe.peak)).toBe(1);
  await page.keyboard.press("Escape");
  await expect.poll(() => page.evaluate(() => window.__narrationProbe.active)).toBe(0);
  expect(errors).toEqual([]);
});

test("autoplay follows the current narration's real end rather than its longer reading dwell", async ({ page }) => {
  await fixture(page);
  const player = page.getByTestId("scene-player");
  await page.getByRole("heading", { name: "The hill", exact: true }).click();
  await expect(player).toHaveAttribute("data-narration-state", "playing");
  await page.getByRole("button", { name: "▶ Autoplay", exact: true }).click();
  await expect(page.getByRole("tab", { name: /^Go to beat 1:/ })).toHaveAttribute("aria-current", "true");
  await expect(page.getByRole("tab", { name: /^Go to beat 2:/ })).toHaveAttribute("aria-current", "true", { timeout: 6500 });
  await expect(player).toHaveAttribute("data-narration-state", "playing");
  await page.getByRole("button", { name: "⏸ Autoplay", exact: true }).click();
  await expect(player).toHaveAttribute("data-narration-state", "ended", { timeout: 6000 });
  await page.waitForTimeout(1200);
  await expect(page.getByRole("tab", { name: /^Go to beat 2:/ })).toHaveAttribute("aria-current", "true");
});

test("a failed recording leaves prose visible and autoplay on reading-time fallback", async ({ page }) => {
  test.setTimeout(60_000);
  await fixture(page, undefined, true);
  await page.getByRole("button", { name: "▶ Autoplay", exact: true }).click();
  await expect(page.getByTestId("scene-player")).toHaveAttribute("data-narration-state", "failed");
  await expect(page.getByText(gallia.beats[0].body, { exact: true })).toBeVisible();
  await page.waitForTimeout(1200);
  await expect(page.getByRole("tab", { name: /^Go to beat 1:/ })).toHaveAttribute("aria-current", "true");
  await expect(page.getByRole("status").filter({ hasText: "Reading time is active" })).toBeVisible();
  await expect(page.getByRole("tab", { name: /^Go to beat 2:/ })).toHaveAttribute("aria-current", "true", { timeout: 30_000 });
});

test("the reviewed sample has a working local player", async ({ page }) => {
  await page.goto("/dev/narration");
  const player = page.getByLabel("Play Gallia narration sample");
  await player.click();
  await player.evaluate((audio: HTMLAudioElement) => audio.play());
  await expect.poll(() => player.evaluate((audio: HTMLAudioElement) => audio.currentTime)).toBeGreaterThan(0);
  expect(await player.evaluate((audio: HTMLAudioElement) => audio.duration)).toBeCloseTo(9.85, 2);
});

test("all six production recordings decode, play singly and cancel on master mute and exit", async ({ page }) => {
  test.setTimeout(120_000);
  const region = Region.parse(gallia);
  expect(region.beats.every(beat => beat.audio.narration)).toBe(true);
  await trackVoices(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/scene/gallia");
  await expect(page.getByTestId("scene-player")).toHaveAttribute("data-engine-ready", "true", { timeout: 30_000 });
  expect(await page.evaluate(() => window.__narrationProbe.starts)).toEqual([]);
  await page.getByRole("heading", { name: region.beats[0].headline, exact: true }).click();
  for (let index = 0; index < region.beats.length; index++) {
    if (index > 0) await page.getByRole("tab", { name: new RegExp(`^Go to beat ${index + 1}:`) }).click();
    await expect.poll(() => page.evaluate(() => window.__narrationProbe.starts.length)).toBe(index + 1);
    const seconds = await page.evaluate(() => window.__narrationProbe.starts.at(-1));
    expect(seconds).toBeCloseTo(region.beats[index].audio.narration!.durationMs / 1000, 1);
    await expect(page.getByText(region.beats[index].body, { exact: true })).toBeVisible();
  }
  expect(await page.evaluate(() => window.__narrationProbe.peak)).toBe(1);
  await page.getByRole("button", { name: "Mute", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__narrationProbe.active)).toBe(0);
  await page.getByRole("button", { name: "Unmute", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__narrationProbe.active)).toBe(1);
  await page.keyboard.press("Escape");
  await expect.poll(() => page.evaluate(() => window.__narrationProbe.active)).toBe(0);
});
