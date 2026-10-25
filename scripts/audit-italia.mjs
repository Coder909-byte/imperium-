// Captures the draft composition, not final-art or hardware acceptance.
// Run against the isolated local review server; never submits a quiz.
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const base = process.argv[2] ?? 'http://127.0.0.1:3008';
const out = resolve(process.argv[3] ?? '/tmp/imperium-italia-draft');
const modes = process.argv[4]?.split(',') ?? ['desktop', 'high', 'low', 'narrow'];
const region = JSON.parse(readFileSync('content/regions/italia.json', 'utf8'));
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const report = [];
try {
  for (const mode of modes) {
    const page = await browser.newPage({ viewport: mode === 'narrow' ? { width: 390, height: 1000 } : { width: 1440, height: 1000 }, reducedMotion: mode === 'narrow' ? 'reduce' : 'no-preference' });
    const errors = [], failures = [], assetRequests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400 && !response.url().includes('/_next/')) failures.push({ url: response.url(), status: response.status() }); });
    page.on('request', request => { if (request.url().includes('/assets/')) assetRequests.push(request.url()); });
    await page.route('**/api/progress/**', route => route.fulfill({ json: { saved: false } }));
    const pinned = mode === 'high' || mode === 'low';
    await page.goto(`${base}/${pinned ? 'dev/scene-lab' : 'scene/italia'}`);
    if (pinned) {
      await page.getByLabel('Region:').selectOption('italia');
      await page.getByLabel('Tier:').selectOption(mode);
    }
    await page.getByRole('heading', { name: region.beats[0].headline, exact: true }).waitFor();
    await page.waitForFunction(() => document.querySelector('[data-testid="scene-player"]')?.getAttribute('data-engine-ready') === 'true');
    const beats = [];
    for (const [index, beat] of region.beats.entries()) {
      const pip = page.getByRole('tab', { name: `Go to beat ${index + 1}: ${beat.headline}`, exact: true });
      await pip.click();
      await page.waitForTimeout(900);
      await page.screenshot({ path: `${out}/${mode}-beat-${index + 1}.png`, fullPage: true });
      const snapshot = await page.getByTestId('scene-player').evaluate(element => ({
        tier: element.getAttribute('data-device-tier'), planes: element.getAttribute('data-visible-planes'),
        actors: element.getAttribute('data-active-actors'), ready: element.getAttribute('data-engine-ready'),
        overflow: document.documentElement.scrollWidth > innerWidth,
      }));
      if (await pip.getAttribute('aria-current') !== 'true' || snapshot.ready !== 'true' || snapshot.overflow) throw new Error(`${mode}: invalid beat ${index + 1} capture`);
      beats.push({ id: beat.id, ...snapshot });
    }
    if (mode === 'desktop') {
      await page.getByRole('tab', { name: /^Go to beat 3:/ }).click();
      await page.waitForTimeout(27_000);
      await page.screenshot({ path: `${out}/desktop-beat-3-settled.png`, fullPage: true });
    }
    if (errors.length || failures.length || assetRequests.length) throw new Error(JSON.stringify({ mode, errors, failures, assetRequests }));
    report.push({ mode, beats, errors, failures, assetRequests });
    await page.close();
    console.log(`${mode}: all six draft beats captured`);
  }
} finally { await browser.close(); }
writeFileSync(`${out}/report.json`, JSON.stringify({ base, draft: true, finalArtAcceptance: false, runs: report }, null, 2) + '\n');
console.log(`Saved ${out}`);
