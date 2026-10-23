import { migrateProgress } from "@/lib/quiz/migration";
import { quizRoute, requestJSON, quizContext, jsonResponse } from "@/lib/quiz/http";
import { QuizError } from "@/lib/quiz/grading";

export async function POST(request: Request) {
  return quizRoute(async () => {
    const input = await requestJSON(request);
    const { owner } = await quizContext(request);
    if (!owner.userId) throw new QuizError(401, "Log in before importing saved progress.");
    return jsonResponse(await migrateProgress(owner.userId, owner.guestHash, input));
  });
}
