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

// M2 — border morphing (MorphBorders.ts).
test.describe("atlas — border morphing", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/atlas");
  });

  test("era switch settles to the target era's held set, with no malformed paths", async ({ page }) => {
    const inset117 = page.locator('g[aria-label="Switch main map to 117 AD"]');
    await inset117.click();

    await expect(page.locator('path[aria-label$="open scene"]')).toHaveCount(23);
    await expect(page.getByText("117 AD", { exact: true }).first()).toBeVisible();

    // Interactivity (aria-label, click affordance) updates instantly —
    // it's the *visual* fill-opacity that's still mid-transition right
    // after click. Give it up to ~1.2s (900ms tween + stagger spread)
    // to settle on Gallia, a province gained by this switch.
    const gallia = page.locator('path[aria-label="Gallia — open scene"]');
    await expect(gallia).toHaveCSS("fill-opacity", "0.55", { timeout: 1200 });

    // No path anywhere on the map should carry a corrupted `d` once the
    // transition (including MorphSVG's point-count equalization on
    // retained provinces) has run.
    const dValues = await page.locator("path").evaluateAll((els) => els.map((el) => el.getAttribute("d")));
    for (const d of dValues) {
      expect(d, `malformed path data: ${d}`).not.toBeNull();
      expect(d).not.toContain("NaN");
      expect(d?.trim().startsWith("M")).toBe(true);
    }
  });

  test("rapid era switching leaves no stuck or half-rendered paths", async ({ page }) => {
    const inset117 = page.locator('g[aria-label="Switch main map to 117 AD"]');
    const inset486 = page.locator('g[aria-label="Switch main map to 486 AD"]');

    await inset117.click();
    await inset486.click(); // fired before the first transition's ~900ms would have finished

    // Settles on the *last* click's target, not a queued or blended state.
    await expect(page.getByText("486 AD", { exact: true }).first()).toBeVisible();
    await expect(page.locator('path[aria-label$="open scene"]')).toHaveCount(9);
    await expect(page.locator('path[aria-label="Aegyptus — open scene"]')).toBeVisible();

    const dValues = await page.locator("path").evaluateAll((els) => els.map((el) => el.getAttribute("d")));
    for (const d of dValues) {
      expect(d).not.toBeNull();
      expect(d).not.toContain("NaN");
    }
  });

  test("prefers-reduced-motion settles fast, as a flat cross-fade", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/atlas"); // reload so the reduced-motion state is read at mount

    const inset117 = page.locator('g[aria-label="Switch main map to 117 AD"]');
    await inset117.click();

    // The reduced-motion path is a flat 150ms tween — this settles well
    // inside a window the full ~900ms(+stagger) path would still miss.
    const gallia = page.locator('path[aria-label="Gallia — open scene"]');
    await expect(gallia).toHaveCSS("fill-opacity", "0.55", { timeout: 500 });
  });
});
