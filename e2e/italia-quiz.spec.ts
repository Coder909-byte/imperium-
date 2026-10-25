import { expect, test, type APIRequestContext } from "@playwright/test";
import { readQuestionBank } from "../lib/quiz/bank";
import { LocalProgress, QuizView } from "../lib/quiz/contracts";
import { headers, signup, startQuiz as startGallia, complete as completeGallia } from "./quiz-helpers";
import { z } from "zod";

const bank = readQuestionBank("italia");
async function start(request: APIRequestContext) {
  const response = await request.post("/api/quiz/session", { headers, data: { regionId: "italia" } });
  expect(response.status()).toBe(200);
  return QuizView.parse(await response.json());
}
async function complete(request: APIRequestContext, id: string) {
  let result: QuizView | undefined;
  for (const question of bank) {
    const response = await request.post("/api/quiz/answer", { headers, data: { sessionId: id, questionId: question.id, optionId: question.correctOptionId } });
    expect(response.status()).toBe(200);
    result = QuizView.parse(await response.json());
  }
  if (!result) throw new Error("Missing result");
  return result;
}

test("Italia scene → narrow keyboard quiz → results → retry and atlas", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/scene/italia");
  await expect(page.getByTestId("scene-player")).toHaveAttribute("data-engine-ready", "true");
  await page.getByRole("tab", { name: /^Go to beat 6:/ }).click();
  await page.getByRole("button", { name: "Test yourself on Italia", exact: true }).click();
  await page.getByRole("button", { name: "Start quiz", exact: true }).click();
  for (const [index, question] of bank.entries()) {
    const option = question.options.find(option => option.id === question.correctOptionId)!;
    const control = page.getByRole("radio", { name: option.text, exact: true });
    await control.focus();
    await page.keyboard.press("Space");
    await page.getByRole("button", { name: "Submit answer", exact: true }).click();
    await expect(page.getByRole("region", { name: "Answer feedback" })).toContainText(question.feedbackByOptionId[question.correctOptionId]);
    await page.getByRole("button", { name: index === 4 ? "View results" : "Next question", exact: true }).click();
  }
  await expect(page.getByRole("heading", { name: "5 out of 5" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("italia-results-narrow.png"), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const stored = LocalProgress.parse(await page.evaluate(() => JSON.parse(localStorage.getItem("imperium.progress.v1") ?? "{}")));
  expect(stored.sessionIds).toHaveLength(1);
  expect(stored).not.toHaveProperty("xp");
  await page.getByRole("button", { name: "Retry quiz", exact: true }).click();
  await expect(page.getByRole("group", { name: bank[0].prompt })).toBeVisible();
  await page.goto("/atlas");
  await expect(page.getByRole("button", { name: /Open Italia scene preview/ })).toBeVisible();
});

test("Italia sessions hide keys and reject Gallia question/option IDs", async ({ request }) => {
  const view = await start(request);
  expect(JSON.stringify(view)).not.toMatch(/correctOptionId|feedbackByOptionId|explanation/);
  const gallia = readQuestionBank("gallia")[0];
  for (const body of [
    { questionId: gallia.id, optionId: gallia.correctOptionId },
    { questionId: bank[0].id, optionId: gallia.correctOptionId },
    { questionId: bank[0].id, optionId: bank[1].correctOptionId },
  ]) {
    const response = await request.post("/api/quiz/answer", { headers, data: { sessionId: view.id, ...body } });
    expect(response.status()).toBe(400);
    expect(Object.keys(await response.json())).toEqual(["error"]);
  }
});

test("Italia anonymous import and concurrent retries award each question once across the account", async ({ request }) => {
  const guest = await start(request);
  expect((await complete(request, guest.id)).potentialXP).toBe(80);
  const gallia = await startGallia(request);
  await completeGallia(request, gallia.id);
  await signup(request);
  const body = { sessionIds: [guest.id, gallia.id], regions: [{ regionId: "italia", beatIds: ["across-the-boundary"] }] };
  expect((await request.post("/api/progress/migrate", { headers, data: { ...body, xp: 90000 } })).status()).toBe(400);
  const imported = await Promise.all([1, 2].map(() => request.post("/api/progress/migrate", { headers, data: body })));
  const results = await Promise.all(imported.map(async response => {
    expect(response.status()).toBe(200);
    return z.object({ xpAwarded: z.number().int().nonnegative() }).parse(await response.json());
  }));
  expect(results.reduce((total, result) => total + result.xpAwarded, 0)).toBe(170);
  const a = await start(request), b = await start(request);
  const retries = await Promise.all([complete(request, a.id), complete(request, b.id)]);
  expect(retries.map(result => result.xpAwarded)).toEqual([0, 0]);
  expect(retries[0].progress).toEqual({ xp: 170, rank: "Immunis", streakDays: 1 });
  const final = bank[4];
  const duplicate = await request.post("/api/quiz/answer", { headers, data: { sessionId: a.id, questionId: final.id, optionId: final.correctOptionId } });
  expect(QuizView.parse(await duplicate.json()).progress?.xp).toBe(170);
});
