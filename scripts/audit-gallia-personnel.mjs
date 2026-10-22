// Desktop personnel review. Optional third argument overlays the reference
// pair at a 68px body height before expanding it into production crowds.
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const base = process.argv[2] ?? 'http://localhost:3000';
const out = process.argv[3] ?? '/tmp/imperium-m8-personnel';
const reference = process.argv[4];
const rigPair = reference === '--rig-pair';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [];
const failures = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => failures.push({ url: request.url(), reason: request.failure()?.errorText }));
  if (rigPair) await page.route('**/api/dev/region-content?id=gallia', async route => {
    const response = await route.fetch();
    const body = await response.json();
    body.data.beats[4].actors = [
      { rig: 'roman_infantry', clip: 'brace', x: 80, y: 192, scale: 0.16, count: 1, flip: false, phase: 370, depth: 0.78 },
      { rig: 'gaul_warrior', clip: 'brace', x: 240, y: 192, scale: 0.16, count: 1, flip: true, phase: 1100, depth: 0.78 },
    ];
    await route.fulfill({ json: body });
  });
  await page.goto(new URL(rigPair ? '/dev/scene-lab' : '/scene/gallia', base).href);
  if (rigPair) await page.getByLabel('Region:').selectOption('gallia');
  await page.getByTestId('scene-player').waitFor();
  await page.waitForFunction(() => document.querySelector('[data-testid="scene-player"]')?.getAttribute('data-engine-ready') === 'true');
  await page.getByRole('tab', { name: /^Go to beat 5:/ }).click();
  await page.waitForTimeout(700);
  if (reference && !rigPair) {
    await page.evaluate(src => {
      const review = document.createElement('div');
      review.id = 'personnel-reference-review';
      review.style.cssText = 'position:fixed;left:32px;top:32px;z-index:9999;padding:24px;background:#595c48;color:white;display:flex;align-items:end;gap:30px;font:14px system-ui';
      const caption = document.createElement('span');
      caption.textContent = 'Provisional pair · 68px body height';
      const img = document.createElement('img');
      img.src = src;
      img.style.cssText = 'height:73px;width:auto;object-fit:contain';
      review.append(caption, img);
      document.body.append(review);
      return img.decode();
    }, `data:image/png;base64,${readFileSync(reference).toString('base64')}`);
    await page.screenshot({ path: `${out}/reference-gameplay-size.png`, fullPage: true });
    await page.locator('#personnel-reference-review').screenshot({ path: `${out}/reference-pair-actual-size.png` });
  } else {
    await page.screenshot({ path: `${out}/beat-5-full.png`, fullPage: true });
    await page.locator('canvas').screenshot({ path: `${out}/beat-5-canvas.png` });
    const bounds = await page.locator('canvas').boundingBox();
    if (bounds) await page.screenshot({ path: `${out}/beat-5-personnel-close.png`, clip: { x: bounds.x + bounds.width * 0.18, y: bounds.y + bounds.height * 0.38, width: bounds.width * 0.72, height: bounds.height * 0.59 } });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForTimeout(3500);
    await page.screenshot({ path: `${out}/beat-5-animated.png`, fullPage: true });
  }
  writeFileSync(`${out}/browser.json`, JSON.stringify({ errors, failures, player: await page.getByTestId('scene-player').evaluate(el => Object.fromEntries([...el.attributes].filter(a => a.name.startsWith('data-')).map(a => [a.name, a.value]))) }, null, 2));
} finally { await browser.close(); }
