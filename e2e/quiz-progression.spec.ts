import { test, expect } from "@playwright/test";
import postgres from "postgres";
import { assertIsolatedTestDatabase } from "../lib/testDatabase";
import { bank, headers, startQuiz, answer, complete, signup } from "./quiz-helpers";

const sql = postgres(assertIsolatedTestDatabase(process.env.DATABASE_URL), { prepare: false, max: 1 });
test.afterAll(async () => { await sql.end({ timeout: 5 }); });

test("retries bank only newly correct questions and persist rank/history", async ({ page }) => {
  const account = await signup(page.request);
  const first = await startQuiz(page.request);
  const choices = bank.map(question => question.correctOptionId);
  choices[0] = bank[0].options[0].id;
  const result = await complete(page.request, first.id, choices);
  expect(result.score).toBe(4);
  expect(result.xpAwarded).toBe(80);
  expect(result.progress).toEqual({ xp: 80, rank: "Miles", streakDays: 1 });
  const second = await startQuiz(page.request);
  const retried = await complete(page.request, second.id);
  expect(retried.xpAwarded).toBe(10);
  expect(retried.progress?.xp).toBe(90);
  const third = await startQuiz(page.request);
  expect((await complete(page.request, third.id)).xpAwarded).toBe(0);
  await page.goto("/profile");
  await expect(page.getByText(account.email, { exact: true })).toBeVisible();
  await expect(page.getByRole("definition").filter({ hasText: /^90 XP$/ })).toBeVisible();
  await expect(page.getByRole("region", { name: "Quiz history" }).getByRole("listitem")).toHaveCount(3);
  await expect(page.getByText("Daily streak resets at 00:00 UTC", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("definition").filter({ hasText: /^90 XP$/ })).toBeVisible();
});

test("duplicate/concurrent submissions and concurrent completed sessions cannot duplicate XP", async ({ request }) => {
  const account = await signup(request);
  const a = await startQuiz(request), b = await startQuiz(request);
  const input = { sessionId: a.id, questionId: bank[0].id, optionId: bank[0].correctOptionId };
  const repeated = await Promise.all([request.post("/api/quiz/answer", { headers, data: input }), request.post("/api/quiz/answer", { headers, data: input })]);
  expect(repeated.map(response => response.status())).toEqual([200, 200]);
  await answer(request, b.id, 0);
  for (let index = 1; index < 4; index++) { await answer(request, a.id, index); await answer(request, b.id, index); }
  const finished = await Promise.all([answer(request, a.id, 4), answer(request, b.id, 4)]);
  expect(finished.reduce((sum, view) => sum + view.xpAwarded, 0)).toBe(90);
  expect((await answer(request, a.id, 4)).progress?.xp).toBe(90);
  const [counts] = await sql`select count(*)::int as credits, sum(xp)::int as xp from quiz_credit where user_id = ${account.data.user.id}`;
  expect(counts).toMatchObject({ credits: 5, xp: 90 });
  const [answers] = await sql`select count(*)::int as count from quiz_answer where session_id = ${a.id}`;
  expect(answers.count).toBe(5);
});

test("practice completion advances a UTC streak without new XP, with gaps resetting it", async ({ request }) => {
  const account = await signup(request);
  const first = await startQuiz(request); await complete(request, first.id);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString();
  await sql`update profile set streak_days = 4, last_active_date = ${yesterday} where user_id = ${account.data.user.id}`;
  const practice = await startQuiz(request);
  const result = await complete(request, practice.id);
  expect(result.xpAwarded).toBe(0);
  expect(result.progress?.streakDays).toBe(5);
  const old = new Date(Date.now() - 3 * 86_400_000).toISOString();
  await sql`update profile set last_active_date = ${old} where user_id = ${account.data.user.id}`;
  const next = await startQuiz(request);
  expect((await complete(request, next.id)).progress?.streakDays).toBe(1);
});

test("unfinished attempts can resume after a long reading break without revealing unanswered questions", async ({ request }) => {
  const quiz = await startQuiz(request);
  await answer(request, quiz.id, 0);
  await sql`update quiz_session set started_at = (now() at time zone 'UTC') - interval '7 days' where id = ${quiz.id}`;
  const response = await request.get(`/api/quiz/session?id=${quiz.id}`);
  expect(response.status()).toBe(200);
  const resumed = await response.json();
  expect(resumed.answers).toHaveLength(1);
  expect(resumed.finished).toBe(false);
  expect((await answer(request, quiz.id, 1)).answers).toHaveLength(2);
});
