import { and, eq, inArray, isNotNull, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { profile, quizSession } from "@/db/schema";
import { MigrationRequest } from "./contracts";
import { lockProfile, readView, awardCompletion, summary } from "./store";
import { mergeRegion, validateViewedBeats } from "./regionProgress";
import { Question } from "@/content/questionSchema";
import { z } from "zod";

export async function migrateProgress(userId: string, guestHash: string | null, untrusted: unknown) {
  const input = MigrationRequest.parse(untrusted);
  input.regions.forEach(validateViewedBeats);
  return db.transaction(async tx => {
    await lockProfile(tx, userId);
    const ids = [...new Set(input.sessionIds)];
    const rows = ids.length ? await tx.select().from(quizSession).where(and(
      inArray(quizSession.id, ids), isNotNull(quizSession.finishedAt),
      guestHash ? or(eq(quizSession.userId, userId), and(isNull(quizSession.userId), eq(quizSession.guestHash, guestHash))) : eq(quizSession.userId, userId),
    )).orderBy(quizSession.id).for("update") : [];
    let xpAwarded = 0;
    const acceptedIds: string[] = [];
    for (const row of rows) {
      if (!z.array(Question).length(5).safeParse(row.questionSnapshot).success) continue;
      if (row.userId === userId) { acceptedIds.push(row.id); continue; }
      const view = await readView(tx, row);
      if (view.answers.length !== 5) continue;
      // Local scores/XP/dates are never inputs. Regrade server-owned answers;
      // a successful import is activity today, irrespective of attempt date.
      const credit = await awardCompletion(tx, userId, row.id, row.questionSnapshot, view.answers, new Date());
      xpAwarded += credit;
      await tx.update(quizSession).set({ userId, guestHash: null, xpAwarded: credit }).where(eq(quizSession.id, row.id));
      acceptedIds.push(row.id);
    }
    for (const region of input.regions) await mergeRegion(tx, userId, region);
    const [updated] = await tx.select().from(profile).where(eq(profile.userId, userId));
    return { acceptedIds, ignoredCount: ids.length - acceptedIds.length, xpAwarded, progress: summary(updated) };
  });
}
