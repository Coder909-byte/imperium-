import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

// M4 — scene engine core. content/regions/placeholder.json (5 beats,
// varying camera moves/visibleLayers/body lengths) exercises the
// engine end to end; gallia.json (1 beat, real Alesia content) is left
// alone for e2e/transition.spec.ts's exit-button test.

test.describe("scene player — beat playback", () => {
  test("plays through beats with correct captions, camera-move framing, and pip state", async ({ page }) => {
    await page.goto("/scene/placeholder");
    const player = page.getByTestId("scene-player");
    await expect(player).toBeVisible();

    await expect(page.getByText("Day 1", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "The engine boots for the first time" })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Go to beat 1:/ })).toHaveAttribute("aria-current", "true");

    await page.getByRole("button", { name: "Next beat" }).click();
    await expect(page.getByText("Day 2", { exact: true })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Go to beat 2:/ })).toHaveAttribute("aria-current", "true");
    await expect(page.getByRole("tab", { name: /Go to beat 1:/ })).toHaveAttribute("aria-current", "false");

    // Jump straight to the last beat via its pip.
    await page.getByRole("tab", { name: /Go to beat 5:/ }).click();
    await expect(page.getByText("Day 5", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Next beat" })).toBeDisabled();

    await page.getByRole("button", { name: "Previous beat" }).click();
    await expect(page.getByText("Day 4", { exact: true })).toBeVisible();
  });

  test("the caption block is a live region so beat changes are announced, and prev is disabled at beat 1", async ({ page }) => {
    await page.goto("/scene/placeholder");
    await expect(page.getByRole("button", { name: "Previous beat" })).toBeDisabled();
    const live = page.locator('[aria-live="polite"]');
    await expect(live).toContainText("The engine boots for the first time");
    await page.getByRole("button", { name: "Next beat" }).click();
    await expect(live).toContainText("The hills come into view");
  });

  test("autoplay advances on its own", async ({ page }) => {
    await page.goto("/scene/placeholder");
    // Beat 4 ("foreground-close") has the shortest body in this region —
    // real dwell math (dwell.test.ts covers the formula precisely with
    // fake timers) puts it at ~12.8s, not the 7s floor: every beat here
    // is substantive prose, none actually floors. This just needs the
    // real end-to-end wiring to fire once, so the timeout is that beat's
    // real dwell plus a generous margin, not a tight bound.
    await page.getByRole("tab", { name: /Go to beat 4:/ }).click();
    await page.getByRole("button", { name: "▶ Autoplay" }).click();
    await expect(page.getByRole("button", { name: "⏸ Autoplay" })).toBeVisible();

    await expect(page.getByText("Day 5", { exact: true })).toBeVisible({ timeout: 17000 });
  });
});

test.describe("scene player — keyboard navigation", () => {
  test("arrow keys drive beats and Escape exits back to the atlas", async ({ page }) => {
    await page.goto("/atlas");
    await page.goto("/scene/placeholder");
    await expect(page.getByTestId("scene-player")).toBeVisible();

    await page.keyboard.press("ArrowRight");
    await expect(page.getByText("Day 2", { exact: true })).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByText("Day 3", { exact: true })).toBeVisible();
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByText("Day 2", { exact: true })).toBeVisible();

    const overlay = page.getByTestId("cloud-sweep");
    await page.keyboard.press("Escape");
    await expect(overlay).toHaveAttribute("data-active", "true");
    await page.waitForURL("**/atlas");
    await expect(overlay).toHaveAttribute("data-active", "false", { timeout: 3000 });
  });
});

test.describe("scene player — reduced motion", () => {
  test("content stays fully available with no cloud shapes or parallax wiring needed to read it", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/scene/placeholder");

    await expect(page.getByTestId("scene-player")).toBeVisible();
    await expect(page.getByRole("heading", { name: "The engine boots for the first time" })).toBeVisible();
    // Every control still present and operable under reduced motion.
    await page.getByRole("button", { name: "Next beat" }).click();
    await expect(page.getByText("Day 2", { exact: true })).toBeVisible();
  });
});

test.describe("scene player — unauthored region fallback", () => {
  test("a region with no content/regions/{id}.json keeps the M1 stub, not a crash", async ({ page }) => {
    await page.goto("/scene/latium");
    await expect(page.locator("h1")).toHaveText("Latium");
    await expect(page.getByText("No scene has been written for this region yet.")).toBeVisible();
    await expect(page.getByTestId("scene-player")).toHaveCount(0);
  });
});

test.describe("/dev/scene-lab", () => {
  const TEMP_REGION_ID = "e2e-scene-lab-temp"; // must match loadContent.ts's VALID_ID (lowercase/digits/hyphens only)
  const tempPath = join(process.cwd(), "content", "regions", `${TEMP_REGION_ID}.json`);

  function writeTempRegion(headline: string) {
    writeFileSync(
      tempPath,
      JSON.stringify({
        id: TEMP_REGION_ID,
        name: "Temp",
        latinName: "Temp",
        civilisation: "Test",
        mapCentroid: [0, 0],
        heldFrom: 0,
        heldTo: null,
        scene: { lut: "none", ambientBed: "none", planes: [{ id: "a", asset: "a.webp", depth: 0.5, tint: "#ffffff", blur: 0 }] },
        beats: [
          {
            id: "only",
            year: "1",
            sortYear: 1,
            headline,
            body: "x".repeat(190),
            visibleLayers: ["a"],
            camera: { x: 0, y: 0, scale: 1, durationMs: 1000, ease: "power2.inOut" },
          },
        ],
      }),
    );
  }

  test.afterEach(() => {
    if (existsSync(tempPath)) unlinkSync(tempPath);
  });

  test("loads a region and hot-reloads it after an on-disk edit, with no page navigation", async ({ page }) => {
    writeTempRegion("Original headline");
    await page.goto("/dev/scene-lab");

    await page.getByRole("combobox").selectOption(TEMP_REGION_ID);
    await expect(page.getByRole("heading", { name: "Original headline" })).toBeVisible();

    writeTempRegion("Edited after save");
    // Polling is on a 1s interval — comfortably longer than one tick,
    // short of anything a human would read as "had to reload the page".
    await expect(page.getByRole("heading", { name: "Edited after save" })).toBeVisible({ timeout: 4000 });
    expect(page.url()).toContain("/dev/scene-lab"); // same page, no navigation
  });

  test("is not built in production", async () => {
    // Documents the guard in app/dev/scene-lab/page.tsx (notFound() when
    // NODE_ENV === "production") — verified by reading the source rather
    // than a second production server here, since this suite otherwise
    // runs entirely against `next dev`.
    const source = readFileSync(join(process.cwd(), "app", "dev", "scene-lab", "page.tsx"), "utf-8");
    expect(source).toContain('process.env.NODE_ENV === "production"');
    expect(source).toContain("notFound()");
  });
});

test.describe("scene player — WebGL lifecycle", () => {
  test("ten atlas<->scene round trips leave exactly one non-lost WebGL context and no runaway heap growth", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "performance.memory and this test's console-warning signature are Chromium-only");
    test.setTimeout(180_000);

    const client = await page.context().newCDPSession(page);
    const contextWarnings: string[] = [];
    page.on("console", (msg) => {
      if (/too many active webgl contexts/i.test(msg.text())) contextWarnings.push(msg.text());
    });

    async function forceGCAndReadHeap(): Promise<number> {
      await client.send("HeapProfiler.collectGarbage");
      await client.send("HeapProfiler.collectGarbage"); // a single pass reliably leaves floating garbage from the just-finished navigation
      return page.evaluate(() => (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? -1);
    }

    // Direct navigation, not the atlas click->sweep flow: the cloud sweep
    // itself is M3's concern (already verified there). What this test
    // needs is real repeated mount/unmount of SceneRenderer's actual
    // Pixi Application against gallia.json's real content — App Router
    // navigation unmounts/remounts the page component tree the same way
    // either the sweep or a plain link would.
    let heapAtTrip1 = -1;
    for (let trip = 1; trip <= 10; trip++) {
      await page.goto("/scene/gallia");
      await expect(page.getByTestId("scene-player")).toBeVisible();
      await expect(page.locator("canvas")).toHaveCount(1);
      await page.goto("/atlas");
      await expect(page.locator("canvas")).toHaveCount(0);

      if (trip === 1) heapAtTrip1 = await forceGCAndReadHeap();
    }
    const heapAtTrip10 = await forceGCAndReadHeap();

    expect(contextWarnings, `console warnings: ${JSON.stringify(contextWarnings)}`).toHaveLength(0);

    // The one canvas left after the final round trip (there is none —
    // we just navigated back to /atlas) is checked per-trip above
    // instead of once at the end, since a context surviving *mid-loop*
    // undetected would still be the bug this test exists to catch.

    console.log(`heap after trip 1 (post-GC): ${heapAtTrip1} bytes`);
    console.log(`heap after trip 10 (post-GC): ${heapAtTrip10} bytes`);
    if (heapAtTrip1 > 0 && heapAtTrip10 > 0) {
      const growth = heapAtTrip10 - heapAtTrip1;
      console.log(`heap growth over 9 further round trips: ${growth} bytes`);
      // Generous on purpose: post-GC heap still carries real noise
      // (Next's router cache, fonts, GC nondeterminism) unrelated to
      // whether Pixi itself leaked. This is a coarse "didn't run away"
      // check, not a precise leak-detector — see CLAUDE.md's M4 entry
      // for the honest per-trip numbers this was calibrated against.
      expect(growth).toBeLessThan(10_000_000);
    }
  });
});
