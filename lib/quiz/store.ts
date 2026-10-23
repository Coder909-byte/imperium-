import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { profile, quizSession, quizAnswer, quizCredit } from "@/db/schema";
import { Question } from "@/content/questionSchema";
import { publicQuestion, grade, QuizError } from "./grading";
import { eligibleCredits, rankForXP, advanceStreak, visibleStreak, PROGRESSION } from "./progression";
import type { QuizView, ProgressSummary, Verdict } from "./contracts";

export type QuizTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export const Owner = z.object({ userId: z.string().nullable(), guestHash: z.string().nullable() });
export type Owner = z.infer<typeof Owner>;
export type StoredQuiz = typeof quizSession.$inferSelect;

export function ownership(owner: Owner) {
  if (owner.userId) return eq(quizSession.userId, owner.userId);
  if (owner.guestHash) return and(isNull(quizSession.userId), eq(quizSession.guestHash, owner.guestHash));
  throw new QuizError(404, "Quiz not found in this browser. Start a new quiz.");
}

export async function ownedQuiz(tx: QuizTransaction, owner: Owner, id: string) {
  const [row] = await tx.select().from(quizSession).where(and(eq(quizSession.id, id), ownership(owner))).for("update");
  if (!row) throw new QuizError(404, "Quiz not found in this browser. Start a new quiz.");
  if (!z.array(Question).length(5).safeParse(row.questionSnapshot).success) throw new QuizError(409, "This quiz uses an older format. Start a new quiz.");
  return row;
}

export async function lockProfile(tx: QuizTransaction, userId: string) {
  const [row] = await tx.select().from(profile).where(eq(profile.userId, userId)).for("update");
  if (!row) throw new QuizError(409, "Your account profile is missing. Reload your account before trying again.");
  return row;
}

export function summary(row: typeof profile.$inferSelect, now = new Date()): ProgressSummary {
  return { xp: row.xp, rank: rankForXP(row.xp), streakDays: visibleStreak(row.streakDays, row.lastActiveDate, now) };
}

export async function accountSummary(userId: string): Promise<ProgressSummary> {
  const [row] = await db.select().from(profile).where(eq(profile.userId, userId));
  if (!row) throw new QuizError(409, "Your account profile is missing. Reload your account.");
  return summary(row);
}

export async function readView(tx: QuizTransaction, row: StoredQuiz): Promise<QuizView> {
  const answers = await tx.select().from(quizAnswer).where(eq(quizAnswer.sessionId, row.id));
  const verdicts = row.questionSnapshot.flatMap(question => {
    const answer = answers.find(answer => answer.questionId === question.id);
    return answer ? [grade(question, answer.chosenOptionId)] : [];
  });
  const [profileRow] = row.userId ? await tx.select().from(profile).where(eq(profile.userId, row.userId)) : [];
  return {
    id: row.id, regionId: row.regionId, questions: row.questionSnapshot.map(publicQuestion), answers: verdicts,
    finished: Boolean(row.finishedAt), score: verdicts.filter(answer => answer.correct).length,
    authenticated: row.userId !== null, xpAwarded: row.xpAwarded,
    potentialXP: row.questionSnapshot.reduce((total, question) => total + (verdicts.some(answer => answer.questionId === question.id && answer.correct) ? PROGRESSION.xpByDifficulty[question.difficulty] : 0), 0),
    progress: profileRow ? summary(profileRow) : null,
  };
}

export async function awardCompletion(tx: QuizTransaction, userId: string, sessionId: string, bank: Question[], answers: Verdict[], now: Date) {
  const current = await lockProfile(tx, userId);
  const existing = await tx.select({ questionId: quizCredit.questionId }).from(quizCredit).where(eq(quizCredit.userId, userId));
  const credits = eligibleCredits(bank.filter(question => answers.some(answer => answer.questionId === question.id && answer.correct))
    .map(question => ({ questionId: question.id, difficulty: question.difficulty })), new Set(existing.map(credit => credit.questionId)));
  const inserted = credits.length ? await tx.insert(quizCredit).values(credits.map(credit => ({ ...credit, userId, sessionId, createdAt: now }))).onConflictDoNothing().returning({ xp: quizCredit.xp }) : [];
  const xpAwarded = inserted.reduce((total, credit) => total + credit.xp, 0);
  const xp = current.xp + xpAwarded;
  await tx.update(profile).set({ xp, rank: rankForXP(xp), streakDays: advanceStreak(current.streakDays, current.lastActiveDate, now), lastActiveDate: current.lastActiveDate && current.lastActiveDate > now ? current.lastActiveDate : now }).where(eq(profile.userId, userId));
  return xpAwarded;
}

export async function completedHistory(userId: string) {
  return db.select({ id: quizSession.id, regionId: quizSession.regionId, score: quizSession.score, total: quizSession.total, finishedAt: quizSession.finishedAt, xpAwarded: quizSession.xpAwarded })
    .from(quizSession).where(and(eq(quizSession.userId, userId), isNotNull(quizSession.finishedAt))).orderBy(desc(quizSession.finishedAt)).limit(50);
}
