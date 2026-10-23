import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test, expect } from "@playwright/test";
import { Province } from "../content/schema";

const provinceDir = join(process.cwd(), "content", "borders", "provinces");
const provinces = readdirSync(provinceDir)
  .filter((file) => file.endsWith(".json"))
  .map((file) => Province.parse(JSON.parse(readFileSync(join(provinceDir, file), "utf-8"))));

test("initial atlas exposes Gallia's dated preview without mislabelling unauthored Latium", async ({ page }, testInfo) => {
  await page.goto("/atlas");
  await expect(page.getByRole("group", { name: "Roman Empire, 350 BC", exact: true })).toBeVisible();
  await expect(page.locator('path[aria-label="Latium — coming soon"]')).toBeVisible();
  await expect(page.locator('path[aria-label$="open scene preview"]')).toHaveCount(0);
  const preview = page.getByRole("button", { name: "Open Gallia scene preview — 52 BC", exact: true });
  await page.screenshot({ path: testInfo.outputPath("atlas-initial-preview.png"), fullPage: true });
  await preview.focus();
  await preview.press("Enter");
  await page.waitForURL("**/scene/gallia");
  await expect(page.getByRole("heading", { name: "The hill", exact: true })).toBeVisible();
});

test("117 AD map distinguishes Gallia's preview from 22 Coming soon provinces", async ({ page }, testInfo) => {
  await page.goto("/atlas");
  await page.getByRole("button", { name: "Switch main map to 117 AD" }).click();
  await expect(page.locator('path[role="button"][data-scene-status="preview"]')).toHaveCount(1);
  await expect(page.locator('path[role="button"][data-scene-status="coming-soon"]')).toHaveCount(22);
  const gallia = page.locator('path[aria-label="Gallia — open scene preview"]');
  const africa = page.locator('path[aria-label="Africa — coming soon"]');
  await expect(page.locator('path[data-held-overlay="gallia"]')).toHaveCSS("opacity", "1");
  await page.screenshot({ path: testInfo.outputPath("atlas-117ad-availability.png"), fullPage: true });
  await gallia.focus();
  await expect(page.getByRole("status", { name: "Province details" })).toContainText("Scene preview: 52 BC");
  await africa.focus();
  await expect(page.getByRole("status", { name: "Province details" })).toContainText("Africa Proconsularis — Coming soon");
  await africa.press("Enter");
  await page.waitForURL("**/scene/africa_prov");
  await expect(page.getByRole("heading", { name: "Africa", exact: true })).toBeVisible();
  await expect(page.getByText("Africa Proconsularis", { exact: true })).toBeVisible();
  await expect(page.getByText("Coming soon", { exact: true })).toBeVisible();
});

test("every unauthored province resolves to its named Coming soon state", async ({ request }) => {
  for (const province of provinces.filter((province) => province.id !== "gallia")) {
    const response = await request.get(`/scene/${province.id}`);
    expect(response.status(), province.id).toBe(200);
    const html = await response.text();
    expect(html, province.id).toContain('data-testid="not-yet-written"');
    expect(html, province.id).toContain("Coming soon");
    expect(html, province.id).toContain(province.latinName);
    expect(html, province.id).not.toContain('data-testid="scene-player"');
  }
});

test("Coming soon remains readable and keyboard operable on a narrow reduced-motion viewport", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/scene/anatolia");
  await expect(page.getByRole("heading", { name: "Cappadocia & Pontus", exact: true })).toBeVisible();
  await expect(page.getByText("Cappadocia et Pontus", { exact: true })).toBeVisible();
  await expect(page.getByText(/doesn.t have a scene yet/)).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("coming-soon-narrow.png"), fullPage: true });
  const back = page.getByRole("button", { name: "← Return to the map" });
  await back.focus();
  await back.press("Enter");
  await page.waitForURL("**/atlas");
  await expect(page.getByRole("button", { name: "Open Gallia scene preview — 52 BC", exact: true })).toBeVisible();
});

test("an unknown region returns 404 instead of pretending to be a coming campaign", async ({ request }) => {
  const response = await request.get("/scene/not-a-province");
  expect(response.status()).toBe(404);
  expect(await response.text()).not.toContain('data-testid="not-yet-written"');
});
