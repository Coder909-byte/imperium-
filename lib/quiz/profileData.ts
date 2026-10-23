import { eq } from "drizzle-orm";
import { db } from "@/db";
import { regionProgress, profile } from "@/db/schema";
import { completedHistory, summary } from "./store";
import { ProfileRecord } from "./contracts";

export async function profileRecord(userId: string, row: typeof profile.$inferSelect): Promise<ProfileRecord> {
  const [history, regions] = await Promise.all([
    completedHistory(userId), db.select().from(regionProgress).where(eq(regionProgress.userId, userId)),
  ]);
  return ProfileRecord.parse({
    progress: summary(row),
    history: history.map(item => ({ ...item, finishedAt: item.finishedAt?.toISOString() ?? "" })),
    regions: regions.map(region => ({ regionId: region.regionId, beatsViewed: region.beatsViewed, completed: Boolean(region.completedAt) })),
  });
}
