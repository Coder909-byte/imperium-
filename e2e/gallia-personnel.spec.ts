import { expect, test } from "@playwright/test";

declare global {
  interface Window { __paintedCrowds: { sources: string[]; colours: number }[] }
}

test("both armies use coloured rig-derived instanced crowds without repeating texture preparation on beat re-entry", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const loaded = new Set<string>();
  page.on("response", response => { if (/infantry.*\.webp$/.test(response.url()) && response.status() === 200) loaded.add(response.url()); });
  await page.addInitScript(() => {
    window.__paintedCrowds = [];
    const contexts = new WeakMap<HTMLCanvasElement, { sources: string[]; colours: number }>();
    const draw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (this: CanvasRenderingContext2D, source: CanvasImageSource, ...coordinates: number[]) {
      Reflect.apply(draw, this, [source, ...coordinates]);
      if (!(source instanceof HTMLImageElement) || !/infantry.*\.webp$/.test(source.src) || this.canvas.height > 192) return;
      let probe = contexts.get(this.canvas);
      if (!probe) { probe = { sources: [], colours: 0 }; contexts.set(this.canvas, probe); window.__paintedCrowds.push(probe); }
      probe.sources.push(source.src);
      const pixels = this.getImageData(0, 0, this.canvas.width, this.canvas.height).data;
      // A luminance-only matte, white placeholder or tint loss cannot
      // satisfy this chroma count, even if all image requests succeed.
      let colours = 0;
      for (let index = 0; index < pixels.length; index += 4) {
        if (pixels[index + 3] > 128 && Math.max(pixels[index], pixels[index + 1], pixels[index + 2]) - Math.min(pixels[index], pixels[index + 1], pixels[index + 2]) > 20) colours += 1;
      }
      probe.colours = colours;
    };
  });
  await page.goto("/scene/gallia");
  const player = page.getByTestId("scene-player");
  await expect(player).toHaveAttribute("data-engine-ready", "true", { timeout: 30_000 });
  await page.getByRole("tab", { name: /^Go to beat 5:/ }).click();
  await expect(player).toHaveAttribute("data-active-actors", /gaul_warrior:march:20/);
  await expect.poll(() => loaded.size).toBe(18);
  const probes = await page.evaluate(() => window.__paintedCrowds);
  expect(probes).toHaveLength(4); // Roman march + brace, two Gallic marches.
  for (const probe of probes) {
    expect(probe.sources).toHaveLength(24); // Six painted parts × four poses.
    expect(probe.colours).toBeGreaterThan(100);
  }
  await page.getByRole("tab", { name: /^Go to beat 4:/ }).click();
  await page.getByRole("tab", { name: /^Go to beat 5:/ }).click();
  expect(await page.evaluate(() => window.__paintedCrowds)).toEqual(probes);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.screenshot({ path: testInfo.outputPath("two-painted-armies.png"), fullPage: true });
  expect(errors).toEqual([]);
});
