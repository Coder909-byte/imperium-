import { z } from "zod";
import { PublicQuestion, QuizId } from "@/content/quizPublicSchema";
import { RankSchema } from "@/lib/ranks";

export const StartRequest = z.object({ regionId: QuizId }).strict();
export const AnswerRequest = z.object({ sessionId: z.uuid(), questionId: QuizId, optionId: QuizId }).strict();
export const ProgressInput = z.object({ regionId: QuizId, beatIds: z.array(QuizId).max(10) }).strict();
export const MigrationRequest = z.object({ sessionIds: z.array(z.uuid()).max(50), regions: z.array(ProgressInput).max(24) }).strict();
export const ProgressSummary = z.object({ xp: z.number().int().nonnegative(), rank: RankSchema, streakDays: z.number().int().nonnegative() });
export const Verdict = z.object({
  questionId: QuizId, chosenOptionId: QuizId, correct: z.boolean(), correctOptionId: QuizId,
  explanation: z.string(), feedback: z.string(),
  sources: z.array(z.object({ label: z.string(), url: z.string().url().optional() })),
});
export const QuizView = z.object({
  id: z.uuid(), regionId: QuizId, questions: z.array(PublicQuestion).length(5),
  answers: z.array(Verdict).max(5), finished: z.boolean(), score: z.number().int().min(0).max(5),
  xpAwarded: z.number().int().nonnegative(), potentialXP: z.number().int().nonnegative(),
  authenticated: z.boolean(), progress: ProgressSummary.nullable(),
});
export const LocalProgress = z.object({
  version: z.literal(1), sessionIds: z.array(z.uuid()).max(50),
  regions: z.array(ProgressInput).max(24),
}).strict();
export type QuizView = z.infer<typeof QuizView>;
export type Verdict = z.infer<typeof Verdict>;
export type ProgressInput = z.infer<typeof ProgressInput>;
export type LocalProgress = z.infer<typeof LocalProgress>;
export type ProgressSummary = z.infer<typeof ProgressSummary>;

export const ProfileRecord = z.object({
  progress: ProgressSummary,
  history: z.array(z.object({ id: z.uuid(), regionId: QuizId, score: z.number().int(), total: z.number().int(), xpAwarded: z.number().int(), finishedAt: z.string() })),
  regions: z.array(z.object({ regionId: QuizId, beatsViewed: z.array(QuizId), completed: z.boolean() })),
});
export type ProfileRecord = z.infer<typeof ProfileRecord>;
