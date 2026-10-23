import { ProgressInput } from "@/lib/quiz/contracts";
import { saveRegion, validateViewedBeats } from "@/lib/quiz/regionProgress";
import { quizRoute, requestJSON, quizContext, jsonResponse } from "@/lib/quiz/http";

export async function POST(request: Request) {
  return quizRoute(async () => {
    const input = ProgressInput.parse(await requestJSON(request));
    validateViewedBeats(input);
    const { owner } = await quizContext(request);
    if (owner.userId) await saveRegion(owner.userId, input);
    return jsonResponse({ saved: Boolean(owner.userId) });
  });
}
