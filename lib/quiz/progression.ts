import { z } from "zod";
import { RANKS, type Rank } from "@/lib/ranks";

// Owner-approved provisional policy. Gallia's 90 XP cannot unlock every rank.
export const PROGRESSION = {
  xpByDifficulty: { 1: 10, 2: 20, 3: 30 },
  rankThresholds: [0, 50, 150, 350, 700, 1200, 2000],
  timezone: "UTC",
  streakNotice: "Daily streak resets at 00:00 UTC",
} as const;

export function rankForXP(xp: number): Rank {
  z.number().int().nonnegative().parse(xp);
  let rank: Rank = RANKS[0];
  PROGRESSION.rankThresholds.forEach((threshold, index) => { if (xp >= threshold) rank = RANKS[index]; });
  return rank;
}

export function utcDay(date: Date): number { return Math.floor(date.getTime() / 86_400_000); }

export function advanceStreak(days: number, lastActive: Date | null, now: Date): number {
  if (!lastActive) return 1;
  const difference = utcDay(now) - utcDay(lastActive);
  if (difference <= 0) return days;
  return difference === 1 ? days + 1 : 1;
}

export function visibleStreak(days: number, lastActive: Date | null, now: Date): number {
  return !lastActive || utcDay(now) - utcDay(lastActive) > 1 ? 0 : days;
}

export const CreditCandidate = z.object({ questionId: z.string(), difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]) });
export function eligibleCredits(questions: z.infer<typeof CreditCandidate>[], alreadyCredited: ReadonlySet<string>) {
  const seen = new Set(alreadyCredited);
  return questions.flatMap(question => {
    if (seen.has(question.questionId)) return [];
    seen.add(question.questionId);
    return [{ questionId: question.questionId, xp: PROGRESSION.xpByDifficulty[question.difficulty] }];
  });
}
