import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { Region } from "../content/schema";
import { LOCAL_PROGRESS_KEY } from "../lib/quiz/localProgress";
import { LocalProgress } from "../lib/quiz/contracts";

const italia = Region.parse(JSON.parse(readFileSync("content/regions/italia.json", "utf8")));

test.beforeEach(async ({ page }) => {
  // Preview verification must not write to any database, even with an
  // accidentally inherited login cookie or a shared server configuration.
  await page.route("**/api/progress/**", route => route.fulfill({ json: { saved: false } }));
});

test("Italia is discoverable from the earliest era with its actual episode date", async ({ page }) => {
  await page.goto("/atlas");
  await expect(page.getByRole("button", { name: "Open Gallia scene preview — 52 BC", exact: true })).toBeVisible();
  const preview = page.getByRole("button", { name: "Open Italia scene preview — January 49 BC", exact: true });
  await preview.focus();
  await preview.press("Enter");
  await expect(page).toHaveURL(/\/scene\/italia$/);
  await expect(page.getByRole("note")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: italia.beats[0].headline, exact: true })).toBeVisible();
});

for (const width of [1440, 390]) {
  test(`all six Italia beats and bias/uncertainty notes remain readable at ${width}px`, async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    const errors: string[] = [];
    const assetRequests: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("request", request => { if (request.url().includes("/assets/")) assetRequests.push(request.url()); });
    await page.setViewportSize({ width, height: 1000 });
    if (width === 390) await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/scene/italia");
    await expect(page.getByTestId("scene-player")).toHaveAttribute("data-engine-ready", "true", { timeout: 30_000 });
    for (const [index, beat] of italia.beats.entries()) {
      const pip = page.getByRole("tab", { name: `Go to beat ${index + 1}: ${beat.headline}`, exact: true });
      await pip.click();
      await expect(pip).toHaveAttribute("aria-current", "true");
      await expect(page.getByTestId("scene-player")).toHaveAttribute("data-visible-planes", new RegExp(beat.visibleLayers[0]));
      await expect(page.getByText(beat.body, { exact: true })).toBeVisible();
      await page.locator("details > summary").click();
      for (const source of beat.sources) await expect(page.getByText(source.label, { exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`italia-${width}-beat-${index + 1}-sources.png`), fullPage: true });
    }
    await expect(page.getByRole("button", { name: /Test yourself/ })).toBeVisible();
    await expect(page.getByText("Narration pending", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Audio pending", { exact: true })).toHaveCount(0);
    expect(errors).toEqual([]);
    expect(assetRequests.some(url => url.includes("/assets/italia/"))).toBe(true);
    const saved = await page.evaluate(key => localStorage.getItem(key), LOCAL_PROGRESS_KEY);
    const local = LocalProgress.parse(JSON.parse(saved ?? "null"));
    expect(local.regions).toContainEqual({ regionId: "italia", beatIds: italia.beats.map(beat => beat.id) });
  });
}

test("navigation between campaigns preserves Gallia and offers the authored Italia quiz", async ({ page, request }) => {
  await page.goto("/scene/italia");
  await page.getByRole("tab", { name: /^Go to beat 6:/ }).click();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/atlas$/);
  await page.getByRole("button", { name: "Open Gallia scene preview — 52 BC", exact: true }).click();
  await expect(page.getByRole("heading", { name: "The hill", exact: true })).toBeVisible();
  await expect(page.getByRole("note")).toHaveCount(0);
  await page.getByRole("tab", { name: /^Go to beat 6:/ }).click();
  await expect(page.getByRole("button", { name: "Test yourself on Gaul", exact: true })).toBeVisible();
  await page.goto("/quiz/gallia");
  await expect(page).toHaveTitle("Gallia quiz — Imperium");
  await expect(page.getByText("52 BC · Gallia", { exact: true })).toBeVisible();
  expect((await request.get("/quiz/italia")).status()).toBe(200);
  await page.goto("/scene/italia");
  await expect(page.getByRole("heading", { name: "An order from Rome", exact: true })).toBeVisible();
});
