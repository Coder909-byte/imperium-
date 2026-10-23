// Local production probe: GL submissions, rAF gaps and a still with no beat FX.
// Usage: node scripts/measure-scene-draws.mjs http://localhost:3002 before
// Instrumentation adds overhead; these numbers are not mobile GPU timings.
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const base = process.argv[2] ?? 'http://localhost:3002';
const label = process.argv[3] ?? 'sample';
const stillsOnly = process.argv[4] === '--stills-only';
if (!/^[a-z0-9-]+$/.test(label)) throw new Error('Use a lowercase filename label');
const directory = `test-results/scene-draws-${label}`;
mkdirSync(directory, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.addInitScript(() => {
    window.__sceneDrawProbe = { draws: 0, instanced: 0, framebuffers: 0 };
    const wrap = (prototype, name, counter) => {
      const original = prototype[name];
      if (!original) return;
      prototype[name] = function (...args) {
        window.__sceneDrawProbe[counter] += 1;
        return Reflect.apply(original, this, args);
      };
    };
    for (const prototype of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype]) {
      for (const name of ['drawElements', 'drawArrays']) wrap(prototype, name, 'draws');
      for (const name of ['drawElementsInstanced', 'drawArraysInstanced']) wrap(prototype, name, 'instanced');
      wrap(prototype, 'bindFramebuffer', 'framebuffers');
    }
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const client = await context.newCDPSession(page);
  const windows = [];
  for (const rate of (stillsOnly ? [] : [1, 4, 6])) {
    await client.send('Emulation.setCPUThrottlingRate', { rate });
    await page.goto(`${base}/scene/gallia`);
    await page.waitForFunction(() => document.querySelector('[data-testid="scene-player"]')?.getAttribute('data-engine-ready') === 'true');
    await page.getByRole('tab', { name: /^Go to beat 5:/ }).click();
    await page.waitForTimeout(3000);
    const sample = await page.evaluate(() => new Promise(resolve => {
      const before = { ...window.__sceneDrawProbe };
      const gaps = [];
      let start;
      let previous;
      const tick = time => {
        start ??= time;
        if (previous !== undefined) gaps.push(time - previous);
        previous = time;
        if (time - start < 3000) { requestAnimationFrame(tick); return; }
        gaps.sort((a, b) => a - b);
        const probe = window.__sceneDrawProbe;
        resolve({
          frames: gaps.length,
          medianMs: gaps[Math.floor(gaps.length * 0.5)],
          p95Ms: gaps[Math.floor(gaps.length * 0.95)],
          drawsPerFrame: (probe.draws - before.draws) / gaps.length,
          instancedPerFrame: (probe.instanced - before.instanced) / gaps.length,
          framebufferBindsPerFrame: (probe.framebuffers - before.framebuffers) / gaps.length,
          tier: document.querySelector('[data-testid="scene-player"]')?.getAttribute('data-device-tier'),
          actors: document.querySelector('[data-testid="scene-player"]')?.getAttribute('data-active-actors'),
        });
      };
      requestAnimationFrame(tick);
    }));
    windows.push({ rate, ...sample });
  }
  await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await context.close();
  // Beat 4 has no emitters or moving actors under reduced motion.
  // Fix the grain seed for a reproducible colour/alpha comparison.
  const stillContext = await browser.newContext({ reducedMotion: 'reduce' });
  await stillContext.addInitScript(() => {
    Math.random = () => 0.5;
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 2 });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 2 });
  });
  for (const width of [1280, 390]) {
    const stillPage = await stillContext.newPage();
    stillPage.on('pageerror', error => errors.push(error.message));
    await stillPage.setViewportSize({ width, height: 844 });
    await stillPage.goto(`${base}/scene/gallia`);
    await stillPage.waitForFunction(() => document.querySelector('[data-testid="scene-player"]')?.getAttribute('data-engine-ready') === 'true');
    await stillPage.getByRole('tab', { name: /^Go to beat 4:/ }).click();
    await stillPage.waitForTimeout(1000);
    await stillPage.screenshot({ path: `${directory}/mandubii-${width}.png`, fullPage: true });
    await stillPage.close();
  }
  const report = {
    recordedAt: new Date().toISOString(),
    environment: 'Instrumented headless desktop Chrome; local production; not mobile GPU timing',
    baseURL: base,
    windows,
    errors,
  };
  writeFileSync(`${directory}/${stillsOnly ? 'stills' : 'report'}.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
