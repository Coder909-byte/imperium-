// Production audio/render audit. No account creation or progress DB writes.
// node --import tsx scripts/audit-scene-audio.mjs http://127.0.0.1:3006 /tmp/imperium-m10-audio
import { chromium, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import { installAudioProbe, audioState } from '../e2e/audio-probe.ts';

const [base = 'http://127.0.0.1:3006', output = '/tmp/imperium-m10-audio', regionId = 'gallia'] = process.argv.slice(2);
if (!['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) throw new Error('Use a local preview');
if (!/^[a-z-]+$/.test(regionId)) throw new Error('Invalid region');
const gallia = JSON.parse(await fs.readFile(`content/regions/${regionId}.json`, 'utf8'));
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = { base, measuredAt: new Date().toISOString(), environment: { node: process.version, chrome: browser.version(), mode: 'macOS desktop headless Chrome; 1440x1000 normal motion and 390x844 reduced motion; not physical phone, Safari or audible owner review' }, pages: [], audioTransfers: [] };

for (const width of [1440, 390]) {
  const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 1000 }, reducedMotion: width === 390 ? 'reduce' : 'no-preference' });
  const errors = [], failedResponses = [], bodies = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.status() >= 400) failedResponses.push({ url: response.url(), status: response.status() });
    if (response.url().includes('/audio/')) bodies.push(response.body().then(body => ({ width, path: new URL(response.url()).pathname, bytes: body.length, status: response.status() })).catch(() => null));
  });
  await installAudioProbe(page);
  await page.goto(`${base}/scene/${regionId}`);
  const player = page.getByTestId('scene-player');
  await expect(player).toHaveAttribute('data-engine-ready', 'true', { timeout: 30000 });
  expect((await audioState(page)).starts).toEqual([]);
  await page.getByRole('heading', { name: gallia.beats[0].headline, exact: true }).click();
  if (width === 1440) await page.getByRole('button', { name: '▶ Autoplay', exact: true }).click();
  for (let index = 0; index < 6; index++) {
    if (index && width === 390) await page.getByRole('tab', { name: new RegExp(`^Go to beat ${index + 1}:`) }).click();
    await expect(page.getByRole('tab', { name: new RegExp(`^Go to beat ${index + 1}:`) })).toHaveAttribute('aria-current', 'true', { timeout: 60000 });
    await expect(player).toHaveAttribute('data-narration-state', 'playing', { timeout: 15000 });
    await expect.poll(async () => (await audioState(page)).active.find(source => source.loop)?.gain).toBeCloseTo(gallia.beats[index].audio.bedIntensity * 0.18, 3);
    await expect(page.getByText(gallia.beats[index].body, { exact: true })).toBeVisible();
    const audio = await audioState(page);
    expect(audio.active.filter(source => source.loop)).toHaveLength(1);
    expect(audio.active.filter(source => !source.loop && source.seconds > 1.4)).toHaveLength(1);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `${output}/beat-${index + 1}-${width}.png`, fullPage: true });
    const item = { width, beat: gallia.beats[index].id, narrationState: await player.getAttribute('data-narration-state'), audio, overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), errors: [...errors], failedResponses: [...failedResponses] };
    report.pages.push(item);
    console.log(JSON.stringify({ width, beat: index + 1, narration: item.narrationState, activeLoops: audio.active.filter(source => source.loop).length, activeNarrators: audio.active.filter(source => !source.loop && source.seconds > 1.4).length, overflow: item.overflow }));
  }
  if (width === 1440) {
    await expect(player).toHaveAttribute('data-narration-state', 'ended', { timeout: 45000 });
    await expect(page.getByRole('button', { name: '▶ Autoplay', exact: true })).toBeVisible();
    await expect.poll(async () => (await audioState(page)).active.filter(source => !source.loop).length).toBe(0);
    await expect.poll(async () => (await audioState(page)).active.find(source => source.loop)?.gain).toBeCloseTo(gallia.beats[5].audio.bedIntensity, 3);
    const audio = await audioState(page);
    report.completeAutoplay = { allSixRealRecordingsCompleted: true, stoppedAtFinalBeat: true, narrationDurations: audio.starts.filter(source => !source.loop && source.seconds > 1.4).map(source => source.seconds), cueDurations: audio.starts.filter(source => !source.loop && source.seconds <= 1.4).map(source => source.seconds), loopsStarted: audio.starts.filter(source => source.loop).length };
    expect(report.completeAutoplay.narrationDurations).toHaveLength(6);
    expect(report.completeAutoplay.cueDurations).toHaveLength(gallia.beats.filter(beat => beat.audio.cue).length);
    expect(report.completeAutoplay.loopsStarted).toBe(1);
  }
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await audioState(page)).active.length).toBe(0);
  report.pages.push({ width, state: 'exit', activeAudio: 0, errors: [...errors], failedResponses: [...failedResponses] });
  report.audioTransfers.push(...(await Promise.all(bodies)).filter(Boolean));
  await page.close();
}
await fs.writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
await browser.close();
if (report.pages.some(page => page.overflow || page.errors.length || page.failedResponses.length)) process.exitCode = 1;
