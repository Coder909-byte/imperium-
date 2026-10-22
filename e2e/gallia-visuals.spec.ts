import { expect, test } from "@playwright/test";

declare global { interface Window { __artLabels: string[]; __groundBakes: number } }

test("a runtime downgrade bakes painted ground before dropping its independent plane", async ({ page }) => {
  test.setTimeout(90_000);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 8 });
    Object.defineProperty(navigator, "deviceMemory", { get: () => 8 });
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) => raf((time) => { setTimeout(() => callback(time), 45); });
    window.__groundBakes = 0;
    const drawImage = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (this: CanvasRenderingContext2D, image: CanvasImageSource, ...coordinates: number[]) {
      if (image instanceof HTMLImageElement && image.src.endsWith("/gallia/mid_ground.webp")) window.__groundBakes += 1;
      Reflect.apply(drawImage, this, [image, ...coordinates]);
    };
  });
  await page.goto("/scene/gallia");
  const player = page.getByTestId("scene-player");
  await expect(player).toHaveAttribute("data-engine-ready", "true", { timeout: 20_000 });
  await expect(player).toHaveAttribute("data-device-tier", "high");
  await expect(player).toHaveAttribute("data-device-tier", "low", { timeout: 20_000 });
  await expect.poll(() => page.evaluate(() => window.__groundBakes)).toBe(1);
  await expect(player).toHaveAttribute("data-visible-planes", "sky,mid_ground,hillfort");
  await page.getByRole("tab", { name: /^Go to beat 2:/ }).click();
  await expect(player).toHaveAttribute("data-visible-planes", "sky,mid_ground,hillfort,inner_wall");
  await expect(page.getByRole("alert").filter({ hasText: "Scene artwork could not load" })).toHaveCount(0);
});

test("low detail loads painted ground, keeps construction chronology, and draws no developer labels", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    window.__artLabels = [];
    const fillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (...args: Parameters<typeof fillText>) {
      if (String(args[0]).includes("PLACEHOLDER")) window.__artLabels.push(String(args[0]));
      fillText.apply(this, args);
    };
    Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 2 });
    Object.defineProperty(navigator, "deviceMemory", { get: () => 2 });
  });
  const ground = page.waitForResponse("**/assets/gallia/mid_ground.webp");
  await page.goto("/scene/gallia");
  expect((await ground).status()).toBe(200);
  const player = page.getByTestId("scene-player");
  await expect(player).toHaveAttribute("data-engine-ready", "true", { timeout: 20_000 });
  await expect(player).toHaveAttribute("data-device-tier", "low");
  await expect(player).toHaveAttribute("data-visible-planes", "sky,mid_ground,hillfort");
  await page.getByRole("tab", { name: /^Go to beat 2:/ }).click();
  await expect(player).toHaveAttribute("data-visible-planes", "sky,mid_ground,hillfort,inner_wall");
  expect(await page.evaluate(() => window.__artLabels)).toEqual([]);
  await expect(page.getByText("Artwork in progress", { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("beat-2-low.png"), fullPage: true });
  await page.getByRole("tab", { name: /^Go to beat 3:/ }).click();
  await expect(player).toHaveAttribute("data-visible-planes", "sky,mid_ground,hillfort,inner_wall,outer_wall");
});

test("scene-lab exposes real missing art and limits low tier to four rendered sprites", async ({ page }) => {
  await page.goto("/dev/scene-lab?region=gallia");
  await page.getByLabel("Region:").selectOption("gallia");
  await page.getByLabel("Tier:").selectOption("low");
  await expect(page.getByTestId("scene-player")).toHaveAttribute("data-engine-ready", "true", { timeout: 20_000 });
  await page.getByRole("tab", { name: /^Go to beat 2:/ }).click();
  await page.getByText(/^Art diagnostics/).click();
  await expect(page.getByText(/^4 rendered planes/)).toBeVisible();
  await expect(page.locator('[data-art-plane="hillfort"]')).toHaveAttribute("data-art-kind", "placeholder");
  await expect(page.locator('[data-art-plane="mid_ground"]')).toHaveAttribute("data-art-kind", "approved");
  await expect(page.locator('[data-art-plane="outer_wall"]')).toHaveAttribute("data-art-visible", "false");
  await page.getByRole("tab", { name: /^Go to beat 3:/ }).click();
  await expect(page.locator('[data-art-plane="outer_wall"]')).toHaveAttribute("data-art-visible", "true");
});
