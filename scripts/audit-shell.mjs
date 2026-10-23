// Read-only Chrome audit. Optional axe path points to a temporary, unshipped tool.
// node scripts/audit-shell.mjs http://localhost:3004 /tmp/shell-review /tmp/axe.min.js
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import sharp from 'sharp';

const [base = 'http://localhost:3000', output = '/tmp/imperium-shell-final', axePath, scope = 'all'] = process.argv.slice(2);
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = [];
const luminance = (rgb) => rgb.map(v => { const s = v / 255; return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);

async function contrast(page) {
  const text = await page.evaluate(() => {
    const nodes = [];
    const walker = document.createTreeWalker(document.querySelector('.atlas-shell'), NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const parent = node.parentElement;
      if (!node.textContent.trim() || !parent || parent.closest('[aria-hidden="true"], .sr-only, .shell-skip, script, style')) continue;
      const style = getComputedStyle(parent);
      if (style.visibility !== 'visible' || style.display === 'none') continue;
      const color = style.color.match(/[\d.]+/g).map(Number);
      const range = document.createRange(); range.selectNodeContents(node);
      for (const r of range.getClientRects()) {
        if (r.width < 3 || r.height < 3 || r.x < 0 || r.y < 0) continue;
        nodes.push({ text: node.textContent.trim().slice(0, 70), color, size: parseFloat(style.fontSize), weight: parseInt(style.fontWeight), rect: { x: r.x, y: r.y + scrollY, width: r.width, height: r.height } });
      }
    }
    return nodes;
  });
  // Preserve the real painting, gradients and texture; hide only glyphs to sample
  // the actual background behind every rendered text line, including image copy.
  const hiding = await page.addStyleTag({ content: '.atlas-shell, .atlas-shell * {color:transparent!important;text-shadow:none!important;transition:none!important} .atlas-shell input::placeholder {color:transparent!important}' });
  const buffer = await page.screenshot({ fullPage: true });
  await hiding.evaluate(el => el.remove());
  const { data, info } = await sharp(buffer).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const results = text.map(line => {
    const foreground = luminance(line.color.slice(0, 3));
    let minimum = Infinity;
    const { x, y, width, height } = line.rect;
    for (let py = Math.max(0, Math.floor(y)); py < Math.min(info.height, Math.ceil(y + height)); py++) {
      for (let px = Math.max(0, Math.floor(x)); px < Math.min(info.width, Math.ceil(x + width)); px++) {
        const index = (py * info.width + px) * 3;
        const background = luminance([...data.subarray(index, index + 3)]);
        const ratio = (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05);
        minimum = Math.min(minimum, ratio);
      }
    }
    const required = line.size >= 24 || (line.size >= 18.667 && line.weight >= 700) ? 3 : 4.5;
    return { text: line.text, ratio: Number(minimum.toFixed(2)), required };
  });
  return { method: 'WCAG relative luminance against every background pixel in each DOM text-line rectangle, glyphs hidden without changing layout/background; conservative rectangle sampling, default opaque text state', checkedLines: results.length, failures: results.filter(r => r.ratio < r.required), minimum: Math.min(...results.map(r => r.ratio)) };
}

for (const width of [1440, 390]) {
  const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 1000 }, reducedMotion: width === 390 ? 'reduce' : 'no-preference' });
  const errors = []; const failures = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) failures.push({ url: response.url(), status: response.status() }); });
  for (const [path, name] of (scope === 'profile' ? [['/dev/shell', 'profile-preview']] : [['/', 'landing'], ['/login', 'login'], ['/signup', 'signup']])) {
    await page.goto(`${base}${path}`); await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => Array.from(document.images).every(img => img.complete && img.naturalWidth > 0));
    await page.addStyleTag({ content: 'nextjs-portal { display:none!important }' });
    await page.screenshot({ path: `${output}/${name}-${width}.png`, fullPage: true });
    const metrics = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth, canvases: document.querySelectorAll('canvas').length, images: [...document.images].map(i => ({ src: i.currentSrc, width: i.naturalWidth, height: i.naturalHeight })), fonts: [...document.fonts].map(f => ({ family: f.family, status: f.status })) }));
    const contrastResult = await contrast(page);
    let axe;
    if (axePath) {
      await page.addScriptTag({ path: axePath });
      axe = await page.evaluate(async () => {
        const r = await window.axe.run(document.querySelector('.atlas-shell'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
        return { violations: r.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })), incomplete: r.incomplete.map(v => ({ id: v.id, nodeCount: v.nodes.length })) };
      });
    }
    const item = { width, path, ...metrics, contrast: contrastResult, axe, errors: [...errors], failedResponses: [...failures] };
    report.push(item); console.log(JSON.stringify({ width, path, overflow: metrics.overflow, contrast: contrastResult, axe }));
  }
  // Error-state screenshot uses a mocked rejection, never a live auth POST.
  await page.goto(`${base}/login`);
  await page.route('**/api/auth/sign-in/email', route => route.fulfill({ status: 401, json: { code: 'SYNTHETIC_REJECTION', message: 'Check your email and password, then try again.' } }));
  await page.getByLabel('Email', { exact: true }).fill('reader@example.com');
  await page.getByLabel('Password', { exact: true }).fill('SyntheticPassword23');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await page.locator('#auth-error').waitFor();
  await page.screenshot({ path: `${output}/login-error-${width}.png`, fullPage: true });
  await page.close();
}
await browser.close();
await fs.writeFile(`${output}/report.json`, JSON.stringify({ base, environment: { node: process.version, platform: process.platform, arch: process.arch, browser: 'system Google Chrome, headless; desktop host, not physical mobile' }, pages: report }, null, 2));
if (report.some(r => r.overflow || r.errors.length || r.failedResponses.length || r.axe?.violations.length || r.contrast.failures.length)) process.exitCode = 1;
