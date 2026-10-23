import { test, expect } from "@playwright/test";

for (const width of [320, 390, 768, 1440]) {
  test(`atlas controls fit at ${width}px and zoom the scrollable map`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
    await page.goto("/atlas");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("The Roman world.");
    const viewport = page.getByRole("region", { name: /^Map viewport/ });
    const measure = () => viewport.evaluate(el => ({
      width: el.clientWidth, content: el.scrollWidth,
      centre: (el.scrollLeft + el.clientWidth / 2) / el.scrollWidth,
    }));
    await expect.poll(async () => (await measure()).centre).toBeCloseTo(.5, 2);
    const before = await measure();
    await expect(page.getByRole("button", { name: "Zoom out", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "Zoom in", exact: true }).click();
    await expect(page.getByRole("button", { name: "Reset map zoom" })).toHaveText("125%");
    await expect.poll(async () => (await measure()).content / before.content).toBeCloseTo(1.25, 2);
    await expect.poll(async () => Math.abs((await measure()).centre - before.centre)).toBeLessThan(.01);
    await page.getByRole("button", { name: "Reset map zoom" }).click();
    await expect.poll(async () => (await measure()).content).toBe(before.content);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const era of ["200 BC", "117 AD", "486 AD"]) {
      const card = page.getByRole("button", { name: `Switch main map to ${era}`, exact: true });
      const bounds = await card.boundingBox();
      expect(bounds?.width).toBeGreaterThanOrEqual(44);
      expect(bounds?.height).toBeGreaterThanOrEqual(44);
    }
    await page.getByRole("button", { name: "Switch main map to 117 AD", exact: true }).click();
    await expect(page.locator('path[role="button"][data-region-id]')).toHaveCount(23);
    await expect(page.getByRole("button", { name: /Open Gallia scene preview/ })).toBeVisible();
  });
}

test("map can be panned with the keyboard, with bounded zoom and a centred reset", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/atlas");
  const viewport = page.getByRole("region", { name: /^Map viewport/ });
  await viewport.focus();
  const initial = await viewport.evaluate(el => el.scrollLeft);
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => viewport.evaluate(el => el.scrollLeft)).toBeGreaterThan(initial);
  const zoomIn = page.getByRole("button", { name: "Zoom in", exact: true });
  for (let i = 0; i < 4; i++) await zoomIn.click();
  await expect(zoomIn).toBeDisabled();
  await expect(page.getByRole("button", { name: "Reset map zoom" })).toHaveText("200%");
  await page.getByRole("button", { name: "Reset map zoom" }).click();
  await expect.poll(() => viewport.evaluate(el => Math.abs(el.scrollLeft - (el.scrollWidth - el.clientWidth) / 2))).toBeLessThan(2);
});
