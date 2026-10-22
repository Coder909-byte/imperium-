// Desktop/narrow composition audit. Screenshots are review artifacts,
// never source art. Run against an already running local dev server.
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const base = process.argv[2] ?? 'http://localhost:3000';
const out = resolve(process.argv[3] ?? '/tmp/imperium-m8-visual-after');
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const report = [];
try {
  for (const mode of (process.argv[4]?.split(',') ?? ['route', 'high', 'narrow'])) {
    const page = await browser.newPage({ viewport: mode === 'narrow' ? { width: 390, height: 844 } : { width: 1440, height: 1000 } });
    const errors = [], requests = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('response', (response) => { if (response.url().includes('/assets/')) requests.push({ url: response.url(), status: response.status() }); });
    await page.goto(`${base}/${mode === 'high' ? 'dev/scene-lab?region=gallia' : 'scene/gallia'}`);
    if (mode === 'high') {
      await page.getByLabel('Region:').selectOption('gallia');
      await page.getByLabel('Tier:').selectOption('high');
    }
    await page.waitForFunction(() => document.querySelector('[data-testid="scene-player"]')?.getAttribute('data-engine-ready') === 'true');
    const beats = [];
    for (let i = 1; i <= 6; i++) {
      const pip = page.getByRole('tab', { name: new RegExp(`^Go to beat ${i}:`) });
      await pip.click();
      await page.waitForTimeout(900);
      await page.screenshot({ path: `${out}/${mode}-beat-${i}-entry.png`, fullPage: true });
      if (i === 2) {
        await page.waitForTimeout(24_000);
        await page.screenshot({ path: `${out}/${mode}-beat-2-settled.png`, fullPage: true });
      }
      if (await pip.getAttribute('aria-current') !== 'true') throw new Error(`${mode} beat ${i} remounted during capture; rerun without content edits`);
      beats.push(await page.getByTestId('scene-player').getAttribute('data-visible-planes'));
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.getByRole('tab', { name: /^Go to beat 2:/ }).click();
    await page.screenshot({ path: `${out}/${mode}-beat-2-reduced.png`, fullPage: true });
    report.push({ mode, tier: await page.getByTestId('scene-player').getAttribute('data-device-tier'), beats, errors, requests });
    await page.close();
    console.log(`${mode}: six beats captured`);
  }
} finally { await browser.close(); }
writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2) + '\n');
console.log(`Saved ${out}`);
