import { expect, test } from "@playwright/test";

test("painted infantry rigs load every clip, scrub cleanly and retain a clean numerical lint report", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/dev/scene-lab");
  await page.getByRole("button", { name: "Rig inspector", exact: true }).click();
  await page.getByLabel("Pivots/bounds overlay").uncheck();
  await page.getByLabel("Playing").uncheck();
  for (const rig of ["roman_infantry", "gaul_warrior", "gaul_warrior_blue"]) {
    await page.getByLabel("Rig:").selectOption(rig);
    await expect(page.getByTestId("rig-lint-panel")).toContainText("no issues");
    await expect(page.getByTestId("rig-inspector-canvas").locator("canvas")).toHaveCount(1);
    for (const clip of ["idle", "march", "brace", "thrust", "fall", "raise"]) {
      await page.getByLabel("Clip:").selectOption(clip);
      await page.getByLabel("Scrub clip timeline").fill("500");
      await page.waitForTimeout(100);
    }
    await page.getByLabel("Clip:").selectOption("brace");
    await page.getByLabel("Scrub clip timeline").fill("500");
    await page.getByTestId("rig-inspector-canvas").screenshot({ path: testInfo.outputPath(`${rig}-close.png`) });
    await page.getByLabel("Pivots/bounds overlay").check();
    await page.getByTestId("rig-inspector-canvas").screenshot({ path: testInfo.outputPath(`${rig}-pivots.png`) });
    await page.getByLabel("Pivots/bounds overlay").uncheck();
  }
  expect(errors).toEqual([]);
});
