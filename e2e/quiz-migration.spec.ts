import { test, expect } from "@playwright/test";
import postgres from "postgres";
import { assertIsolatedTestDatabase } from "../lib/testDatabase";
import { headers, startQuiz, answer, complete, signup } from "./quiz-helpers";

const sql = postgres(assertIsolatedTestDatabase(process.env.DATABASE_URL), { prepare: false, max: 1 });
test.afterAll(async () => { await sql.end({ timeout: 5 }); });

test("anonymous quiz imports automatically after real local signup, without trusting XP or dates", async ({ page }) => {
  const quiz = await startQuiz(page.request); await complete(page.request, quiz.id);
  const old = new Date(Date.now() - 12 * 86_400_000).toISOString();
  await sql`update quiz_session set finished_at = ${old} where id = ${quiz.id}`;
  await page.goto("/signup");
  await page.evaluate(id => localStorage.setItem("imperium.progress.v1", JSON.stringify({ version: 1, sessionIds: [id], regions: [{ regionId: "gallia", beatIds: ["the-hill"] }] })), quiz.id);
  await page.getByLabel("Email", { exact: true }).fill(`ui-${crypto.randomUUID()}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill("LocalQuizPass23");
  await page.getByRole("button", { name: "Sign up", exact: true }).click();
  await page.waitForURL("**/profile");
  await expect(page.getByText("Saved progress verified. 90 new XP imported.", { exact: true })).toBeVisible();
  await expect(page.getByRole("definition").filter({ hasText: /^90 XP$/ })).toBeVisible();
  await expect(page.getByRole("definition").filter({ hasText: /^1 day$/ })).toBeVisible();
  const local = await page.evaluate(() => JSON.parse(localStorage.getItem("imperium.progress.v1") ?? "{}"));
  expect(local.sessionIds).toEqual([]); expect(local.regions).toEqual([]);
  await page.reload();
  await expect(page.getByRole("definition").filter({ hasText: /^90 XP$/ })).toBeVisible();
});

test("tampered and duplicate imports cannot award client XP or backdate a streak", async ({ request }) => {
  const guest = await startQuiz(request); await complete(request, guest.id);
  const account = await signup(request);
  const body = { sessionIds: [guest.id, guest.id], regions: [] };
  for (const extra of [{ xp: 900000 }, { streakDays: 100 }, { lastActiveDate: "1990-01-01" }]) {
    expect((await request.post("/api/progress/migrate", { headers, data: { ...body, ...extra } })).status()).toBe(400);
  }
  const results = await Promise.all([request.post("/api/progress/migrate", { headers, data: body }), request.post("/api/progress/migrate", { headers, data: body })]);
  expect(results.map(response => response.status())).toEqual([200, 200]);
  const parsed = await Promise.all(results.map(response => response.json()));
  expect(parsed.reduce((sum, result) => sum + result.xpAwarded, 0)).toBe(90);
  const [row] = await sql`select xp, streak_days, last_active_date::text as active from profile where user_id = ${account.data.user.id}`;
  expect(row.xp).toBe(90); expect(row.streak_days).toBe(1);
  expect(row.active.slice(0, 10)).toBe(new Date().toISOString().slice(0, 10));
});

test("a session reference alone, incomplete attempts and foreign beat IDs cannot mint progress rewards", async ({ request, playwright }) => {
  const guest = await startQuiz(request); await complete(request, guest.id);
  const other = await playwright.request.newContext({ baseURL: process.env.PLAYWRIGHT_BASE_URL });
  await signup(other);
  const rejected = await other.post("/api/progress/migrate", { headers, data: { sessionIds: [guest.id], regions: [] } });
  expect(await rejected.json()).toMatchObject({ acceptedIds: [], ignoredCount: 1, xpAwarded: 0, progress: { xp: 0, streakDays: 0 } });
  await other.dispose();
  const unfinished = await startQuiz(request); await answer(request, unfinished.id, 0);
  await signup(request);
  const incomplete = await request.post("/api/progress/migrate", { headers, data: { sessionIds: [unfinished.id], regions: [] } });
  expect(await incomplete.json()).toMatchObject({ acceptedIds: [], ignoredCount: 1, xpAwarded: 0 });
  expect((await request.post("/api/progress/migrate", { headers, data: { sessionIds: [], regions: [{ regionId: "gallia", beatIds: ["invented-beat"] }] } })).status()).toBe(400);
});

test("failed signup import retains local references and retries safely", async ({ page }) => {
  const guest = await startQuiz(page.request); await complete(page.request, guest.id);
  await signup(page.request);
  await page.goto("/quiz/gallia");
  await page.evaluate(id => localStorage.setItem("imperium.progress.v1", JSON.stringify({ version: 1, sessionIds: [id], regions: [] })), guest.id);
  await page.route("**/api/progress/migrate", route => route.fulfill({ status: 503, json: { error: "Progress could not be saved. Try again." } }), { times: 1 });
  await page.goto("/profile");
  await expect(page.getByRole("alert").filter({ hasText: "Progress could not be saved" })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("imperium.progress.v1") ?? "{}").sessionIds)).toEqual([guest.id]);
  await page.getByRole("button", { name: "Retry progress import" }).click();
  await expect(page.getByText("Saved progress verified. 90 new XP imported.", { exact: true })).toBeVisible();
});
