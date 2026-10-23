import { config } from "dotenv";
import { question } from "../db/schema";
import { readQuestionBank } from "../lib/quiz/bank";

config({ path: ".env.local" });

// Explicit CLI write, never an implicit migration or a build-time side effect.
async function seedQuestions() {
  const { db, sql } = await import("../db");
  try {
    const bank = readQuestionBank();
    await db.transaction(async tx => {
      for (const item of bank) {
        const values = {
          id: item.id, regionId: item.regionId, era: item.era, difficulty: item.difficulty,
          prompt: item.prompt, options: item.options, correctOptionId: item.correctOptionId,
          explanation: item.explanation, rightQuip: item.feedbackByOptionId[item.correctOptionId],
          wrongQuips: Object.fromEntries(Object.entries(item.feedbackByOptionId).filter(([id]) => id !== item.correctOptionId)),
          sources: item.sources,
        };
        await tx.insert(question).values(values).onConflictDoUpdate({ target: question.id, set: values });
      }
    });
    console.log(`Seeded ${bank.length} validated questions.`);
  } finally { await sql.end({ timeout: 5 }); }
}

if (process.argv.includes("--write")) {
  void seedQuestions().catch(() => { console.error("Question seed failed. Check the database connection and apply the reviewed migrations before seeding."); process.exitCode = 1; });
}
