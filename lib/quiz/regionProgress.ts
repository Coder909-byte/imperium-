import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { regionProgress } from "@/db/schema";
import { loadRegionContent } from "@/app/scene/[regionId]/loadContent";
import { QuizError } from "./grading";
import { lockProfile, type QuizTransaction } from "./store";
import type { ProgressInput } from "./contracts";

export function validateViewedBeats(input: ProgressInput): string[] {
  const region = loadRegionContent(input.regionId);
  if (!region || input.beatIds.some(id => !region.beats.some(beat => beat.id === id))) throw new QuizError(400, "The saved beat IDs do not match this region. Reopen the scene.");
  return region.beats.map(beat => beat.id);
}

export async function mergeRegion(tx: QuizTransaction, userId: string, input: ProgressInput) {
  const canonical = validateViewedBeats(input);
  const [previous] = await tx.select().from(regionProgress).where(and(eq(regionProgress.userId, userId), eq(regionProgress.regionId, input.regionId)));
  const viewed = new Set([...(previous?.beatsViewed ?? []), ...input.beatIds]);
  const beatsViewed = canonical.filter(id => viewed.has(id));
  const now = new Date();
  const completedAt = previous?.completedAt ?? (beatsViewed.length === canonical.length ? now : null);
  await tx.insert(regionProgress).values({ userId, regionId: input.regionId, beatsViewed, completedAt, lastViewedAt: now })
    .onConflictDoUpdate({ target: [regionProgress.userId, regionProgress.regionId], set: { beatsViewed, completedAt, lastViewedAt: now } });
}

export async function saveRegion(userId: string, input: ProgressInput) {
  validateViewedBeats(input);
  await db.transaction(async tx => {
    await lockProfile(tx, userId);
    await mergeRegion(tx, userId, input);
  });
}
