import { test, expect } from "@playwright/test";
import { bank, headers, startQuiz, answer } from "./quiz-helpers";

test("Gallia scene → keyboard-friendly quiz → explanations, results and retry", async ({ page }) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/scene/gallia");
  await expect(page.getByTestId("scene-player")).toHaveAttribute("data-engine-ready", "true");
  for (let index = 0; index < 5; index++) {
    await page.getByRole("button", { name: "Next beat", exact: true }).click();
    await expect(page.getByRole("tab", { name: new RegExp(`^Go to beat ${index + 2}:`) })).toHaveAttribute("aria-current", "true");
  }
  await page.getByRole("button", { name: /^Test yourself on/ }).click();
  await page.waitForURL("**/quiz/gallia");
  await page.getByRole("button", { name: "Start quiz", exact: true }).click();
  for (let index = 0; index < 5; index++) {
    const question = bank[index];
    await expect(page.getByRole("group", { name: question.prompt })).toBeVisible();
    const option = question.options.find(option => option.id === question.correctOptionId)!;
    if (index === 0) {
      await page.getByRole("radio").first().focus();
      await page.keyboard.press("ArrowDown");
      await expect(page.getByRole("radio", { name: option.text, exact: true })).toBeChecked();
    } else await page.getByRole("radio", { name: option.text, exact: true }).check();
    await page.getByRole("button", { name: "Submit answer", exact: true }).click();
    await expect(page.getByRole("region", { name: "Answer feedback" })).toContainText(question.feedbackByOptionId[question.correctOptionId]);
    await expect(page.getByRole("heading", { name: "Correct.", exact: true })).toBeFocused();
    await page.getByRole("button", { name: index === 4 ? "View results" : "Next question", exact: true }).click();
  }
  await expect(page.getByRole("heading", { name: "5 out of 5" })).toBeVisible();
  await expect(page.getByText("Daily streak resets at 00:00 UTC", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Quiz explanations" }).getByRole("heading", { level: 3 })).toHaveCount(5);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("imperium.progress.v1") ?? "{}"));
  expect(stored.sessionIds).toHaveLength(1);
  expect(stored.regions[0].beatIds).toHaveLength(6);
  expect(stored).not.toHaveProperty("xp");
  await page.getByRole("link", { name: "Return to the atlas", exact: true }).click();
  await expect(page).toHaveURL(/\/atlas$/);
  await page.goto("/quiz/gallia");
  await page.reload();
  await expect(page.getByRole("heading", { name: "5 out of 5" })).toBeVisible();
  await page.getByRole("button", { name: "Retry quiz", exact: true }).click();
  await expect(page.getByRole("group", { name: bank[0].prompt })).toBeVisible();
  expect(errors).toEqual([]);
});

test("pre-submission HTML, JSON and downloaded scripts expose no answer bank", async ({ page, request }) => {
  const scripts: Promise<string>[] = [];
  page.on("response", response => { if (response.request().resourceType() === "script") scripts.push(response.text().catch(() => "")); });
  await page.goto("/quiz/gallia");
  await page.getByRole("button", { name: "Start quiz", exact: true }).click();
  await expect(page.getByRole("group", { name: bank[0].prompt })).toBeVisible();
  const id = await page.evaluate(() => localStorage.getItem("imperium.quiz.active.gallia"));
  const response = await page.request.get(`/api/quiz/session?id=${id}`);
  const data: unknown = await response.json();
  const serialized = JSON.stringify(data);
  for (const key of ["correctOptionId", "correct", "feedback", "feedbackByOptionId", "explanation", "rightQuip", "wrongQuips"]) expect(serialized).not.toContain(`"${key}"`);
  const html = await (await request.get("/quiz/gallia")).text();
  expect(scripts.length).toBeGreaterThan(0);
  const sources = html + (await Promise.all(scripts)).join("\n");
  for (const question of bank) {
    expect(sources).not.toContain(question.explanation);
    for (const feedback of Object.values(question.feedbackByOptionId)) expect(sources).not.toContain(feedback);
  }
  const graded = await answer(page.request, id!, 0);
  expect(graded.answers.map(answer => answer.questionId)).toEqual([bank[0].id]);
  const partial = JSON.stringify(graded);
  for (const question of bank.slice(1)) {
    expect(partial).not.toContain(question.explanation);
    for (const feedback of Object.values(question.feedbackByOptionId)) expect(partial).not.toContain(feedback);
  }
  expect(response.headers()["cache-control"]).toBe("no-store");
});

test("malformed, mismatched, out-of-order and foreign submissions fail without revealing feedback", async ({ request, playwright }) => {
  const view = await startQuiz(request);
  const body = { sessionId: view.id, questionId: bank[0].id, optionId: "z" };
  for (const invalid of [body, { ...body, optionId: bank[1].options[0].id }, { ...body, questionId: "foreign-question" }, { ...body, sessionId: "invalid" }, { ...body, optionId: bank[0].options[0].id, correct: true }]) {
    const response = await request.post("/api/quiz/answer", { headers, data: invalid });
    expect(response.status()).toBe(400);
    expect(Object.keys(await response.json())).toEqual(["error"]);
  }
  const outOfOrder = await request.post("/api/quiz/answer", { headers, data: { sessionId: view.id, questionId: bank[2].id, optionId: bank[2].options[0].id } });
  expect(outOfOrder.status()).toBe(409);
  const other = await playwright.request.newContext({ baseURL: process.env.PLAYWRIGHT_BASE_URL });
  expect((await other.get(`/api/quiz/session?id=${view.id}`)).status()).toBe(404);
  await other.dispose();
  expect((await request.post("/api/quiz/answer", { headers: { Origin: "https://another.example" }, data: body })).status()).toBe(403);
  await answer(request, view.id, 0);
  const changed = await request.post("/api/quiz/answer", { headers, data: { ...body, optionId: bank[0].options[0].id } });
  expect(changed.status()).toBe(409);
});

test("quiz loading/rejection states preserve a retryable answer at a narrow width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/quiz/gallia");
  await page.getByRole("button", { name: "Start quiz", exact: true }).click();
  await page.getByRole("radio").first().check();
  await page.route("**/api/quiz/answer", route => route.fulfill({ status: 503, json: { error: "Progress could not be saved. Try again." } }), { times: 1 });
  await page.getByRole("button", { name: "Submit answer", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Progress could not be saved" })).toBeVisible();
  await expect(page.getByRole("radio").first()).toBeChecked();
  await page.getByRole("button", { name: "Submit answer", exact: true }).click();
  await expect(page.getByRole("region", { name: "Answer feedback" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
