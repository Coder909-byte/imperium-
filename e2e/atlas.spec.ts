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
    // Three stacked layers now (see AtlasMap.module.css): .provinceBase
    // (fill:none, contributes nothing to fill, ever), .heldOverlay (the
    // "held" look, constant own fill-opacity, outer opacity toggled by
    // MorphBorders — see the era-switch tests below), and .hoverFill
    // (the hover brighten-up, constant own fill-opacity, outer opacity
    // toggled on :hover). Checking any one path's own fillOpacity no
    // longer proves anything on its own — this computes the actual
    // combined rendered result the same way a viewer's eye would see it.
    const latium = page.locator('path[aria-label="Latium — open scene"]');
    const heldOverlay = page.locator('path[data-held-overlay="latium"]');
    const hoverOverlay = page.locator('path[data-hover-fill="latium"]');

    async function effectiveOpacity(locator: typeof heldOverlay) {
      const [fillOpacity, opacity] = await Promise.all([
        locator.evaluate((el) => Number(getComputedStyle(el).fillOpacity)),
        locator.evaluate((el) => Number(getComputedStyle(el).opacity)),
      ]);
      return fillOpacity * opacity;
    }

    async function combinedFillOpacity() {
      // .provinceBase's own contribution is always 0 (fill:none) — the
      // two overlays alone determine the visible result, stacked via
      // standard alpha "over" compositing for two same-color flat fills.
      const [held, hover] = await Promise.all([effectiveOpacity(heldOverlay), effectiveOpacity(hoverOverlay)]);
      return held + hover * (1 - held);
    }

    const before = await combinedFillOpacity();
    expect(before).toBeCloseTo(0.55, 2);

    await latium.hover();
    await expect(hoverOverlay).toHaveCSS("opacity", "1");
    const after = await combinedFillOpacity();
    expect(after).toBeCloseTo(0.85, 2); // matches the pre-fix single-path fill-opacity:0.85 exactly
    expect(after).toBeGreaterThan(before);

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
    // it's the *visual* held-overlay opacity that's still mid-transition
    // right after click (MorphBorders animates the overlay's outer
    // opacity now, not fill-opacity on the interactive path itself — see
    // AtlasMap.module.css). Give it up to ~1.2s (900ms tween + stagger
    // spread) to settle on Gallia, a province gained by this switch.
    const galliaOverlay = page.locator('path[data-held-overlay="gallia"]');
    // 900ms tween + stagger is ~1.02s uncontended; this suite runs with
    // 2 Playwright workers, and real CPU contention from another
    // worker's test can stretch that — 2500ms is still a small fraction
    // of a human-noticeable delay, and gives real margin either way.
    await expect(galliaOverlay).toHaveCSS("opacity", "1", { timeout: 2500 });
    await expect(galliaOverlay).toHaveCSS("fill-opacity", "0.55"); // constant, never animated

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

    // The reduced-motion path is a flat 150ms tween on the held-overlay's
    // outer opacity — this settles well inside a window the full
    // ~900ms(+stagger) path would still miss.
    const galliaOverlay = page.locator('path[data-held-overlay="gallia"]');
    await expect(galliaOverlay).toHaveCSS("opacity", "1", { timeout: 500 });
  });
});

// A real Chrome trace, not a proxy for one. Hovering a province, and
// separately the era-switch morph, both used to force a repaint of the
// *entire* inkEdges-filtered province group on every tick — confirmed
// via disabled-by-default-devtools.timeline.invalidationTracking and
// each Paint event's own nodeName, which named the repainted node as
// literally `#document`/`<html>`: a paint property (fill-opacity) or a
// geometry change (MorphSVGPlugin's `d`, even to an unchanged value) or
// scale/transform on a child of a filtered <g> all force Blink to
// rasterize the filtered group as one unit. Fixed by keeping every
// province element's own fill/stroke-opacity constant and animating
// only outer opacity (see AtlasMap.module.css's comments) — a handful
// of legitimate one-time reveal paints on *individual* elements remain
// (and scale with province count, not frame count), but none of them
// should ever be scoped to the document root.
//
// Asserting "document/html never paints" rather than a raw Paint count
// is deliberate: this suite runs with 2 Playwright workers, and a raw
// count is sensitive to whatever unrelated work another worker's test
// happens to be doing at the same moment (confirmed: a concurrent
// auth.spec.ts run reproducibly inflated a raw count from 2 to 17,
// with no document-scoped paints in the mix — real noise, not a
// regression). The specific signature the original bug left in the
// trace is a much more precise, load-independent thing to pin down.
function isTraceEventName(value: unknown): value is { name: string; args?: { data?: { nodeName?: string } } } {
  return typeof value === "object" && value !== null && "name" in value && typeof (value as { name: unknown }).name === "string";
}

async function capturePaintsDuring(
  page: import("@playwright/test").Page,
  action: () => Promise<void>,
): Promise<{ name: string; nodeName?: string }[]> {
  const client = await page.context().newCDPSession(page);
  const events: { name: string; nodeName?: string }[] = [];
  client.on("Tracing.dataCollected", (data: { value: unknown[] }) => {
    for (const raw of data.value) {
      if (isTraceEventName(raw)) events.push({ name: raw.name, nodeName: raw.args?.data?.nodeName });
    }
  });
  const tracingComplete = new Promise<void>((resolve) => client.on("Tracing.tracingComplete", () => resolve()));

  await client.send("Tracing.start", {
    categories: ["disabled-by-default-devtools.timeline", "devtools.timeline"].join(","),
    transferMode: "ReportEvents",
  });

  await action();

  await client.send("Tracing.end");
  await tracingComplete;

  return events.filter((e) => e.name === "Paint");
}

function expectNoRepeatedDocumentScopedPaint(paints: { nodeName?: string }[]) {
  const documentScoped = paints.filter((p) => p.nodeName === "#document" || p.nodeName?.startsWith("HTML"));
  // Not zero: a page's very first paint is legitimately #document/HTML-
  // scoped (a clean isolated trace showed 2-4, a couple of one-time
  // layer-creation paints, not one per nodeName). The bug was this
  // repeating on every tick of a ~200ms-900ms transition — 65-130
  // events for a single interaction, not 2-6. 10 gives real margin
  // above the observed clean-trace range for run-to-run variance
  // (including this suite's own 2-worker contention) while staying an
  // order of magnitude below anything the broken per-tick pattern ever
  // produced.
  expect(documentScoped.length, `document/html-scoped Paint events: ${JSON.stringify(documentScoped)}`).toBeLessThanOrEqual(10);
}

test.describe("atlas — hover and morph performance", () => {
  test("hovering a province is compositor-only, not a full-group repaint", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "CDP tracing is Chromium-only");
    await page.goto("/atlas");
    const latium = page.locator('path[aria-label="Latium — open scene"]');
    await latium.waitFor();
    await page.waitForTimeout(300);

    const paints = await capturePaintsDuring(page, async () => {
      await latium.hover();
      await page.waitForTimeout(400); // the full 200ms fill/opacity transition, plus margin
    });

    expectNoRepeatedDocumentScopedPaint(paints);
  });

  test("the era-switch morph is compositor-only across gained, lost, and retained provinces", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "CDP tracing is Chromium-only");
    await page.goto("/atlas");
    // 350 BC -> 117 AD exercises gained (23) and lost (Latium) with zero
    // retained provinces; switch once more, 117 AD -> 486 AD, to also
    // exercise retained (9) + lost (14) — MorphSVGPlugin's `d` tween was
    // its own, separate source of document-scoped paint (todays's
    // content never actually changes shape between eras, see
    // MorphBorders.ts, so provinces whose `d` doesn't change now skip
    // the tween entirely rather than animating a no-op every frame).
    const inset117 = page.locator('g[aria-label="Switch main map to 117 AD"]');
    await inset117.waitFor();
    await inset117.click();
    await page.waitForTimeout(1500); // let the first switch fully settle before tracing the second

    const inset486 = page.locator('g[aria-label="Switch main map to 486 AD"]');
    await inset486.waitFor();

    const paints = await capturePaintsDuring(page, async () => {
      await inset486.click();
      await page.waitForTimeout(1200); // full ~900ms tween + stagger spread, plus margin
    });

    expectNoRepeatedDocumentScopedPaint(paints);
  });
});
