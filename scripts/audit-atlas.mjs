// Read-only production captures and accessibility checks; no auth/DB writes.
// node scripts/audit-atlas.mjs http://localhost:3004 /tmp/imperium-atlas
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';

const [base = 'http://localhost:3004', output = '/tmp/imperium-atlas'] = process.argv.slice(2);
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const pages = [];
for (const width of [320, 390, 768, 1440]) {
  const page = await browser.newPage({ viewport: { width, height: width < 768 ? 844 : 1000 }, reducedMotion: 'reduce', colorScheme: 'dark' });
  const errors = [], failedResponses = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) failedResponses.push({ url: response.url(), status: response.status() }); });
  await page.goto(`${base}/atlas`);
  await page.evaluate(async () => {
    await document.fonts.ready;
    const image = new Image();
    image.src = document.querySelector('svg[data-relief="true"] image').href.baseVal;
    await image.decode();
  });
  const viewport = page.getByRole('region', { name: /^Map viewport/ });
  await page.waitForFunction(() => {
    const el = document.querySelector('[role="region"][aria-label^="Map viewport"]');
    return Math.abs(el.scrollLeft - (el.scrollWidth - el.clientWidth) / 2) < 2;
  });
  for (const era of ['350 BC', '117 AD']) {
    if (era === '117 AD') {
      await page.getByRole('button', { name: 'Switch main map to 117 AD', exact: true }).click();
      await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-held-overlay="gallia"]')).opacity === '1');
      await page.evaluate(() => scrollTo(0, 0));
    }
    await page.screenshot({ path: `${output}/atlas-${width}-${era.replace(' ', '-')}.png`, fullPage: true });
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
    const axe = await page.evaluate(async () => {
      const result = await window.axe.run(document.body, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
      return {
        violations: result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })),
        incomplete: result.incomplete.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })),
      };
    });
    const metrics = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      canvases: document.querySelectorAll('canvas').length,
      held: document.querySelectorAll('[data-region-id][role="button"]').length,
      shownProvinceLabels: [...document.querySelectorAll('svg[data-relief="true"] > text')].filter(el => el.hasAttribute('aria-hidden') && getComputedStyle(el).opacity === '1').length,
      relief: [...new Set([...document.querySelectorAll('svg image')].map(image => image.href.baseVal))],
    }));
    const item = { width, era, ...metrics, viewport: await viewport.boundingBox(), axe, errors: [...errors], failedResponses: [...failedResponses] };
    pages.push(item);
    console.log(JSON.stringify({ width, era, overflow: metrics.overflow, held: metrics.held, shownProvinceLabels: metrics.shownProvinceLabels, violations: axe.violations }));
  }
  await page.close();
}
const report = { base, measuredAt: new Date().toISOString(), environment: { node: process.version, platform: process.platform, arch: process.arch, chrome: browser.version(), mode: 'Headless desktop Chrome; responsive dark-preference/reduced-motion captures, not physical mobile or Safari. Axe cannot fully assess SVG/artwork text contrast.' }, pages };
await fs.writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
await browser.close();
if (pages.some(p => p.overflow || p.canvases || p.held !== p.shownProvinceLabels || p.errors.length || p.failedResponses.length || p.axe.violations.length)) process.exitCode = 1;
