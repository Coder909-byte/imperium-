import { test, expect } from "@playwright/test";

// M3 — cloud transition (CloudSweep.tsx). The overlay is always in the
// DOM (mounted once in the root layout, see app/layout.tsx) — idle at
// data-active="false", covering the viewport at data-active="true".

test.describe("cloud transition", () => {
  test("clicking a province sweeps to its scene, with no visible page seam", async ({ page }) => {
    await page.goto("/atlas");

    const overlay = page.getByTestId("cloud-sweep");
    await expect(overlay).toHaveAttribute("data-active", "false");

    await page.locator('path[aria-label="Latium — open scene"]').click();

    // Covers before the route swaps...
    await expect(overlay).toHaveAttribute("data-active", "true");
    // ...lands on the scene...
    await page.waitForURL("**/scene/latium");
    await expect(page.locator("h1")).toHaveText("Latium");
    // ...and reveals it, not stranded mid-sweep.
    await expect(overlay).toHaveAttribute("data-active", "false", { timeout: 3000 });
  });

  test("the back-to-atlas button reverses it", async ({ page }) => {
    await page.goto("/scene/gallia");
    const overlay = page.getByTestId("cloud-sweep");

    await page.getByRole("button", { name: "← Return to the map" }).click();

    await expect(overlay).toHaveAttribute("data-active", "true");
    await page.waitForURL("**/atlas");
    await expect(overlay).toHaveAttribute("data-active", "false", { timeout: 3000 });
  });

  test("prefers-reduced-motion gives a fast cross-fade with no cloud shapes rendered", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/atlas");

    // No cloud masses/puffs in the DOM at all under reduced motion —
    // only the plain crossfade panel.
    await expect(page.locator('[class*="mass"]')).toHaveCount(0);

    await page.locator('path[aria-label="Latium — open scene"]').click();
    // 200ms cross-fade total — comfortably settled well inside the
    // ~1.2s+ the full sweep would still be mid-flight for.
    await page.waitForURL("**/scene/latium", { timeout: 1000 });
    await expect(page.getByTestId("cloud-sweep")).toHaveAttribute("data-active", "false", { timeout: 800 });
  });

  test("rapid double-navigation — browser back mid-sweep — doesn't strand the overlay half-open", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toHaveText("Imperium");
    await page.goto("/atlas");

    const overlay = page.getByTestId("cloud-sweep");
    await page.locator('path[aria-label="Latium — open scene"]').click();

    // Well inside the 820ms in-phase — the forward sweep to /scene/latium
    // is still covering the screen, hasn't reached full occlusion yet.
    await page.waitForTimeout(250);
    await page.goBack();

    // The interrupted forward navigation must never land...
    await expect(page).not.toHaveURL(/\/scene\/latium/);
    // ...back-navigation wins instead...
    await page.waitForURL("/", { timeout: 3000 });
    await expect(page.locator("h1")).toHaveText("Imperium");
    // ...and the overlay resolves itself rather than sitting stuck at
    // full occlusion or mid-transition forever.
    await expect(overlay).toHaveAttribute("data-active", "false", { timeout: 3000 });

    // The page is left genuinely interactive, not covered by a stray
    // pointer-events:auto layer nobody turned off.
    await expect(overlay).toHaveCSS("pointer-events", "none");
  });

  test("no cumulative layout shift from the overlay itself", async ({ page }) => {
    await page.goto("/atlas");

    await page.evaluate(() => {
      (window as unknown as { __clsTotal: number }).__clsTotal = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
          if (!entry.hadRecentInput) {
            (window as unknown as { __clsTotal: number }).__clsTotal += entry.value;
          }
        }
      }).observe({ type: "layout-shift", buffered: true });
    });

    await page.locator('path[aria-label="Latium — open scene"]').click();
    await page.waitForURL("**/scene/latium");
    await page.getByTestId("cloud-sweep").waitFor({ state: "attached" });
    await expect(page.getByTestId("cloud-sweep")).toHaveAttribute("data-active", "false", { timeout: 3000 });

    const cls = await page.evaluate(() => (window as unknown as { __clsTotal: number }).__clsTotal);
    console.log(`CLS across the atlas->scene sweep: ${cls}`);
    // 0.1 is the standard "good" CLS threshold (web.dev/cls). The
    // overlay is position:fixed and never touches document flow, so
    // this is expected to read as exactly 0, not just "under budget".
    expect(cls).toBeLessThan(0.1);
  });
});
