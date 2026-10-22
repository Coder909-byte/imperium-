// Production measurement, matching CLAUDE.md: real gzip HTTP transfers,
// navigation-relative User Timing marks, CDP CPU throttle + rAF sampling.
// Usage: npm run build; npm run start -- --port 3001
//        node scripts/measure-scene.mjs http://localhost:3001
// Desktop CPU throttling is a proxy, never a mobile GPU measurement.
import http from 'node:http';
import https from 'node:https';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const base = process.argv[2] ?? 'http://localhost:3001';
function transfer(path) {
  const url = new URL(path, base);
  return new Promise((resolve, reject) => {
    const transport = url.protocol === 'https:' ? https : http;
    transport.get(url, { headers: { 'Accept-Encoding': 'gzip' } }, (response) => {
      if (response.statusCode !== 200) { response.resume(); reject(new Error(`${url.pathname}: ${response.statusCode}`)); return; }
      const buffers = [];
      response.on('data', (buffer) => buffers.push(buffer));
      response.on('end', () => resolve({ bytes: Buffer.concat(buffers).length, encoding: response.headers['content-encoding'] ?? 'identity' }));
    }).on('error', reject);
  });
}
const bundles = {};
for (const route of ['/atlas', '/scene/gallia']) {
  const html = await (await fetch(new URL(route, base))).text();
  const scripts = [...html.matchAll(/<script\b[^>]*>/g)].map((match) => match[0]).filter((tag) => !/noModule/i.test(tag)).flatMap((tag) => {
    const src = tag.match(/src="([^"]+)"/);
    return src ? [src[1].replaceAll('&amp;', '&')] : [];
  });
  const chunks = await Promise.all([...new Set(scripts)].map(async (src) => ({ src, ...await transfer(src) })));
  bundles[route] = { bytes: chunks.reduce((total, chunk) => total + chunk.bytes, 0), chunks };
}
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();
const client = await context.newCDPSession(page);
const loads = [];
const frames = [];
try {
  for (const rate of [1, 1, 1, 4, 6]) {
    await client.send('Emulation.setCPUThrottlingRate', { rate });
    await page.goto(new URL('/scene/gallia', base).href);
    await page.waitForFunction(() => performance.getEntriesByName('imperium:scene-first-frame').length > 0);
    loads.push({ rate, ...await page.evaluate(() => {
      const mark = (name) => performance.getEntriesByName(name).at(-1)?.startTime;
      return { firstFrameMs: mark('imperium:scene-first-frame'), pixiInitMs: mark('imperium:pixi-init-end') - mark('imperium:pixi-init-start'), sceneGraphMs: mark('imperium:scene-graph-built') - mark('imperium:pixi-init-end') };
    }) });
  }
  for (const rate of [1, 4, 6]) {
    await client.send('Emulation.setCPUThrottlingRate', { rate });
    await page.getByRole('tab', { name: /Go to beat 5:/ }).click();
    const samples = await page.evaluate(() => new Promise((resolve) => {
      const gaps = [];
      let previous;
      let start;
      function tick(time) {
        start ??= time;
        if (previous !== undefined) gaps.push(time - previous);
        previous = time;
        if (time - start >= 3000) resolve(gaps);
        else requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }));
    samples.sort((a, b) => a - b);
    const percentile = (p) => samples[Math.min(samples.length - 1, Math.floor(samples.length * p))];
    frames.push({ rate, beat: 'two-battles', tier: await page.getByTestId('scene-player').getAttribute('data-device-tier'), count: samples.length, medianMs: percentile(0.5), p95Ms: percentile(0.95), maxMs: samples.at(-1) });
  }
  const report = { recordedAt: new Date().toISOString(), environment: 'Desktop Chrome; CPU throttle proxy, not mobile GPU', userAgent: await page.evaluate(() => navigator.userAgent), art: 'All Gallia planes and actors are procedural placeholders; no approved audio', bundles, loads, frames };
  mkdirSync('test-results', { recursive: true });
  writeFileSync('test-results/m8-performance.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
