import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { question, quizSession, quizAnswer } from "@/db/schema";
import { readQuestionBank } from "./bank";
import { grade, QuizError } from "./grading";
import { lockProfile, ownedQuiz, readView, awardCompletion, ownership, type Owner } from "./store";
import type { z } from "zod";
import type { AnswerRequest } from "./contracts";

export async function startQuiz(owner: Owner, regionId: string) {
  ownership(owner);
  const bank = readQuestionBank(regionId);
  const seeded = await db.select({ id: question.id }).from(question).where(inArray(question.id, bank.map(question => question.id)));
  if (seeded.length !== 5) throw new QuizError(503, "The quiz bank has not been installed. Return to the atlas and try again later.");
  return db.transaction(async tx => {
    const startedAt = new Date();
    const [row] = await tx.insert(quizSession).values({ userId: owner.userId, guestHash: owner.userId ? null : owner.guestHash, regionId, mode: "region", total: 5, questionSnapshot: bank, startedAt }).returning();
    return readView(tx, row);
  });
}

export async function getQuiz(owner: Owner, id: string) {
  return db.transaction(async tx => readView(tx, await ownedQuiz(tx, owner, id)));
}

export async function answerQuiz(owner: Owner, input: z.infer<typeof AnswerRequest>) {
  return db.transaction(async tx => {
    // Use the same lock order as guest migration: profile, then session.
    if (owner.userId) await lockProfile(tx, owner.userId);
    const row = await ownedQuiz(tx, owner, input.sessionId);
    const question = row.questionSnapshot.find(question => question.id === input.questionId);
    if (!question) throw new QuizError(400, "That question does not belong to this quiz. Reload the quiz.");
    const verdict = grade(question, input.optionId);
    const previous = await tx.select().from(quizAnswer).where(eq(quizAnswer.sessionId, row.id));
    const existing = previous.find(answer => answer.questionId === input.questionId);
    if (existing) {
      if (existing.chosenOptionId !== input.optionId) throw new QuizError(409, "This answer has already been submitted. Start a retry to choose differently.");
      return readView(tx, row);
    }
    if (row.finishedAt || row.questionSnapshot[previous.length]?.id !== input.questionId) throw new QuizError(409, "Answer the current question before continuing.");
    await tx.insert(quizAnswer).values({ sessionId: row.id, questionId: question.id, chosenOptionId: input.optionId, correct: verdict.correct, timeMs: Math.max(0, Math.min(2_147_483_647, Date.now() - row.startedAt.getTime())) });
    const view = await readView(tx, row);
    if (view.answers.length === 5) {
      const now = new Date();
      const xpAwarded = owner.userId ? await awardCompletion(tx, owner.userId, row.id, row.questionSnapshot, view.answers, now) : 0;
      const [finished] = await tx.update(quizSession).set({ finishedAt: now, score: view.score, xpAwarded }).where(eq(quizSession.id, row.id)).returning();
      return readView(tx, finished);
    }
    return view;
  });
}
