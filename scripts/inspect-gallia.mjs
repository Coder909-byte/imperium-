// Rendered UX audit; no auth actions or database writes.
// node scripts/inspect-gallia.mjs before /tmp/imperium-m8-ux
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
const phase = process.argv[2] ?? 'after';
const root = process.argv[3] ?? '/tmp/imperium-m8-ux';
const folder = `${root}/${phase}`;
mkdirSync(folder, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const reports = [];
try {
  for (const mode of ['desktop', 'narrow']) {
    const context = await browser.newContext({ viewport: mode === 'desktop' ? { width: 1440, height: 900 } : { width: 390, height: 844 }, deviceScaleFactor: mode === 'desktop' ? 1 : 2 });
    const page = await context.newPage();
    const errors = [];
    const badRequests = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('response', (response) => { if (response.status() >= 400) badRequests.push({ path: new URL(response.url()).pathname, status: response.status() }); });
    await page.goto('http://localhost:3000/atlas');
    await page.screenshot({ path: `${folder}/${mode}-atlas.png`, fullPage: true });
    await page.getByRole('button', { name: 'Switch main map to 117 AD', exact: true }).click();
    await page.locator('path[aria-label^="Gallia"]').click();
    await page.waitForURL('**/scene/gallia');
    await page.getByTestId('scene-player').waitFor();
    await page.waitForFunction(() => document.querySelector('[data-testid="scene-player"]')?.getAttribute('data-engine-ready') === 'true');
    await page.waitForFunction(() => document.querySelector('[data-testid="cloud-sweep"]')?.getAttribute('data-active') !== 'true');
    const beats = [];
    for (let i = 0; i < 6; i++) {
      const pip = page.getByRole('tab', { name: new RegExp(`Go to beat ${i + 1}:`) });
      await pip.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `${folder}/${mode}-beat-${i + 1}-2s.png`, fullPage: true });
      await page.waitForTimeout(8000);
      await page.screenshot({ path: `${folder}/${mode}-beat-${i + 1}-10s.png`, fullPage: true });
      beats.push(await page.evaluate(() => {
        const bounds = (selector) => {
          const element = document.querySelector(selector);
          if (!element) return null;
          const rect = element.getBoundingClientRect();
          return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
        };
        const canvas = document.querySelector('canvas');
        return { headline: document.querySelector('h2')?.textContent, player: bounds('[data-testid="scene-player"]'), canvas: bounds('canvas'), backing: canvas ? { width: canvas.width, height: canvas.height } : null, caption: bounds('[aria-live="polite"]'), scrollWidth: document.documentElement.scrollWidth, viewport: { width: innerWidth, height: innerHeight } };
      }));
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.getByRole('tab', { name: /Go to beat 3:/ }).click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${folder}/${mode}-reduced-motion.png`, fullPage: true });
    await page.getByRole('button', { name: /Return to the map/ }).click();
    await page.waitForURL('**/atlas');
    reports.push({ mode, beats, errors, badRequests, canvasAfterExit: await page.locator('canvas').count() });
    console.log(`${phase}: ${mode} six-beat walkthrough complete; ${errors.length} console/page errors, ${badRequests.length} failed responses`);
    await context.close();
  }
} finally { await browser.close(); }
writeFileSync(`${folder}/report.json`, JSON.stringify(reports, null, 2) + '\n');
