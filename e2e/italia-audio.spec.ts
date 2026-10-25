import { expect, test } from "@playwright/test";
import { installAudioProbe, audioState } from "./audio-probe";
import italia from "../content/regions/italia.json";

test("Italia keeps one current voice through rapid changes, persisted controls and navigation", async ({ page }) => {
  test.setTimeout(90_000);
  await installAudioProbe(page);
  await page.goto("/scene/italia");
  const player = page.getByTestId("scene-player");
  await expect(player).toHaveAttribute("data-engine-ready", "true", { timeout: 30_000 });
  expect((await audioState(page)).starts).toEqual([]);
  await page.getByRole("heading", { name: italia.beats[0].headline, exact: true }).click();
  for (const index of [2, 5, 3, 6, 1]) {
    await page.getByRole("tab", { name: new RegExp(`^Go to beat ${index}:`) }).click();
    await expect(player).toHaveAttribute("data-narration-state", "playing");
    await expect.poll(async () => (await audioState(page)).active.filter(source => !source.loop && source.seconds > 1.4).length).toBe(1);
  }
  await page.getByRole("button", { name: "Narration on", exact: true }).click();
  await expect.poll(async () => (await audioState(page)).active.filter(source => !source.loop).length).toBe(0);
  await page.getByRole("button", { name: "Ambience on", exact: true }).click();
  await page.getByRole("button", { name: "Mute", exact: true }).click();
  await page.reload();
  for (const name of ["Unmute", "Narration off", "Ambience off"]) await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
  expect((await audioState(page)).active).toEqual([]);
  await page.getByRole("button", { name: "Unmute", exact: true }).click();
  await page.getByRole("button", { name: "Narration off", exact: true }).click();
  await expect(player).toHaveAttribute("data-narration-state", "playing");
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/atlas$/);
  await expect.poll(async () => (await audioState(page)).active.length).toBe(0);
  await page.goBack();
  await expect(player).toHaveAttribute("data-engine-ready", "true", { timeout: 30_000 });
  expect((await audioState(page)).active).toEqual([]);
});

test("failed Italia narration preserves prose and advances with reading-time fallback", async ({ page }) => {
  test.setTimeout(90_000);
  await installAudioProbe(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/assets/italia/audio/narration-an-order-from-rome.mp3", route => route.fulfill({ status: 503, body: "failed test download" }));
  await page.goto("/scene/italia");
  const player = page.getByTestId("scene-player");
  await expect(player).toHaveAttribute("data-engine-ready", "true", { timeout: 30_000 });
  await page.getByRole("heading", { name: italia.beats[0].headline, exact: true }).click();
  await expect(player).toHaveAttribute("data-narration-state", "failed");
  await expect(page.getByText(italia.beats[0].body, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "▶ Autoplay", exact: true }).click();
  await expect(page.getByRole("tab", { name: /^Go to beat 2:/ })).toHaveAttribute("aria-current", "true", { timeout: 50_000 });
  await expect(player).toHaveAttribute("data-narration-state", "playing");
  await page.keyboard.press("Escape");
  await expect.poll(async () => (await audioState(page)).active.length).toBe(0);
});
