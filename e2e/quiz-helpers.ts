import { expect, type APIRequestContext } from "@playwright/test";
import { readQuestionBank } from "../lib/quiz/bank";
import { QuizView } from "../lib/quiz/contracts";
import { assertIsolatedTestDatabase } from "../lib/testDatabase";
import { z } from "zod";

assertIsolatedTestDatabase(process.env.DATABASE_URL);
export const bank = readQuestionBank("gallia");
export const origin = new URL(process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3006").origin;
export const headers = { Origin: origin };

export async function startQuiz(request: APIRequestContext) {
  const response = await request.post("/api/quiz/session", { headers, data: { regionId: "gallia" } });
  expect(response.status(), await response.text()).toBe(200);
  return QuizView.parse(await response.json());
}

export async function answer(request: APIRequestContext, id: string, index: number, optionId = bank[index].correctOptionId) {
  const response = await request.post("/api/quiz/answer", { headers, data: { sessionId: id, questionId: bank[index].id, optionId } });
  expect(response.status(), await response.text()).toBe(200);
  return QuizView.parse(await response.json());
}

export async function complete(request: APIRequestContext, id: string, choices = bank.map(question => question.correctOptionId)) {
  let result: QuizView | null = null;
  for (let index = 0; index < 5; index++) result = await answer(request, id, index, choices[index]);
  if (!result) throw new Error("Quiz was not completed");
  return result;
}

export async function signup(request: APIRequestContext) {
  const email = `quiz-${crypto.randomUUID()}@example.com`;
  const create = () => request.post("/api/auth/sign-up/email", { headers, data: { email, password: "LocalQuizPass23", name: "Local quiz reader" } });
  let response = await create();
  // Production Better Auth limits rapid fixture creation too. Respect its
  // retry window instead of weakening the application's auth configuration.
  if (response.status() === 429) {
    const seconds = Number(response.headers()["retry-after"] ?? response.headers()["x-retry-after"]);
    expect(seconds).toBeGreaterThanOrEqual(0);
    expect(seconds).toBeLessThanOrEqual(10);
    await new Promise(resolve => setTimeout(resolve, seconds * 1000 + 150));
    response = await create();
  }
  expect(response.status(), await response.text()).toBe(200);
  return { email, data: z.object({ user: z.object({ id: z.string() }) }).parse(await response.json()) };
}
