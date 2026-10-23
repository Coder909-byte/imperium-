// Production-only: real gzip HTTP transfers plus cold browser contexts.
// node scripts/measure-shell.mjs http://localhost:3004 /tmp/shell-performance.json
import http from 'node:http';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';

const [base = 'http://localhost:3004', output = '/tmp/imperium-shell-performance.json'] = process.argv.slice(2);
function request(path) {
  return new Promise((resolve, reject) => {
    http.get(new URL(path, base), { headers: { 'Accept-Encoding': 'gzip' } }, response => {
      const chunks = []; response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, bytes: Buffer.concat(chunks) }));
    }).on('error', reject);
  });
}
const { gunzipSync } = await import('node:zlib');
const transfers = [];
for (const route of ['/', '/login', '/signup', '/atlas', '/scene/gallia']) {
  const response = await request(route);
  const html = (response.headers['content-encoding'] === 'gzip' ? gunzipSync(response.bytes) : response.bytes).toString();
  const scripts = [...new Set([...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>/gi)].filter(match => !/nomodule/i.test(match[0])).map(match => match[1]))];
  const files = [];
  for (const src of scripts) {
    const file = await request(src);
    const source = (file.headers['content-encoding'] === 'gzip' ? gunzipSync(file.bytes) : file.bytes).toString();
    files.push({ src, status: file.status, encoding: file.headers['content-encoding'], bytes: file.bytes.length, contentLength: file.headers['content-length'] ?? null, pixiMarker: /PixiJS|HowlerGlobal|kokoro-js/.test(source) });
  }
  transfers.push({ route, initialScriptBytes: files.reduce((sum, file) => sum + file.bytes, 0), files });
}
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const samples = [];
for (const throttled of [false, true]) {
  for (let run = 1; run <= 3; run++) {
    const context = await browser.newContext({ viewport: { width: throttled ? 390 : 1440, height: throttled ? 844 : 1000 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    if (throttled) {
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750, connectionType: 'cellular4g' });
    }
    await page.addInitScript(() => {
      window.__shellPerformance = { lcp: 0, cls: 0, artworkReady: null };
      // Full-viewport paintings may be excluded by Chrome's LCP heuristic.
      // Also track when the actual artwork is decoded and has two paint frames.
      document.addEventListener('DOMContentLoaded', () => {
        const image = document.querySelector('.landing-artwork img, .hero-scene img');
        image?.decode().then(() => requestAnimationFrame(() => requestAnimationFrame(() => {
          window.__shellPerformance.artworkReady = performance.now();
        }))).catch(() => {});
      }, { once: true });
      new PerformanceObserver(list => { const entries = list.getEntries(); window.__shellPerformance.lcp = entries.at(-1).startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver(list => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__shellPerformance.cls += entry.value; }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => [...document.images].every(image => image.complete && image.naturalWidth));
    await page.waitForFunction(() => window.__shellPerformance.artworkReady !== null);
    const metrics = await page.evaluate(() => ({ ...window.__shellPerformance, fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime, domContentLoaded: performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd, resources: performance.getEntriesByType('resource').map(resource => ({ name: new URL(resource.name).pathname, kind: resource.initiatorType, bytes: resource.encodedBodySize, transfer: resource.transferSize })), overflow: document.documentElement.scrollWidth > innerWidth }));
    samples.push({ throttled, run, ...metrics });
    console.log(JSON.stringify({ throttled, run, lcp: metrics.lcp, fcp: metrics.fcp, cls: metrics.cls, artworkReady: metrics.artworkReady }));
    await context.close();
  }
}
const productionGuards = [];
for (const route of ['/dev/shell', '/dev/narration', '/api/dev/narration-sample']) productionGuards.push({ route, status: (await request(route)).status });
const result = { base, measuredAt: new Date().toISOString(), environment: { node: process.version, platform: process.platform, arch: process.arch, chrome: browser.version(), mode: 'next build + next start, local HTTP, headless system Chrome, fresh contexts/cache disabled; server and image optimizer warmed by prior audit', desktop: '1440x1000, DPR 1, unthrottled', mobileEmulation: '390x844, DPR 1, CDP CPU 4x, 150ms latency, download 200000 B/s (1.6Mbps), upload 93750 B/s; desktop simulation, not physical Pixel or Safari', scripts: 'Actual served script tags, deduplicated, noModule excluded; Accept-Encoding gzip, measured compressed HTTP response bodies, Content-Length when present' }, transfers, samples, productionGuards };
await fs.writeFile(output, JSON.stringify(result, null, 2));
await browser.close();
console.log(JSON.stringify({ transfers: transfers.map(({ route, initialScriptBytes }) => ({ route, initialScriptBytes })), productionGuards }));
