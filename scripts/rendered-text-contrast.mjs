// Reuse the shell audit's conservative rendered-background contrast method.
import sharp from 'sharp';

const luminance = (rgb) => rgb.map(v => { const s = v / 255; return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);

export async function renderedTextContrast(page) {
  const text = await page.evaluate(() => {
    const nodes = [];
    const walker = document.createTreeWalker(document.querySelector('.atlas-shell'), NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const parent = node.parentElement;
      if (!node.textContent.trim() || !parent || parent.closest('[aria-hidden="true"], .sr-only, .shell-skip, script, style, button:disabled')) continue;
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
