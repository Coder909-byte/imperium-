import { test, expect } from "@playwright/test";

test.describe("atlas", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/atlas");
  });

  test("350 BC shows only Latium held — the near-empty-map edge case", async ({ page }) => {
    await expect(page.getByText("350 BC", { exact: true })).toBeVisible();
    const held = page.locator('path[aria-label$="open scene"]');
    await expect(held).toHaveCount(1);
    await expect(held).toHaveAttribute("aria-label", "Latium — open scene");
  });

  test("clicking an inset swaps it with the main map and updates the era label", async ({ page }) => {
    const mainEraLabel = page.locator("text=350 BC").first();
    await expect(mainEraLabel).toBeVisible();

    const inset117 = page.locator('g[aria-label="Switch main map to 117 AD"]');
    await expect(inset117).toBeVisible();
    await inset117.click();

    // Main map is now 117 AD — held-region count jumps to 23 (all but
    // Latium, absorbed into Italia by 272 BC).
    await expect(page.locator('path[aria-label$="open scene"]')).toHaveCount(23);
    await expect(page.getByText("117 AD", { exact: true }).first()).toBeVisible();

    // 350 BC now lives in the inset that 117 AD vacated.
    await expect(page.locator('g[aria-label="Switch main map to 350 BC"]')).toBeVisible();
  });

  test("hovering a held region raises its opacity and shows a one-line teaser", async ({ page }) => {
    const latium = page.locator('path[aria-label="Latium — open scene"]');
    const opacityBefore = await latium.evaluate((el) => getComputedStyle(el).fillOpacity);

    await latium.hover();
    const opacityAfter = await latium.evaluate((el) => getComputedStyle(el).fillOpacity);
    expect(Number(opacityAfter)).toBeGreaterThan(Number(opacityBefore));

    await expect(page.locator('[aria-live="polite"]')).toContainText("Ager Romanus");
  });

  test("clicking a held region routes to its scene stub", async ({ page }) => {
    await page.locator('path[aria-label="Latium — open scene"]').click();
    await page.waitForURL("**/scene/latium");
    await expect(page.locator("h1")).toHaveText("Latium");
  });

  test("an unheld region has no click affordance", async ({ page }) => {
    // At 350 BC, Gallia isn't held yet (from -50) — it should render but
    // not be interactive.
    const gallia = page.locator('path[aria-label^="Gallia"]');
    await expect(gallia).toHaveCount(0);
  });

  test("parchment texture and hand-inked edges render with no raster assets", async ({ page }) => {
    await expect(page.locator("img")).toHaveCount(0);
    await expect(page.locator("filter#paperGrain")).toHaveCount(1);
    await expect(page.locator("filter#inkEdges feDisplacementMap")).toHaveCount(1);
    await expect(page.locator('g[filter="url(#inkEdges)"]').first()).toBeVisible();
  });
});
