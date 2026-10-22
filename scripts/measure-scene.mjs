// Production measurement, matching CLAUDE.md: real gzip HTTP transfers,
// document/SPA-relative User Timing marks, CDP CPU throttle + rAF sampling.
// Usage: npm run build; npm run start -- --port 3000
//        node scripts/measure-scene.mjs http://localhost:3000
// Desktop CPU throttling is a proxy, never a mobile GPU measurement.
import http from 'node:http';
import https from 'node:https';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const base = process.argv[2] ?? 'http://localhost:3000';
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
const contextOptions = { viewport: { width: 1280, height: 800 }, reducedMotion: 'no-preference' };
const context = await browser.newContext(contextOptions);
const page = await context.newPage();
const client = await context.newCDPSession(page);
const loads = [];
const atlasEntries = [];
const frames = [];

async function readSceneTiming(target) {
  return target.evaluate(() => {
    const mark = (name) => {
      const entry = performance.getEntriesByName(name).at(-1);
      if (!entry) throw new Error(`Missing required timing mark: ${name}`);
      return entry.startTime;
    };
    const graph = mark('imperium:scene-graph-built');
    const presented = mark('imperium:scene-presented');
    return {
      timeOrigin: performance.timeOrigin,
      navigationToPreRenderTickerMs: mark('imperium:scene-first-frame'),
      navigationToScenePresentedMs: presented,
      pixiInitMs: mark('imperium:pixi-init-end') - mark('imperium:pixi-init-start'),
      sceneGraphMs: graph - mark('imperium:pixi-init-end'),
      graphToScenePresentedMs: presented - graph,
      naturalTier: document.querySelector('[data-testid="scene-player"]')?.getAttribute('data-device-tier'),
    };
  });
}

mkdirSync('test-results', { recursive: true });
try {
  for (const rate of [1, 1, 1, 4, 6]) {
    await client.send('Emulation.setCPUThrottlingRate', { rate });
    await page.goto(new URL('/scene/gallia', base).href);
    await page.waitForFunction(() => performance.getEntriesByName('imperium:scene-presented').length > 0);
    loads.push({ rate, ...await readSceneTiming(page) });
    if (loads.length === 1) {
      await page.screenshot({ path: 'test-results/gallia-camera-start.png', fullPage: true });
      await page.waitForTimeout(20000);
      await page.screenshot({ path: 'test-results/gallia-camera-20s.png', fullPage: true });
    }
  }

  for (const rate of [1, 1, 1, 4, 6]) {
    // Each entry starts with a fresh cache/profile; the atlas itself may
    // prefetch normally. Do not prewarm Gallia with a direct scene visit.
    const entryContext = await browser.newContext(contextOptions);
    try {
      const entryPage = await entryContext.newPage();
      const entryClient = await entryContext.newCDPSession(entryPage);
      await entryClient.send('Emulation.setCPUThrottlingRate', { rate });
      await entryPage.goto(new URL('/atlas', base).href);
      const preview = entryPage.getByRole('button', { name: 'Open Gallia scene preview — 52 BC', exact: true });
      await preview.waitFor();
      await entryPage.waitForFunction(() => document.querySelector('[data-testid="cloud-sweep"]')?.getAttribute('data-active') === 'false');
      await preview.evaluate((button) => {
        const prefix = 'imperium:measurement-';
        const stampOnce = (suffix) => {
          const name = `${prefix}${suffix}`;
          if (!performance.getEntriesByName(name).length) performance.mark(name);
        };
        // Capture precedes the existing React click handler. The marks
        // survive Next's SPA navigation on the atlas document's clock.
        button.addEventListener('click', () => {
          performance.mark(`${prefix}atlas-gallia-click`);
          let sawActiveCloud = false;
          const observer = new MutationObserver(() => {
            const player = document.querySelector('[data-testid="scene-player"]');
            if (location.pathname === '/scene/gallia') stampOnce('scene-route-dom-observed');
            if (player?.getAttribute('data-engine-ready') === 'true') stampOnce('engine-ready-dom-observed');
            const active = document.querySelector('[data-testid="cloud-sweep"]')?.getAttribute('data-active');
            if (active === 'true') {
              sawActiveCloud = true;
              stampOnce('cloud-active-dom-observed');
            } else if (sawActiveCloud && active === 'false') {
              stampOnce('cloud-end-dom-observed');
              observer.disconnect();
            }
          });
          observer.observe(document.documentElement, { attributes: true, childList: true, subtree: true });
        }, { capture: true, once: true });
      });
      await preview.click();
      await entryPage.waitForURL('**/scene/gallia');
      await entryPage.waitForFunction(() => performance.getEntriesByName('imperium:scene-presented').length > 0);
      await entryPage.waitForFunction(() => performance.getEntriesByName('imperium:measurement-cloud-end-dom-observed').length > 0);
      const scene = await readSceneTiming(entryPage);
      const entry = await entryPage.evaluate(() => {
        const mark = (name) => performance.getEntriesByName(name).at(-1)?.startTime ?? null;
        const clicked = mark('imperium:measurement-atlas-gallia-click');
        if (clicked === null) throw new Error('Atlas click timing mark was lost during navigation');
        const sinceClick = (name) => {
          const end = mark(name);
          return end === null ? null : end - clicked;
        };
        const cloudEnd = mark('imperium:measurement-cloud-end-dom-observed');
        const presented = mark('imperium:scene-presented');
        return {
          clickAtDocumentMs: clicked,
          clickToPreRenderTickerMs: sinceClick('imperium:scene-first-frame'),
          clickToScenePresentedMs: sinceClick('imperium:scene-presented'),
          clickToSceneRouteDOMObservedMs: sinceClick('imperium:measurement-scene-route-dom-observed'),
          clickToEngineReadyDOMObservedMs: sinceClick('imperium:measurement-engine-ready-dom-observed'),
          clickToCloudActiveDOMObservedMs: sinceClick('imperium:measurement-cloud-active-dom-observed'),
          clickToCloudEndDOMObservedMs: sinceClick('imperium:measurement-cloud-end-dom-observed'),
          cloudEndMinusScenePresentedMs: cloudEnd === null || presented === null ? null : cloudEnd - presented,
        };
      });
      atlasEntries.push({ rate, cache: 'Fresh browser context; normal atlas prefetch permitted', ...scene, ...entry });
    } finally { await entryContext.close(); }
  }

  for (const rate of [1, 4, 6]) {
    await client.send('Emulation.setCPUThrottlingRate', { rate });
    await page.goto(new URL('/scene/gallia', base).href);
    await page.waitForFunction(() => performance.getEntriesByName('imperium:scene-presented').length > 0);
    await page.getByRole('tab', { name: /Go to beat 5:/ }).click();
    await page.waitForTimeout(3000);
    const tierBeforeWindow = await page.getByTestId('scene-player').getAttribute('data-device-tier');
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
    frames.push({ rate, beat: 'two-battles', tierBeforeWindow, tierAfterWindow: await page.getByTestId('scene-player').getAttribute('data-device-tier'), count: samples.length, medianMs: percentile(0.5), p95Ms: percentile(0.95), maxMs: samples.at(-1) });
  }
  const report = {
    recordedAt: new Date().toISOString(),
    baseURL: base,
    environment: 'Headless desktop Chrome; local production HTTP; CDP CPU throttling is a desktop proxy, not a mobile GPU or 4G test',
    viewport: contextOptions.viewport,
    reducedMotion: contextOptions.reducedMotion,
    userAgent: await page.evaluate(() => navigator.userAgent),
    art: 'Approved AI-assisted atmospheric sky and ground plus synthesized wind; remaining historical planes, character rigs and crowds are procedural previews',
    definitions: {
      bundles: 'Real HTTP response-body bytes with Accept-Encoding: gzip for the exact served script src tags, deduplicated and excluding noModule. Lazy scene/audio chunks are excluded unless present in those tags.',
      loads: 'Fresh Gallia document navigation time origin to each mark. One context is reused across direct loads, so later samples may use warm caches.',
      atlasEntries: 'Capture-phase trusted preview-button click to each mark on the same atlas document performance clock, with the normal cloud sweep and no reduced motion. Each sample has a fresh browser context; atlas boot time is outside this interval.',
      preRenderTicker: 'imperium:scene-first-frame is the legacy ticker callback before rendering; it is neither visible scene presentation nor interactive readiness.',
      scenePresented: 'imperium:scene-presented runs in Pixi postrender after the first visible beat composition: render-command submission, not GPU completion, display scanout, or the historic first-beat-interactive metric.',
      observedDOM: 'MutationObserver timestamps follow React DOM changes: scene-route observation, data-engine-ready, and cloud data-active. They are observations, not internal router/cloud readiness marks. A negative cloudEndMinusScenePresentedMs means clouds ended before the scene render submission.',
      frames: 'Three-second requestAnimationFrame timestamp-gap window on beat 5 after a three-second lead-in following its selection. Includes display scheduling and missed frames; not isolated CPU/GPU render duration. Tier is natural, never forced, and recorded before/after each window.',
      audio: 'No scene-local activation gesture is sent during load timing; approved audio may remain gated. This does not measure a finished audible mix.',
      comparison: 'Do not compare the new scene-presented or Atlas-click intervals to older pre-render ticker/first-beat-interactive claims as equivalent endpoints. A 16.7ms rAF median does not pass a strict less-than-16ms mobile render budget.',
    },
    bundles,
    loads,
    atlasEntries,
    frames,
  };
  mkdirSync('test-results', { recursive: true });
  writeFileSync('test-results/m8-performance.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
