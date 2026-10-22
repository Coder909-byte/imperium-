import { expect, test } from "@playwright/test";
import gallia from "../content/regions/gallia.json";

test("Gallia's six beats retain their prose and per-beat sources", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/scene/gallia");
  await expect(page.locator("canvas")).toHaveCount(1);
  for (const [index, beat] of gallia.beats.entries()) {
    await page.getByRole("tab", { name: `Go to beat ${index + 1}: ${beat.headline}`, exact: true }).click();
    await expect(page.getByText(beat.body, { exact: true })).toBeVisible();
    await page.getByText(`Sources (${beat.sources.length})`, { exact: true }).click();
    for (const source of beat.sources) await expect(page.getByText(source.label, { exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`gallia-beat-${index + 1}.png`), fullPage: true });
  }
  expect(errors).toEqual([]);
});

test("narrow reduced-motion playback keeps all prose, sources and controls reachable; mute survives navigation", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/scene/gallia");
  await page.getByRole("button", { name: "Mute", exact: true }).click();
  for (const [index, beat] of gallia.beats.entries()) {
    await page.getByRole("tab", { name: `Go to beat ${index + 1}: ${beat.headline}`, exact: true }).click();
    await expect(page.getByText(beat.body, { exact: true })).toBeVisible();
    await page.getByText(`Sources (${beat.sources.length})`, { exact: true }).click();
    for (const source of beat.sources) await expect(page.getByText(source.label, { exact: true })).toBeVisible();
    const player = page.getByTestId("scene-player");
    const button = page.getByRole("button", { name: "Unmute", exact: true });
    await expect(button).toBeVisible();
    const bounds = await player.boundingBox();
    const controls = await button.boundingBox();
    expect(controls!.y + controls!.height).toBeLessThanOrEqual(bounds!.y + bounds!.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  }
  await page.goto("/atlas");
  await page.goto("/scene/gallia");
  await expect(page.getByRole("button", { name: "Unmute", exact: true })).toHaveAttribute("aria-pressed", "true");
});
